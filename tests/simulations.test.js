'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const tools = require('../docs/assets/simulations.js');

const packet = changes => ({ source: '10.44.0.10', destination: '10.44.0.70', protocol: 'tcp', source_port: 51000, port: 443, state: 'new', ...changes });
const rules = [
  { action: 'allow', source: '10.44.0.0/26', destination: '10.44.0.64/26', protocol: 'tcp', port: 443 },
  { action: 'deny', source: '10.44.0.0/26', destination: '10.44.0.64/26', protocol: '*', port: '*' },
];
const reverse = changes => packet({ source: '10.44.0.70', destination: '10.44.0.10', source_port: 443, port: 51000, state: 'established', ...changes });

test('IPv4 parsing covers the full unsigned range and rejects ambiguous octets', () => {
  assert.equal(tools.parseIPv4('0.0.0.0'), 0);
  assert.equal(tools.parseIPv4('255.255.255.255'), 4294967295);
  assert.equal(tools.formatIPv4(4294967295), '255.255.255.255');
  assert.equal(tools.formatIPv4(tools.parseIPv4('10.44.0.70')), '10.44.0.70');
  for (const bad of ['10.0.0', '256.0.0.1', '010.0.0.1', '1.2.3.-1', '1.2.3.4 ', '0x10.0.0.1', null, 0]) assert.throws(() => tools.parseIPv4(bad));
  for (const bad of [-1, 2 ** 32, NaN, 1.5, '1']) assert.throws(() => tools.formatIPv4(bad));
});

test('subnet calculation explains /26 boundaries, binary and capacity', () => {
  const value = tools.subnetInfo('10.44.0.70/26');
  assert.equal(value.network, '10.44.0.64');
  assert.equal(value.broadcast, '10.44.0.127');
  assert.equal(value.mask, '255.255.255.192');
  assert.equal(value.first, '10.44.0.65');
  assert.equal(value.last, '10.44.0.126');
  assert.equal(value.usable, 62);
  assert.equal(value.binary, '00001010.00101100.00000000.01000110');
});

test('/0 does not overflow signed arithmetic', () => {
  const value = tools.subnetInfo('203.0.113.9/0');
  assert.equal(value.network, '0.0.0.0');
  assert.equal(value.broadcast, '255.255.255.255');
  assert.equal(value.mask, '0.0.0.0');
  assert.equal(value.size, 4294967296);
  assert.equal(value.usable, 4294967294);
});

test('/31 and /32 teach endpoint and host-route semantics', () => {
  const pair = tools.subnetInfo('192.0.2.11/31');
  assert.equal(pair.first, '192.0.2.10');
  assert.equal(pair.last, '192.0.2.11');
  assert.equal(pair.usable, 2);
  assert.match(pair.meaning, /point-to-point/);
  const host = tools.subnetInfo('192.0.2.11/32');
  assert.equal(host.network, '192.0.2.11');
  assert.equal(host.first, host.last);
  assert.equal(host.usable, 1);
  assert.match(host.meaning, /one host/);
});

test('CIDR validation rejects malformed, noninteger and oversized prefixes', () => {
  for (const bad of ['10.0.0.1', '10.0.0.1/33', '10.0.0.1/-1', '10.0.0.1/24.5', '10.0.0.1/024', '300.0.0.1/24', null]) assert.throws(() => tools.subnetInfo(bad));
  assert.equal(tools.inSubnet('10.44.0.127', '10.44.0.64/26'), true);
  assert.equal(tools.inSubnet('10.44.0.128', '10.44.0.64/26'), false);
});

test('VLSM allocates largest-first with aligned, nonoverlapping boundaries', () => {
  const input = [10, 50, 25, 50];
  const plan = tools.allocateVLSM('10.44.0.0/24', input);
  assert.deepEqual(input, [10, 50, 25, 50]);
  assert.deepEqual(plan.allocations.map(item => item.cidr), ['10.44.0.0/26', '10.44.0.64/26', '10.44.0.128/27', '10.44.0.160/28']);
  assert.deepEqual(plan.allocations.map(item => item.request), [2, 4, 3, 1]);
  assert.equal(plan.remaining_addresses, 80);
  plan.allocations.forEach(item => assert.ok(item.usable >= item.requested_hosts));
});

