/* Deterministic, synthetic study exercises. No network calls or system changes. */
'use strict';
(function (root) {
  const MAX_IP = 2 ** 32 - 1;
  const parseIPv4 = value => {
    if (typeof value !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) throw new Error('Enter four IPv4 octets, for example 10.44.0.10.');
    const parts = value.split('.');
    if (parts.some(part => Number(part) > 255 || String(Number(part)) !== part)) throw new Error('IPv4 octets must be 0–255, without leading zeros.');
    return parts.reduce((number, part) => number * 256 + Number(part), 0);
  };
  const formatIPv4 = value => {
    if (!Number.isInteger(value) || value < 0 || value > MAX_IP) throw new Error('IPv4 value is out of range.');
    return [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.');
  };
  const subnetInfo = cidr => {
    if (typeof cidr !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}\/(0|[1-9]\d?)$/.test(cidr)) throw new Error('Use IPv4/prefix notation, such as 10.44.0.70/26.');
    const [address, prefixText] = cidr.split('/');
    const prefix = Number(prefixText);
    if (prefix > 32) throw new Error('An IPv4 prefix must be between 0 and 32.');
    const numeric = parseIPv4(address);
    const size = 2 ** (32 - prefix);
    const networkNumber = Math.floor(numeric / size) * size;
    const broadcastNumber = networkNumber + size - 1;
    const pointToPoint = prefix === 31;
    const hostRoute = prefix === 32;
    const firstNumber = prefix >= 31 ? networkNumber : networkNumber + 1;
    const lastNumber = prefix >= 31 ? broadcastNumber : broadcastNumber - 1;
    return {
      address, prefix, numeric, networkNumber, broadcastNumber, size,
      network: formatIPv4(networkNumber), broadcast: formatIPv4(broadcastNumber),
      mask: formatIPv4(MAX_IP - size + 1),
      first: formatIPv4(firstNumber), last: formatIPv4(lastNumber),
      usable: prefix >= 31 ? size : size - 2,
      binary: address.split('.').map(part => Number(part).toString(2).padStart(8, '0')).join('.'),
      meaning: hostRoute ? '/32 identifies one host; it is not a multi-host LAN.' : pointToPoint ? '/31 has two endpoint addresses on a supported point-to-point link; it does not use a conventional network/broadcast reservation.' : 'For a conventional IPv4 LAN, reserve the network and broadcast addresses.'
    };
  };
  const inSubnet = (address, cidr) => {
    const value = parseIPv4(address);
    const subnet = subnetInfo(cidr);
    return value >= subnet.networkNumber && value <= subnet.broadcastNumber;
  };
  const allocateVLSM = (baseCIDR, hostCounts) => {
    const base = subnetInfo(baseCIDR);
    if (base.numeric !== base.networkNumber) throw new Error('The VLSM base must begin at its network boundary.');
    if (!Array.isArray(hostCounts) || !hostCounts.length || hostCounts.length > 100) throw new Error('Provide between one and 100 host requirements.');
    if (hostCounts.some(count => !Number.isSafeInteger(count) || count < 1 || count > MAX_IP - 1)) throw new Error('Host requirements must be positive whole numbers within IPv4 capacity.');
    const requests = hostCounts.map((hosts, index) => ({ hosts, request: index + 1, bits: Math.max(2, Math.ceil(Math.log2(hosts + 2))) })).sort((a, b) => b.bits - a.bits || a.request - b.request);
    let cursor = base.networkNumber;
    const allocations = [];
    for (const request of requests) {
      const size = 2 ** request.bits;
      const network = Math.ceil(cursor / size) * size;
      if (network + size - 1 > base.broadcastNumber) throw new Error('These host requirements do not fit in the base network. No allocation was made.');
      const info = subnetInfo(`${formatIPv4(network)}/${32 - request.bits}`);
      allocations.push({ request: request.request, requested_hosts: request.hosts, cidr: `${info.network}/${info.prefix}`, first: info.first, last: info.last, broadcast: info.broadcast, usable: info.usable });
      cursor = network + size;
    }
    return { base: `${base.network}/${base.prefix}`, allocations, remaining_addresses: base.broadcastNumber - cursor + 1, note: 'Largest subnets are allocated first. This LAN exercise reserves network/broadcast addresses and does not allocate /31 or /32.' };
  };
  const longestPrefixMatch = (address, routes) => {
    parseIPv4(address);
    if (!Array.isArray(routes)) throw new Error('Routes must be an array.');
    let result = null;
    for (const route of routes) {
      if (!route || typeof route !== 'object') throw new Error('Each route must be an object.');
      const cidr = route.cidr || route.network;
      const subnet = subnetInfo(cidr);
      if (inSubnet(address, cidr) && (!result || subnet.prefix > subnetInfo(result.cidr || result.network).prefix)) result = route;
    }
    return result ? { ...result } : null;
  };
  const ENDPOINTS = Object.freeze({
    user: { name: 'User PC', ip: '10.44.0.10', cidr: '10.44.0.0/26', vlan: 10, switch: 'SW1', gateway: '10.44.0.1' },
    peer: { name: 'Second user PC', ip: '10.44.0.20', cidr: '10.44.0.0/26', vlan: 10, switch: 'SW1', gateway: '10.44.0.1' },
    server: { name: 'Server', ip: '10.44.0.70', cidr: '10.44.0.64/26', vlan: 20, switch: 'SW2', gateway: '10.44.0.65' },
    admin: { name: 'Admin PC', ip: '10.44.0.164', cidr: '10.44.0.160/28', vlan: 99, switch: 'SW2', gateway: '10.44.0.161' },
    branch: { name: 'Remote branch PC', ip: '10.44.0.194', cidr: '10.44.0.192/27', vlan: null, switch: null, gateway: '10.44.0.193' }
  });
  const R1_ROUTES = [
    { cidr: '10.44.0.0/26', interface: 'G0/0.10', next_hop: 'directly connected' },
    { cidr: '10.44.0.64/26', interface: 'G0/0.20', next_hop: 'directly connected' },
    { cidr: '10.44.0.160/28', interface: 'G0/0.99', next_hop: 'directly connected' },
    { cidr: '10.44.0.192/27', interface: 'G0/1', next_hop: '10.44.0.178' }
  ];
  const tracePacket = (options = {}) => {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('A path exercise needs an options object.');
    for (const name of ['missingTrunk', 'missingVLAN', 'routeBroken', 'returnRouteBroken', 'serviceDown']) {
      if (options[name] !== undefined && typeof options[name] !== 'boolean') throw new Error(`${name} must be an actual Boolean value.`);
    }
    const sourceKey = options.source === undefined ? 'user' : options.source;
    const destinationKey = options.destination === undefined ? 'server' : options.destination;
    const owns = key => typeof key === 'string' && Object.prototype.hasOwnProperty.call(ENDPOINTS, key);
    if (!owns(sourceKey) || !owns(destinationKey)) throw new Error('Choose an endpoint from the training topology.');
    const source = ENDPOINTS[sourceKey];
    const destination = ENDPOINTS[destinationKey];
    const protocol = options.protocol || 'tcp';
    if (!['tcp', 'icmp'].includes(protocol)) throw new Error('This bounded path exercise supports TCP and ICMP.');
    const steps = [];
    const step = (layer, title, detail) => steps.push({ layer, title, detail });
    const stop = reason => ({ status: 'blocked', reason, steps, route: null });
    step('Host', 'Compare subnets', `${source.name} ${source.ip} compares ${destination.ip} with ${source.cidr}.`);
    if (source === destination) {
      step('Host', 'Local address', 'This destination is the same host; no switch or routed path is required in this model.');
    } else if (source.cidr === destination.cidr) {
      step('Layer 2', 'Same VLAN, local switching', `ARP resolves the peer address, then ${source.switch} forwards within VLAN ${source.vlan}. R1 and the inter-switch trunk are not in this path.`);
    } else {
      step('Layer 2', 'Use the gateway', `${destination.ip} is remote to the source subnet. The host resolves gateway ${source.gateway}, not the remote host's MAC address.`);
      const requiresTrunk = source.switch === 'SW2' || destination.switch === 'SW2';
      if (requiresTrunk && options.missingTrunk) {
        step('Layer 2', 'Inter-switch link unavailable', 'SW2 needs Port-channel1 to reach R1 through SW1.');
        return stop('The required inter-switch trunk is down.');
      }
      if (requiresTrunk && options.missingVLAN && (source.vlan === 20 || destination.vlan === 20)) {
        step('Layer 2', 'VLAN 20 missing', 'Port-channel1 does not carry the server VLAN. A route cannot repair a missing Layer 2 path.');
        return stop('VLAN 20 is missing from the trunk allowed list.');
      }
      if (requiresTrunk) step('Layer 2', '802.1Q trunk', 'SW2 traffic uses the tagged VLAN across Port-channel1; SW1 reaches R1 over its router trunk.');
      const crossesBranch = source === ENDPOINTS.branch || destination === ENDPOINTS.branch;
      if (crossesBranch && options.routeBroken) {
        step('Layer 3', 'No matching route', 'The necessary route between the branch and the campus subnet has been removed.');
        return stop('No forward route exists for this destination.');
      }
      const route = longestPrefixMatch(destination.ip, R1_ROUTES);
      step('Layer 3', 'Longest-prefix lookup', source === ENDPOINTS.branch ? `R2 sends campus traffic to R1 at 10.44.0.177; R1 uses ${route.cidr} on ${route.interface}.` : `R1 selects ${route.cidr} on ${route.interface}; next hop ${route.next_hop}.`);
      if (crossesBranch) step('Layer 3', 'Transit between routers', 'The packet crosses 10.44.0.176/30. R1 is .177; R2 is .178. The branch gateway is .193.');
      if (crossesBranch && options.returnRouteBroken) {
        step('Layer 3', 'Return path missing', 'The request can reach its destination, but the reply has no route back to the source subnet.');
        return stop('A one-way route is insufficient: the reply cannot return.');
      }
      step('Layer 3', 'Return path checked', 'The destination uses its own subnet or gateway; the reverse route reaches the source.');
    }
    if (protocol === 'tcp' && options.serviceDown) {
      step('Application', 'No application listener', 'Layer 2 and routing work, but the destination has no listening service. This is distinct from a missing route.');
      return stop('The network path works, but the TCP service is unavailable.');
    }
    step(protocol === 'tcp' ? 'Application' : 'Network test', protocol === 'tcp' ? 'Application response' : 'ICMP echo reply', protocol === 'tcp' ? 'The synthetic listener responds. A separate firewall exercise tests whether traffic policy permits the flow.' : 'Echo and reply work in this model. Ping does not establish TCP service health.');
    return { status: 'reachable', reason: 'The selected synthetic request and return path succeed.', steps, route: source.cidr === destination.cidr ? null : longestPrefixMatch(destination.ip, R1_ROUTES) };
  };
  const portValue = (value, allowAny = false) => {
    if (allowAny && value === '*') return '*';
    if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error('Ports must be whole numbers from 1 to 65535.');
    return value;
  };
  const normalizeRules = rules => {
    if (!Array.isArray(rules) || rules.length > 100) throw new Error('Use an array of at most 100 firewall rules.');
    return rules.map((rule, index) => {
      if (!rule || typeof rule !== 'object' || !['allow', 'deny'].includes(rule.action)) throw new Error(`Rule ${index + 1}: choose allow or deny.`);
      for (const field of ['source', 'destination']) if (rule[field] !== '*') subnetInfo(rule[field]);
      if (!['tcp', 'udp', 'icmp', '*'].includes(rule.protocol)) throw new Error(`Rule ${index + 1}: unsupported protocol.`);
      const port = portValue(rule.port, true);
      if ((rule.protocol === 'icmp' || rule.protocol === '*') && port !== '*') throw new Error(`Rule ${index + 1}: use any port for ICMP or any protocol.`);
      return { action: rule.action, source: rule.source, destination: rule.destination, protocol: rule.protocol, port };
    });
  };
  const normalizePacket = packet => {
    if (!packet || typeof packet !== 'object') throw new Error('A packet description is required.');
    parseIPv4(packet.source); parseIPv4(packet.destination);
    if (!['tcp', 'udp', 'icmp'].includes(packet.protocol)) throw new Error('Choose TCP, UDP or ICMP.');
    const state = packet.state === undefined ? 'new' : packet.state;
    if (!['new', 'established'].includes(state)) throw new Error('Choose new or established state.');
    if (packet.protocol === 'icmp' && state === 'established') throw new Error('This bounded state-table exercise tracks TCP/UDP tuples; test ICMP as a new packet using the rules.');
    return { source: packet.source, destination: packet.destination, protocol: packet.protocol, port: packet.protocol === 'icmp' ? null : portValue(packet.port), source_port: packet.protocol === 'icmp' ? null : portValue(packet.source_port), state };
  };
  const evaluateFirewall = (rules, packet, connections = []) => {
    const normalized = normalizeRules(rules);
    const flow = normalizePacket(packet);
    if (!Array.isArray(connections) || connections.length > 1000) throw new Error('Connection records must be an array of at most 1,000 entries.');
    if (flow.state === 'established') {
      const trusted = connections.map(connection => {
        if (!connection || typeof connection !== 'object' || Array.isArray(connection)) throw new Error('Each connection record must be a packet tuple.');
        return normalizePacket({ ...connection, state: 'new' });
      });
      const tracked = trusted.some(known => {
        return known.protocol === flow.protocol && ((known.source === flow.source && known.destination === flow.destination && known.source_port === flow.source_port && known.port === flow.port) || (known.source === flow.destination && known.destination === flow.source && known.source_port === flow.port && known.port === flow.source_port));
      });
      return tracked ? { decision: 'allow', rule: 'connection-state', reason: 'A matching connection record permits this established flow, including its exact reverse tuple.' } : { decision: 'deny', rule: 'untracked-state', reason: 'Claiming established state does not create a connection record. No matching tracked flow exists.' };
    }
    for (let index = 0; index < normalized.length; index += 1) {
      const rule = normalized[index];
      if ((rule.source === '*' || inSubnet(flow.source, rule.source)) && (rule.destination === '*' || inSubnet(flow.destination, rule.destination)) && (rule.protocol === '*' || rule.protocol === flow.protocol) && (rule.port === '*' || rule.port === flow.port)) return { decision: rule.action, rule: index + 1, reason: `Rule ${index + 1} is the first matching rule. Later rules are not evaluated.` };
    }
    return { decision: 'deny', rule: 'default', reason: 'No rule matched. The default policy denies the new flow.' };
  };
  const aiDecision = ({ authenticated, approved, score, threshold = 0.8 } = {}) => {
    if (typeof authenticated !== 'boolean' || typeof approved !== 'boolean') throw new Error('Identity and approval must be actual Boolean values, not strings.');
    if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('The threshold must be a finite number from 0 to 1.');
    if (score !== null && (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1)) throw new Error('The synthetic score must be 0–1 or unknown.');
    if (!authenticated || !approved) return { decision: 'deny', reason: 'Both trusted identity and approval are required; a low model score cannot override this rule.' };
    if (score === null) return { decision: 'review', reason: 'The score is unavailable. The protected action stays paused.' };
    if (score >= threshold) return { decision: 'review', reason: 'The score meets the review threshold. The protected action stays paused.' };
    return { decision: 'allow', reason: 'The Boolean conditions and synthetic threshold policy passed. This is not a truth or safety guarantee.' };
  };
  const confusionMetrics = ({ tp, fp, fn, tn } = {}) => {
    const values = [tp, fp, fn, tn];
    if (values.some(value => !Number.isSafeInteger(value) || value < 0) || !Number.isSafeInteger(values.reduce((a, b) => a + b, 0))) throw new Error('Use nonnegative whole counts with a safe total.');
    const ratio = (a, b) => b ? a / b : null;
    return { precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn), false_positive_rate: ratio(fp, fp + tn), accuracy: ratio(tp + tn, tp + fp + fn + tn) };
  };
  const truthTable = () => [false, true].flatMap(a => [false, true].map(b => ({ a, b, and: a && b, or: a || b, not_a: !a })));

  const mount = element => {
    if (!element || !element.ownerDocument) throw new Error('A DOM container is required.');
    if (element.dataset.toolsMounted) return;
    element.dataset.toolsMounted = 'true';
    element.classList.add('practice-tools');
    const doc = element.ownerDocument;
    let count = 0;
    const make = (tag, text, className) => {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const field = (parent, label, value, type = 'text') => {
      const wrap = make('label'); const input = make('input');
      input.id = `practice-field-${++count}`; input.type = type; input.value = value;
      wrap.append(make('span', label), input); parent.append(wrap); return input;
    };
    const choice = (parent, label, options, value) => {
      const wrap = make('label'); const select = make('select');
      options.forEach(([key, text]) => { const option = make('option', text); option.value = key; select.append(option); });
      select.value = value; wrap.append(make('span', label), select); parent.append(wrap); return select;
    };
    const checkbox = (parent, label, checked = false) => {
      const wrap = make('label', undefined, 'tool-check'); const input = make('input'); input.type = 'checkbox'; input.checked = checked;
      wrap.append(input, make('span', label)); parent.append(wrap); return input;
    };
    const button = (parent, text, action) => {
      const node = make('button', text); node.type = 'button';node.addEventListener('click', action);parent.append(node);return node;
    };
    const output = parent => { const node = make('div', undefined, 'tool-output');node.setAttribute('role', 'status');node.setAttribute('aria-live', 'polite');parent.append(node);return node; };
    const table = (headers, rows) => {
      const wrap = make('div', undefined, 'tool-table'); wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Results table; scroll horizontally to see additional columns'); const result = make('table');const head = make('thead');const tr = make('tr');
      headers.forEach(title => {const th=make('th', title);th.scope='col';tr.append(th);});head.append(tr);result.append(head);
      const body=make('tbody');rows.forEach(row=>{const line=make('tr');row.forEach(value=>line.append(make('td',String(value))));body.append(line);});result.append(body);wrap.append(result);return wrap;
    };
    const run = (target, action) => { try {target.replaceChildren();target.classList.remove('tool-error');action();}catch(error){target.classList.add('tool-error');target.textContent=error.message;} };
    element.append(make('p','Choose a tool, predict the outcome, then change one input and compare. These synthetic exercises make no network connections or infrastructure changes.','tool-limits'));
    const toolNav = make('div', undefined, 'tool-nav');
    toolNav.setAttribute('role', 'group'); toolNav.setAttribute('aria-label', 'Choose a practice tool');
    element.append(toolNav);
    const toolNames = [
      ['subnet', 'Practice subnetting', 'Calculate addresses and capacity'],
      ['path', 'Explore packet paths', 'Find where a request stops'],
      ['firewall', 'Test firewall rules', 'See which policy wins'],
      ['ai', 'Explore AI decisions', 'Compare logic and model signals'],
    ];
    let panelIndex = 0;
    const panel = (title, description) => {
      const index = panelIndex++;
      const [key, label, hint] = toolNames[index];
      const details=make('details',undefined,'tool-panel');
      details.id = `practice-tool-${key}`; details.dataset.tool = key;
      details.hidden = index !== 0; details.open = index === 0;
      details.append(make('summary',title));
      const select = button(toolNav, '', () => {
        element.querySelectorAll('.tool-panel').forEach(node => { node.hidden = node !== details; if (node === details) node.open = true; });
        toolNav.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === select)));
      });
      select.dataset.tool = key;
      select.append(make('strong', label), make('span', hint));
      select.setAttribute('aria-controls', details.id);
      select.setAttribute('aria-pressed', String(index === 0));
      const body=make('div',undefined,'tool-body');body.append(make('p',description));details.append(body);element.append(details);return body;
    };
    const subnetPanel=panel('1 · Subnetting and VLSM trainer','Predict the answer, then calculate and compare. /31 and /32 have specific uses; the VLSM exercise allocates conventional LAN subnets.',true);
    const subnetFields=make('div',undefined,'tool-fields');subnetPanel.append(subnetFields);
    const cidr=field(subnetFields,'IPv4 address/prefix','10.44.0.70/26');cidr.id='subnetCidr';
    const subnetResult=output(subnetPanel);
    const showSubnet=()=>run(subnetResult,()=>{
      const info=subnetInfo(cidr.value.trim());
      subnetResult.append(make('p',`${info.address}/${info.prefix} → network ${info.network}/${info.prefix}`,'tool-result-title'),table(['Mask','Broadcast / last address','Usable range','Host addresses'],[[info.mask,info.broadcast,`${info.first} – ${info.last}`,info.usable]]),make('p',`Address bits: ${info.binary.split('.').join(' · ')}`,'tool-code'),make('p',`32 − ${info.prefix} = ${32-info.prefix} address bits; 2^${32-info.prefix} = ${info.size} total addresses. ${info.meaning}`));
    });
    button(subnetFields,'Calculate subnet',showSubnet).id='subnetCalculate';showSubnet();
    const vlsmFields=make('div',undefined,'tool-fields');subnetPanel.append(make('h4','Plan several LANs'),vlsmFields);
    const base=field(vlsmFields,'Base network','10.44.0.0/24');const hosts=field(vlsmFields,'Required hosts, separated by commas','50,50,25,10');
    const vlsmResult=output(subnetPanel);
    button(vlsmFields,'Allocate VLSM',()=>run(vlsmResult,()=>{
      const tokens=hosts.value.split(',').map(value=>value.trim());
      if(tokens.some(value=>!/^\d+$/.test(value)))throw new Error('Use comma-separated positive whole host requirements.');
      const plan=allocateVLSM(base.value.trim(),tokens.map(Number));
      vlsmResult.append(table(['Request','Hosts needed','Allocated network','Usable range','Capacity'],plan.allocations.map(item=>[item.request,item.requested_hosts,item.cidr,`${item.first} – ${item.last}`,item.usable])),make('p',`${plan.remaining_addresses} addresses remain unallocated. ${plan.note}`));
    }));
    const pathPanel=panel('2 · Packet-path explorer','Fixed training topology: SW1/SW2, R1 router-on-stick and an R2 branch. This traces selected dependencies; it is not a complete packet emulator.');
    const pathFields=make('div',undefined,'tool-fields');pathPanel.append(pathFields);
    const endpoints=Object.entries(ENDPOINTS).map(([key,item])=>[key,`${item.name} · ${item.ip}`]);
    const from=choice(pathFields,'Source endpoint',endpoints,'user');const to=choice(pathFields,'Destination endpoint',endpoints,'server');
    const protocol=choice(pathFields,'Request type',[['tcp','TCP application request'],['icmp','ICMP echo']],'tcp');
    const failures=make('div',undefined,'tool-checks');pathPanel.append(failures);
    const vlan=checkbox(failures,'Remove VLAN 20 from the inter-switch trunk');const trunk=checkbox(failures,'Disable inter-switch Port-channel1');
    const route=checkbox(failures,'Remove the required branch route');const reverseRoute=checkbox(failures,'Remove the branch return route');const service=checkbox(failures,'Stop the destination TCP service');
    const pathResult=output(pathPanel);
    button(pathFields,'Trace packet path',()=>run(pathResult,()=>{
      const result=tracePacket({source:from.value,destination:to.value,protocol:protocol.value,missingVLAN:vlan.checked,missingTrunk:trunk.checked,routeBroken:route.checked,returnRouteBroken:reverseRoute.checked,serviceDown:service.checked});
      pathResult.append(make('p',`${result.status==='reachable'?'Request succeeds':'Request fails'}: ${result.reason}`,'tool-result-title'));
      const list=make('ol');result.steps.forEach(item=>{const li=make('li');li.append(make('strong',`${item.layer} · ${item.title}. `),doc.createTextNode(item.detail));list.append(li);});pathResult.append(list,make('p','Compare a user-to-user request with a routed request. A missing trunk does not break local switching within SW1’s VLAN 10. Firewall policy is tested separately below.'));
    }));
    const fwPanel=panel('3 · Ordered firewall policy tester','Change the policy, then test both allowed and denied traffic. New flows use first-match ordering and default deny. The separate connection table models established return traffic.');
    const rules=[{action:'allow',source:'10.44.0.0/26',destination:'10.44.0.64/26',protocol:'tcp',port:443},{action:'deny',source:'10.44.0.0/26',destination:'10.44.0.64/26',protocol:'*',port:'*'}];
    const ruleList=make('div',undefined,'tool-rule-list');fwPanel.append(ruleList);let ruleError=output(fwPanel);
    const renderRules=()=>{
      ruleList.replaceChildren();rules.forEach((rule,index)=>{
        const row=make('div',undefined,'tool-rule');const name=make('strong',`Rule ${index+1}`);row.append(name);
        const action=choice(row,'Action',[['allow','Allow'],['deny','Deny']],rule.action);action.addEventListener('change',()=>{rule.action=action.value;});
        const source=field(row,'Source CIDR or *',rule.source);source.addEventListener('input',()=>{rule.source=source.value.trim();});
        const destination=field(row,'Destination CIDR or *',rule.destination);destination.addEventListener('input',()=>{rule.destination=destination.value.trim();});
        const proto=choice(row,'Protocol',[['tcp','TCP'],['udp','UDP'],['icmp','ICMP'],['*','Any']],rule.protocol);proto.addEventListener('change',()=>{rule.protocol=proto.value;if(['icmp','*'].includes(proto.value)){rule.port='*';renderRules();}});
        const port=field(row,'Destination port or *',String(rule.port));port.addEventListener('input',()=>{rule.port=port.value.trim()==='*'?'*':(/^\d+$/.test(port.value.trim())?Number(port.value):NaN);});
        const actions=make('div',undefined,'tool-rule-actions');row.append(actions);
        const up=button(actions,`Move rule ${index+1} up`,()=>{[rules[index-1],rules[index]]=[rules[index],rules[index-1]];renderRules();});up.disabled=index===0;
        const down=button(actions,`Move rule ${index+1} down`,()=>{[rules[index+1],rules[index]]=[rules[index],rules[index+1]];renderRules();});down.disabled=index===rules.length-1;
        button(actions,`Remove rule ${index+1}`,()=>{rules.splice(index,1);renderRules();});ruleList.append(row);
      });
    };renderRules();
    button(fwPanel,'Add firewall rule',()=>{if(rules.length>=100){ruleError.textContent='The teaching tool supports at most 100 rules.';return;}rules.push({action:'deny',source:'*',destination:'*',protocol:'*',port:'*'});renderRules();});
    const packetFields=make('div',undefined,'tool-fields');fwPanel.append(make('h4','Test a packet'),packetFields);
    const packetSource=field(packetFields,'Packet source IP','10.44.0.10');const packetDestination=field(packetFields,'Packet destination IP','10.44.0.70');
    const packetProtocol=choice(packetFields,'Packet protocol',[['tcp','TCP'],['udp','UDP'],['icmp','ICMP']],'tcp');
    const sourcePort=field(packetFields,'Source port','51000','number');const destinationPort=field(packetFields,'Destination port','443','number');
    const flowState=choice(packetFields,'Flow state',[['new','New connection'],['established','Established: require table match']],'new');
    const tracked=checkbox(fwPanel,'Include a trusted connection record: 10.44.0.10:51000 → 10.44.0.70:443 TCP');
    const fwResult=output(fwPanel);
    const testPacket=()=>run(fwResult,()=>{
      normalizeRules(rules);ruleError.replaceChildren();
      const result=evaluateFirewall(rules,{source:packetSource.value.trim(),destination:packetDestination.value.trim(),protocol:packetProtocol.value,source_port:Number(sourcePort.value),port:Number(destinationPort.value),state:flowState.value},tracked.checked?[{source:'10.44.0.10',destination:'10.44.0.70',protocol:'tcp',source_port:51000,port:443}]:[]);
      fwResult.append(make('p',`${result.decision.toUpperCase()} · ${result.rule==='connection-state'?'Connection state':`Rule ${result.rule}`}`,'tool-result-title'),make('p',result.reason),make('p','This model places the TCP/UDP state check before new-flow rules. The checkbox supplies a synthetic trusted table record; a packet cannot grant itself established status. ICMP is tested with rules, without modelling echo identifiers or related errors.'));
    });
    button(packetFields,'Test firewall decision',testPacket);
    button(packetFields,'Load reverse reply',()=>{packetSource.value='10.44.0.70';packetDestination.value='10.44.0.10';sourcePort.value='443';destinationPort.value='51000';packetProtocol.value='tcp';flowState.value='established';});
    testPacket();
    const aiPanel=panel('4 · Boolean logic and AI risk explorer','Logical truth values describe predicates. Model scores are signals requiring evaluation, not proofs that a statement is true. No trained model is running here.');
    aiPanel.append(table(['A','B','A AND B','A OR B','NOT A'],truthTable().map(row=>[row.a,row.b,row.and,row.or,row.not_a])));
    const aiFields=make('div',undefined,'tool-fields');aiPanel.append(aiFields);
    const identity=checkbox(aiFields,'Trusted identity check succeeded',true);const approved=checkbox(aiFields,'Action is authorised',true);
    const score=field(aiFields,'Synthetic risk score (0–1)','0.10','number');score.min='0';score.max='1';score.step='0.01';
    const threshold=field(aiFields,'Review threshold (0–1)','0.80','number');threshold.min='0';threshold.max='1';threshold.step='0.01';
    const unknown=checkbox(aiPanel,'Score unavailable: pause for review');const aiResult=output(aiPanel);
    const numericInput=input=>{if(input.value.trim()==='')throw new Error('Enter a number; an empty field is not zero.');return Number(input.value);};
    button(aiFields,'Evaluate synthetic AI policy',()=>run(aiResult,()=>{
      const result=aiDecision({authenticated:identity.checked,approved:approved.checked,score:unknown.checked?null:numericInput(score),threshold:numericInput(threshold)});
      aiResult.append(make('p',result.decision.toUpperCase(),'tool-result-title'),make('p',result.reason),make('p','Actual identity and approval must come from trusted checks. A user-entered checkbox or a model-generated “true” is not authorisation.'));
    }));
    const metricFields=make('div',undefined,'tool-fields');aiPanel.append(make('h4','Evaluate a labelled synthetic set'),metricFields);
    const counts={};for(const[key,label,value]of[['tp','True positives',80],['fp','False positives',45],['fn','False negatives',20],['tn','True negatives',855]]){counts[key]=field(metricFields,label,String(value),'number');counts[key].min='0';counts[key].step='1';}
    const metricResult=output(aiPanel);
    const showMetrics=()=>run(metricResult,()=>{
      const metrics=confusionMetrics(Object.fromEntries(Object.entries(counts).map(([key,input])=>[key,numericInput(input)])));
      metricResult.append(table(['Precision','Recall','False-positive rate','Accuracy'],[[metrics.precision,metrics.recall,metrics.false_positive_rate,metrics.accuracy].map(value=>value===null?'Undefined (zero denominator)':`${(value*100).toFixed(1)}%`)]),make('p','These metrics describe the supplied labels and predictions at one threshold. Changing the class balance can change precision; high accuracy alone can hide missed attacks.'));
    });button(metricFields,'Calculate classification metrics',showMetrics);showMetrics();
  };
  const API={parseIPv4,formatIPv4,subnetInfo,inSubnet,allocateVLSM,longestPrefixMatch,tracePacket,normalizeRules,evaluateFirewall,aiDecision,confusionMetrics,truthTable,mount,ENDPOINTS};
  root.StudyTools=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