test('VLSM rejects invalid requests and overcapacity without partial results', () => {
  for (const bad of [[], [0], [-1], [2.5], ['50'], [true], [NaN], Array(101).fill(1)]) assert.throws(() => tools.allocateVLSM('10.44.0.0/24', bad));
  assert.throws(() => tools.allocateVLSM('10.44.0.1/24', [10]), /network boundary/);
  assert.throws(() => tools.allocateVLSM('10.44.0.0/26', [50, 10]), /do not fit/);
  assert.throws(() => tools.allocateVLSM('10.44.0.0/31', [1]), /do not fit/);
  assert.equal(tools.allocateVLSM('0.0.0.0/0', [4294967294]).allocations[0].cidr, '0.0.0.0/0');
});

test('route selection chooses longest prefix, includes default and returns a copy', () => {
  const routes = [
    { cidr: '0.0.0.0/0', next_hop: 'default' },
    { cidr: '10.0.0.0/8', next_hop: 'wide' },
    { cidr: '10.44.0.64/26', next_hop: 'specific' },
  ];
  const selected = tools.longestPrefixMatch('10.44.0.70', routes);
  assert.equal(selected.next_hop, 'specific');
  selected.next_hop = 'changed';
  assert.equal(routes[2].next_hop, 'specific');
  assert.equal(tools.longestPrefixMatch('192.0.2.1', routes).next_hop, 'default');
  assert.equal(tools.longestPrefixMatch('192.0.2.1', routes.slice(1)), null);
  assert.throws(() => tools.longestPrefixMatch('bad', routes));
  assert.throws(() => tools.longestPrefixMatch('10.0.0.1', [null]));
});

test('local switching bypasses routed and inter-switch dependencies', () => {
  const result = tools.tracePacket({ source: 'user', destination: 'peer', missingTrunk: true, routeBroken: true });
  assert.equal(result.status, 'reachable');
  assert.equal(result.route, null);
  assert.ok(result.steps.some(step => step.title.includes('Same VLAN')));
  assert.ok(!result.steps.some(step => step.layer === 'Layer 3'));
  assert.equal(tools.tracePacket({ source: 'admin', destination: 'admin', missingTrunk: true }).status, 'reachable');
});

test('inter-VLAN traffic needs the trunk and correct VLAN membership', () => {
  assert.equal(tools.tracePacket({ source: 'user', destination: 'server' }).status, 'reachable');
  assert.match(tools.tracePacket({ source: 'user', destination: 'server', missingTrunk: true }).reason, /trunk/);
  assert.match(tools.tracePacket({ source: 'user', destination: 'server', missingVLAN: true }).reason, /VLAN 20/);
  assert.match(tools.tracePacket({ source: 'admin', destination: 'server', missingTrunk: true }).reason, /trunk/);
  assert.equal(tools.tracePacket({ source: 'user', destination: 'admin', missingVLAN: true }).status, 'reachable');
});

test('branch traffic needs both forward and return routes', () => {
  const success = tools.tracePacket({ source: 'user', destination: 'branch' });
  assert.equal(success.status, 'reachable');
  assert.equal(success.route.next_hop, '10.44.0.178');
  assert.match(tools.tracePacket({ source: 'user', destination: 'branch', routeBroken: true }).reason, /forward route/);
  assert.match(tools.tracePacket({ source: 'user', destination: 'branch', returnRouteBroken: true }).reason, /reply cannot return/);
  assert.equal(tools.tracePacket({ source: 'branch', destination: 'server' }).route.interface, 'G0/0.20');
});

test('application availability is distinct from ICMP reachability', () => {
  const unavailable = tools.tracePacket({ source: 'user', destination: 'server', protocol: 'tcp', serviceDown: true });
  assert.equal(unavailable.status, 'blocked');
  assert.ok(unavailable.steps.some(step => step.layer === 'Layer 3'));
  assert.match(unavailable.reason, /service is unavailable/);
  assert.equal(tools.tracePacket({ source: 'user', destination: 'server', protocol: 'icmp', serviceDown: true }).status, 'reachable');
});

test('same-host requests still distinguish an unavailable TCP listener', () => {
  const result = tools.tracePacket({ source: 'server', destination: 'server', serviceDown: true });
  assert.equal(result.status, 'blocked');
  assert.match(result.reason, /service is unavailable/);
  assert.ok(!result.steps.some(step => step.layer === 'Layer 3'));
  assert.equal(tools.tracePacket({ source: 'server', destination: 'server', protocol: 'icmp', serviceDown: true }).status, 'reachable');
});

test('path models reject invalid endpoints, protocols and string Boolean flags', () => {
  for (const source of ['unknown', 'constructor', '__proto__', 'toString', '', null]) assert.throws(() => tools.tracePacket({ source }));
  assert.throws(() => tools.tracePacket({ protocol: 'udp' }));
  assert.throws(() => tools.tracePacket({ missingTrunk: 'false' }), /Boolean/);
  assert.throws(() => tools.tracePacket(null), /options object/);
});

test('firewall evaluation uses ordered rules and default deny', () => {
  assert.equal(tools.evaluateFirewall(rules, packet()).decision, 'allow');
  assert.equal(tools.evaluateFirewall(rules, packet()).rule, 1);
  assert.equal(tools.evaluateFirewall(rules, packet({ port: 22 })).rule, 2);
  assert.equal(tools.evaluateFirewall(rules, packet({ destination: '192.0.2.8' })).rule, 'default');
  assert.equal(tools.evaluateFirewall([...rules].reverse(), packet()).decision, 'deny');
});

test('ACL direction and protocol are independent matching requirements', () => {
  assert.equal(tools.evaluateFirewall(rules, reverse({ state: 'new' })).decision, 'deny');
  assert.equal(tools.evaluateFirewall(rules, packet({ protocol: 'udp' })).decision, 'deny');
  assert.equal(tools.evaluateFirewall([{ action: 'allow', source: '*', destination: '*', protocol: 'icmp', port: '*' }], packet({ protocol: 'icmp' })).decision, 'allow');
});

test('established state requires an exact trusted forward or reverse tuple', () => {
  const known = packet();
  assert.equal(tools.evaluateFirewall([], packet({ state: 'established' }), [known]).rule, 'connection-state');
  assert.equal(tools.evaluateFirewall([], reverse(), [known]).decision, 'allow');
  assert.equal(tools.evaluateFirewall([], reverse({ port: 51001 }), [known]).decision, 'deny');
  assert.equal(tools.evaluateFirewall([], reverse({ source_port: 444 }), [known]).decision, 'deny');
  assert.equal(tools.evaluateFirewall([], reverse({ protocol: 'udp' }), [known]).decision, 'deny');
  assert.equal(tools.evaluateFirewall([], reverse({ source: '10.44.0.71' }), [known]).decision, 'deny');
  assert.equal(tools.evaluateFirewall([], reverse({ state: 'new' }), [known]).decision, 'deny');
});

test('a claimed established state cannot grant itself permission', () => {
  const broadAllow = [{ action: 'allow', source: '*', destination: '*', protocol: '*', port: '*' }];
  const result = tools.evaluateFirewall(broadAllow, reverse(), []);
  assert.equal(result.decision, 'deny');
  assert.equal(result.rule, 'untracked-state');
  assert.throws(() => tools.evaluateFirewall([], packet({ protocol: 'icmp', state: 'established' }), []), /TCP\/UDP/);
});

test('firewall input validation rejects invalid ports, rules, states and connection records', () => {
  for (const bad of [0, 65536, 2.5, '443', true, NaN]) assert.throws(() => tools.evaluateFirewall(rules, packet({ port: bad })));
  assert.throws(() => tools.evaluateFirewall(rules, packet({ source_port: 0 })));
  assert.throws(() => tools.evaluateFirewall(rules, packet({ state: '' })));
  assert.throws(() => tools.evaluateFirewall([{ action: 'allow', source: '*', destination: '*', protocol: 'icmp', port: 22 }], packet()));
  assert.throws(() => tools.evaluateFirewall([{ ...rules[0], action: 'accept' }], packet()));
  assert.throws(() => tools.evaluateFirewall([{ ...rules[0], source: 'invalid' }], packet()));
  assert.throws(() => tools.evaluateFirewall([], reverse(), [packet(), null]), /connection record/);
  assert.throws(() => tools.evaluateFirewall([], reverse(), Array(1001).fill(packet())));
});

test('AI decision requires real Booleans and keeps authorisation independent of score', () => {
  assert.equal(tools.aiDecision({ authenticated: true, approved: true, score: 0.1 }).decision, 'allow');
  assert.equal(tools.aiDecision({ authenticated: false, approved: true, score: 0 }).decision, 'deny');
  assert.equal(tools.aiDecision({ authenticated: true, approved: false, score: 0 }).decision, 'deny');
  assert.throws(() => tools.aiDecision({ authenticated: 'false', approved: true, score: 0 }), /Boolean/);
  assert.throws(() => tools.aiDecision({ authenticated: true, approved: 1, score: 0 }), /Boolean/);
});

test('AI score boundaries and unavailable evidence pause the protected action', () => {
  const decide = changes => tools.aiDecision({ authenticated: true, approved: true, score: 0.79, ...changes });
  assert.equal(decide().decision, 'allow');
  assert.equal(decide({ score: 0.8 }).decision, 'review');
  assert.equal(decide({ score: 1 }).decision, 'review');
  assert.equal(decide({ score: null }).decision, 'review');
  assert.equal(decide({ score: 0, threshold: 0 }).decision, 'review');
  for (const bad of [-0.1, 1.1, NaN, Infinity, '0.5', false, undefined]) assert.throws(() => decide({ score: bad }));
  for (const bad of [-1, 2, NaN, '0.8']) assert.throws(() => decide({ threshold: bad }));
});

test('confusion metrics match independently worked counts and avoid division by zero', () => {
  assert.deepEqual(tools.confusionMetrics({ tp: 80, fp: 45, fn: 20, tn: 855 }), { precision: 0.64, recall: 0.8, false_positive_rate: 0.05, accuracy: 0.935 });
  assert.deepEqual(tools.confusionMetrics({ tp: 0, fp: 0, fn: 0, tn: 0 }), { precision: null, recall: null, false_positive_rate: null, accuracy: null });
  assert.deepEqual(tools.confusionMetrics({ tp: 0, fp: 0, fn: 12, tn: 88 }), { precision: null, recall: 0, false_positive_rate: 0, accuracy: 0.88 });
  for (const bad of [-1, 0.5, '1', NaN, Infinity, true]) assert.throws(() => tools.confusionMetrics({ tp: bad, fp: 0, fn: 0, tn: 1 }));
  assert.throws(() => tools.confusionMetrics({ tp: Number.MAX_SAFE_INTEGER, fp: 1, fn: 0, tn: 0 }));
});

test('Boolean table enumerates all four combinations with AND, OR and NOT', () => {
  assert.deepEqual(tools.truthTable(), [
    { a: false, b: false, and: false, or: false, not_a: true },
    { a: false, b: true, and: false, or: true, not_a: true },
    { a: true, b: false, and: false, or: true, not_a: false },
    { a: true, b: true, and: true, or: true, not_a: false },
  ]);
});
