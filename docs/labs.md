# AZ4CAF practical lab workbook

[Study guide](study-guide.md) · [Complex switch and firewall labs](network-labs.md) · [Access, MongoDB, Python and Node](data-tools.md) · [AI operations guide](ai-guide.md) · [Repository setup](../README.md)

These exercises connect the notes to observable results. Use a local computer, a disposable virtual machine or an isolated network simulator. They do not authorise access to a college, employer, Amazon or public network. Do not paste network configuration into real equipment. Follow your tutor's brief and the tool's licence and installation instructions.

The examples use synthetic data, loopback services and documentation or private address ranges. Record the versions you actually use. Command syntax and output differ between platforms. Each lab includes an expected result, evidence and cleanup; document differences instead of editing evidence to match the example.

## Preparation

- Create a dedicated folder for lab records and synthetic files. Keep passwords, tokens, workplace information and personal data out of it.
- For Python labs, use Python 3 and its standard library. Run scripts from the directory containing your disposable files.
- For Linux labs, use an unprivileged account in a disposable VM or a local environment you control. The exercises below do not require `sudo`.
- For network labs, use Cisco Packet Tracer where provided by your course, or an equivalent approved simulator. Interface names vary: adapt `GigabitEthernet0/0` and `FastEthernet0/1` to the simulated device.
- Take a VM snapshot or save a separate simulator copy before a lab. A screenshot alone does not describe how to reproduce a result.
- Use the [lab record template](study-guide.md#lab-record). Predict the result before executing a command.

## Lab 1 — Binary, hexadecimal, storage and validation

**Units:** Fundamentals of Computer Science; Computer Systems Architecture.

**Goal:** perform calculations, state units and reject invalid inputs.

**Prerequisites:** Python 3; a disposable working directory.

1. Convert decimal 47 into binary and hexadecimal by hand. Show 32 + 8 + 4 + 2 + 1. Predict the output of `format(47, "08b")`.
2. Create `representation.py`:

   ```python
   def octet(value):
       if type(value) is not int or not 0 <= value <= 255:
           raise ValueError("an octet must be an integer from 0 to 255")
       return format(value, "08b"), format(value, "02X")

   assert octet(0) == ("00000000", "00")
   assert octet(47) == ("00101111", "2F")
   assert octet(255) == ("11111111", "FF")
   for invalid in (-1, 256, "47", True):
       try:
           octet(invalid)
       except ValueError:
           pass
       else:
           raise AssertionError(f"accepted invalid input: {invalid!r}")

   print("47:", *octet(47))
   print("1 GB in bytes:", 10**9)
   print("1 GiB in bytes:", 2**30)
   print("1 TB in TiB:", round(10**12 / 2**40, 3))
   ```

3. Run `python representation.py`.
4. Extend the function to return decimal as well, keeping the validation. Add a boundary test rather than only retesting 47.

**Expected result:** `47: 00101111 2F`; GB and GiB are 1,000,000,000 and 1,073,741,824 bytes; 1 TB is approximately 0.909 TiB. All assertions pass. `True` is rejected deliberately: Python treats `bool` as a subclass of `int`, so the exact type check matters here.

**Evidence:** hand conversion, script, test result and an explanation of one rejected input. Explain why a capacity-unit difference does not by itself prove storage is missing.

**Troubleshooting:** `AssertionError` means a prediction or implementation is wrong; inspect the expected and actual values. If `python` is unavailable, use the interpreter name installed by your environment, often `python3`.

**Cleanup:** delete only the lab files when no longer needed. Retain your explanation and test output.

## Lab 2 — Inventory reconciliation and algorithm choices

**Units:** Fundamentals of Computer Science; Professional Practice.

**Goal:** validate structured data, detect duplicates and explain the algorithm.

**Prerequisites:** Python 3; no external access.

1. Create `inventory.py` with this synthetic fixture:

   ```python
   expected = {"LAB-SRV-01", "LAB-SRV-02", "LAB-SRV-03"}
   observed = ["LAB-SRV-01", "LAB-SRV-01", "LAB-SRV-03", "LAB-SRV-99"]

   seen = set()
   duplicates = set()
   for asset in observed:
       if asset in seen:
           duplicates.add(asset)
       seen.add(asset)

   missing = expected - seen
   unexpected = seen - expected
   assert missing == {"LAB-SRV-02"}
   assert unexpected == {"LAB-SRV-99"}
   assert duplicates == {"LAB-SRV-01"}
   print("Missing:", sorted(missing))
   print("Unexpected:", sorted(unexpected))
   print("Duplicates:", sorted(duplicates))
   ```

2. Predict and run the output. Explain why converting the observed list into a set before checking duplicates would discard useful information.
3. Add tests for an empty observed list, identical lists and a malformed identifier. Decide explicitly whether malformed data should stop processing or be reported separately.
4. Compare repeated list membership checks with set membership. Explain average-case lookup assumptions and the memory trade-off; do not claim a runtime speedup without measuring it.

**Expected result:** missing `LAB-SRV-02`, unexpected `LAB-SRV-99`, duplicate `LAB-SRV-01`.

**Evidence:** tests, algorithm explanation and a short operational limitation: an absent identifier in a stale discovery file does not prove a physical asset is absent.

**Troubleshooting:** sorting is used only to make display deterministic. Set iteration order must not be treated as a stable inventory order.

**Cleanup:** keep synthetic fixtures only; do not substitute a real asset export without permission.

## Lab 3 — Hardware, capacity and power desk exercise

**Units:** Computer Systems Architecture; Professional Practice.

**Goal:** make a defensible comparison using specifications and calculations without opening equipment.

**Prerequisites:** public manufacturer documentation for one chosen server or desktop model; calculator or Python.

1. Build a table of CPU support, memory generation and maximum capacity, storage interfaces, form factor, PSU options, management features and relevant firmware revision. Record the exact model and document revision. Mark unavailable facts as unknown.
2. For four equal 2 TB drives, calculate these simplified capacities:

   | Layout | Simplified usable capacity | Important limitation |
   | --- | --- | --- |
   | RAID 0 across four drives | 8 TB | No drive-failure tolerance. |
   | RAID 1 using two mirrored pairs, presented separately | Two 2 TB volumes; 4 TB total | Failure tolerance depends on which drives fail. |
   | RAID 5 across four drives | 6 TB | Normally tolerates one drive failure; rebuild risk remains. |
   | RAID 6 across four drives | 4 TB | Normally tolerates two drive failures; controller support required. |

   Ignore filesystem and metadata overhead for the calculation, then state that real usable space will be lower. Do not describe two separate mirrors as one large RAID 1 volume.
3. Calculate energy for a measured 400 W load over 24 hours: 0.4 kW × 24 h = 9.6 kWh. At an illustrative £0.25/kWh the result is £2.40. Calculate seven days and explain why maximum PSU rating is not a measured load.
4. A facility reports total energy of 120,000 kWh and IT-equipment energy of 80,000 kWh over the same boundary and period. Calculate PUE = 120,000 / 80,000 = 1.5. Explain why PUE alone cannot establish service efficiency or compare facilities with different measurement boundaries fairly.
5. Write a diagnostic decision tree for “powers on, no OS boot.” Separate firmware detection, boot order, drive presence, bootloader and OS symptoms. Include a point at which you stop and escalate.

**Expected result:** correct capacity and energy arithmetic, source-specific compatibility claims and explicit assumptions.

**Evidence:** comparison table, calculations with units, a diagnostic diagram and a paragraph distinguishing resilience from backup.

**Troubleshooting:** mixed drive sizes and vendor RAID implementations change real capacity. Use the smallest-member capacity only when the specific layout's rules justify it. Avoid comparing products from marketing names alone.

**Cleanup:** none; this lab involves no physical or configuration changes.

## Lab 4 — IPv4 subnetting and VLSM verification

**Units:** Core Networking; Fundamentals of Computer Science.

**Goal:** produce an address plan and independently verify it.

**Prerequisites:** Python 3; calculator optional. Addresses remain inside documentation or simulated examples.

1. For `192.0.2.77/27`, calculate network `.64`, broadcast `.95`, host range `.65–.94`, 32 total addresses and normally 30 hosts. Explain the 32-address block boundaries.
2. Allocate `10.20.0.0/24` to segments requiring 60, 28 and 12 conventional host addresses. Include the gateway in each requirement or state how you count it. Allocate largest first:

   | Segment | Prefix | Network | Conventional usable range | Broadcast |
   | --- | --- | --- | --- | --- |
   | A, up to 62 hosts | /26 | 10.20.0.0 | .1–.62 | .63 |
   | B, up to 30 hosts | /27 | 10.20.0.64 | .65–.94 | .95 |
   | C, up to 14 hosts | /28 | 10.20.0.96 | .97–.110 | .111 |

3. Verify with Python:

   ```python
   from ipaddress import ip_interface, ip_network

   interface = ip_interface("192.0.2.77/27")
   print(interface.network)
   print(interface.network.broadcast_address)
   parent = ip_network("10.20.0.0/24")
   segments = [ip_network(x) for x in (
       "10.20.0.0/26", "10.20.0.64/27", "10.20.0.96/28"
   )]
   assert all(segment.subnet_of(parent) for segment in segments)
   for i, segment in enumerate(segments):
       for other in segments[i + 1:]:
           assert not segment.overlaps(other)
       hosts = list(segment.hosts())
       print(segment, hosts[0], hosts[-1], len(hosts))
   ```

4. Deliberately replace segment C with `10.20.0.80/28`. The overlap assertion should fail because that range sits within segment B. Restore the correct plan.
5. Explain why the conventional `2^host_bits − 2` formula needs special treatment for /31 and /32. Do not use it blindly for all prefixes.

**Expected result:** verified ranges above; an overlap produces an assertion failure.

**Evidence:** hand calculation, verification output and one rejected overlapping plan with an explanation.

**Troubleshooting:** `ip_network` rejects non-network addresses in strict mode. Do not silence this check merely to make an incorrect plan pass.

**Cleanup:** restore the correct fixture or remove the disposable script.

## Lab 5 — IPv6 addressing and packet-path explanation

**Unit:** Core Networking.

**Goal:** interpret prefixes and distinguish neighbour discovery from IPv4 ARP.

**Prerequisites:** Python 3; optional two-host IPv6 simulator. `2001:db8::/32` is reserved for documentation.

1. Expand `2001:db8:10::25` into eight groups: `2001:0db8:0010:0000:0000:0000:0000:0025`.
2. Assign two simulated hosts `2001:db8:10::10/64` and `2001:db8:10::20/64`. Label their common prefix `2001:db8:10::/64`.
3. With Python, verify:

   ```python
   from ipaddress import ip_address, ip_network
   host = ip_address("2001:db8:10::25")
   print(host.exploded)
   assert host in ip_network("2001:db8:10::/64")
   assert host not in ip_network("2001:db8:20::/64")
   ```

4. In the simulator, test host-to-host reachability and inspect neighbour discovery if the simulator exposes it. Explain how a host resolves an on-link neighbour and why IPv6 does not use IPv4 broadcast ARP.
5. Explain the role of `fe80::/10` link-local addresses and why a link-local address may need an interface scope identifier in a real OS.

**Expected result:** the expanded address above and successful membership assertions; simulated hosts on the same link can communicate when the link and configuration are valid.

**Evidence:** address plan, an annotated packet-path diagram and a comparison of IPv4 ARP and IPv6 neighbour discovery.

**Troubleshooting:** a valid prefix alone does not establish connectivity; link state, duplicate addresses and host configuration still matter.

**Cleanup:** close or reset the simulated topology; do not assign documentation addresses to an external interface.

## Lab 6 — VLANs, a trunk and inter-VLAN routing

**Units:** Core Networking; Applied Networking.

**Goal:** verify segmentation, then restore a controlled fault.

**Prerequisites:** simulator; one router, one Layer 2 switch and two PCs. Use a fresh topology. Save a baseline copy.

Connect PC-A to switch Fa0/1, PC-B to Fa0/2 and switch Gi0/1 to router Gi0/0. Use VLAN 10 for PC-A and VLAN 20 for PC-B. Configure PC-A as `192.0.2.10/26`, gateway `192.0.2.1`; PC-B as `192.0.2.70/26`, gateway `192.0.2.65`.

1. On the simulated switch, adapt interface names if necessary:

   ```text
   enable
   configure terminal
   vlan 10
    name LAB_A
   exit
   vlan 20
    name LAB_B
   exit
   interface fastethernet0/1
    switchport mode access
    switchport access vlan 10
    spanning-tree portfast
   exit
   interface fastethernet0/2
    switchport mode access
    switchport access vlan 20
    spanning-tree portfast
   exit
   interface gigabitethernet0/1
    switchport mode trunk
    switchport trunk allowed vlan 10,20
   end
   show vlan brief
   show interfaces trunk
   ```

   PortFast is used only on the two end-host ports in this isolated exercise. Do not enable it indiscriminately on links between switches. Some simulated models require explicit trunk encapsulation; consult that model's syntax.

2. On the simulated router:

   ```text
   enable
   configure terminal
   interface gigabitethernet0/0
    no shutdown
   exit
   interface gigabitethernet0/0.10
    encapsulation dot1Q 10
    ip address 192.0.2.1 255.255.255.192
   exit
   interface gigabitethernet0/0.20
    encapsulation dot1Q 20
    ip address 192.0.2.65 255.255.255.192
   end
   show ip interface brief
   show ip route
   ```

3. From each PC, ping its own gateway and then the other PC. An initial packet may be lost during address resolution; repeat the test and explain the dependency.
4. Predict what happens if the trunk carries only VLAN 10. In the simulator, change the allowed list to `10`, test both PCs and capture the result.
5. Restore `switchport trunk allowed vlan 10,20`, retest and verify that the gateway and cross-VLAN tests recover.

**Expected result:** the router has connected routes for `192.0.2.0/26` and `192.0.2.64/26`; both VLANs appear on the trunk. Removing VLAN 20 breaks PC-B's routed path while VLAN 10 remains available.

**Evidence:** topology, address/port plan, selected `show` output, before/fault/recovery test matrix and a packet-path explanation. Explain that the router permits inter-VLAN traffic here because no policy has yet been applied.

**Troubleshooting:** check port state, cable, VLAN membership, trunk list, subinterface tag, mask and gateway before changing routing. A host in the wrong VLAN may have a correct-looking IP address but no valid gateway path.

**Cleanup:** restore the baseline or keep a separate clearly named completed lab file. Never copy this configuration to real equipment.

## Lab 7 — Access control and positive/negative tests

**Unit:** Applied Networking.

**Goal:** show that a policy works in both directions of the requirement.

**Prerequisites:** completed simulator topology from Lab 6. Save a separate copy. The policy is deliberately narrow: block ICMP echo requests from PC-A to PC-B, while allowing other IP traffic in this small lab. It is not a recommended production policy.

1. Confirm PC-A can ping PC-B before applying the policy.
2. On the simulated router:

   ```text
   configure terminal
   ip access-list extended LAB_A_IN
    deny icmp host 192.0.2.10 host 192.0.2.70 echo
    permit ip any any
   exit
   interface gigabitethernet0/0.10
    ip access-group LAB_A_IN in
   end
   show access-lists
   show ip interface gigabitethernet0/0.10
   ```

3. Test PC-A → PC-B ping: it should fail. Test PC-A → its gateway: it should succeed. Test PC-B → PC-A ping: it should succeed because the returning echo reply from PC-A does not match the denied echo-request type.
4. Inspect ACL counters after the tests. Explain direction: `in` means entering the router through VLAN 10's subinterface, not “towards PC-A.”
5. Explain the implicit deny at the end of an ACL and why the final permit line matters in this exercise. Do not infer stateful firewall behaviour from this stateless ACL.
6. Roll back:

   ```text
   configure terminal
   interface gigabitethernet0/0.10
    no ip access-group LAB_A_IN in
   exit
   no ip access-list extended LAB_A_IN
   end
   ```

**Expected result:** the three tests match the policy above; PC-A → PC-B ping works again after rollback. Exact counters depend on repeat count and simulator behaviour.

**Evidence:** a test matrix with source, destination, protocol/type, expected, actual and interpretation; relevant ACL output; rollback verification.

**Troubleshooting:** an ACL applied to the wrong interface or direction may never match. A failed positive test might come from routing or addressing rather than the ACL. Establish the baseline first.

**Cleanup:** remove the ACL and verify baseline connectivity, or revert the saved lab copy.

## Lab 8 — Route selection and a troubleshooting runbook

**Units:** Core Networking; Applied Networking; Professional Practice.

**Goal:** explain longest-prefix match and build a diagnostic sequence.

**Prerequisites:** paper or a text editor; optional simulator with three routers.

1. Given the following hypothetical routes, determine the match for each destination before considering route-source preference:

   ```text
   0.0.0.0/0       via 10.0.0.1
   10.30.0.0/16    via 10.0.0.2
   10.30.40.0/24   via 10.0.0.3
   10.30.40.128/25 via 10.0.0.4
   ```

2. Expected matches: `10.30.40.150` → /25; `10.30.40.20` → /24; `10.30.80.20` → /16; `198.51.100.20` → default route. Assume the routes are installed and next hops are reachable; those assumptions need verification in a real network.
3. Write a runbook for “client cannot reach service.” For each step state a test, expected result and branch:
   - link and interface state;
   - host address, prefix and gateway;
   - local gateway reachability;
   - forward and return route;
   - relevant ACL/firewall path;
   - transport listener and service health;
   - DNS compared with direct-address access.
4. If building a simulator topology, introduce only one fault at a time: wrong host gateway, missing route or disabled interface. Ask another learner to diagnose it using your runbook.

**Expected result:** correct prefix matches and a runbook that narrows faults without immediately changing configuration.

**Evidence:** route reasoning, runbook, fault timeline and final recovery test. Distinguish a timeout from proof that a specific intermediate device is faulty.

**Troubleshooting:** administrative distance and metric help select among route candidates for the same prefix; they do not make a less-specific installed route beat a more-specific match for forwarding.

**Cleanup:** revert simulator faults and verify the saved baseline.

## Lab 9 — Linux files, permissions, backup and restore

**Units:** Operating Systems; Professional Practice.

**Goal:** explain permissions and prove recovery using disposable data.

**Prerequisites:** Linux shell, `mktemp`, `tar`, `sha256sum`; unprivileged account. Run the commands in one subshell so the temporary variables and `umask` do not affect later work.

```bash
(
  lab_dir=$(mktemp -d -t az4caf-files-XXXXXX) || exit 1
  trap 'rm -rf -- "$lab_dir"' EXIT
  umask 027
  mkdir "$lab_dir/original" "$lab_dir/restored"
  printf 'Synthetic service configuration\nport=8080\n' > "$lab_dir/original/service.conf"
  chmod 640 "$lab_dir/original/service.conf"
  stat -c '%a %n' "$lab_dir/original/service.conf"
  tar -cf "$lab_dir/backup.tar" -C "$lab_dir/original" service.conf
  tar -tf "$lab_dir/backup.tar"
  tar -xf "$lab_dir/backup.tar" -C "$lab_dir/restored"
  sha256sum "$lab_dir/original/service.conf" "$lab_dir/restored/service.conf"
  cmp "$lab_dir/original/service.conf" "$lab_dir/restored/service.conf" && printf 'Restore content matches\n'
)
```

1. Predict what `640` allows: owner read/write; group read; others no permission. Explain why directory execute permission has a different meaning from file execute permission.
2. Run the commands and interpret the two matching hashes. The archive contains only the disposable configuration file created in this lab.
3. Repeat in a new disposable directory, modify the restored file and show that `cmp` detects a mismatch. Restore again and verify recovery.
4. State what the test establishes: content equality for one file. It does not establish a full system restore, preserved ACLs, application consistency or achievement of an RPO/RTO.

**Expected result:** permission `640`, archive member `service.conf`, matching SHA-256 values and `Restore content matches`.

**Evidence:** interpreted permission output, hashes and scope/limitations. Measure elapsed restore time if practising RTO calculations, stating what the measurement includes.

**Troubleshooting:** a missing command indicates a platform difference; use an approved environment rather than changing system packages without need. Do not extract an untrusted archive with these commands.

**Cleanup:** the trap deletes only the directory created by `mktemp`. Do not replace it with a broad directory path or run cleanup against your evidence folder.

## Lab 10 — A local service: running, listening and reachable

**Units:** Operating Systems; Applied Networking.

**Goal:** distinguish process state, socket state and an application response.

**Prerequisites:** Python 3; two terminal sessions; local port 8765 available.

1. In terminal A create a disposable directory, put a file named `health.txt` in it containing `lab-ok`, and start a loopback-only server from that directory:

   ```bash
   python -m http.server 8765 --bind 127.0.0.1
   ```

   The server exposes files in its current directory to local clients. Use only the disposable directory.
2. In terminal B request the file without requiring `curl`:

   ```bash
   python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8765/health.txt', timeout=3).read().decode().strip())"
   ```

3. On Linux, inspect the listener using `ss -ltn` and find `127.0.0.1:8765`. If `ss` is unavailable, use the OS's documented socket tool. Explain why binding to loopback limits reachability.
4. Request a missing filename and observe an HTTP 404 in the server log. Explain how this differs from a connection refusal when no process is listening.
5. Stop the server with Ctrl+C in terminal A and repeat the valid request. It should fail because the listening process has ended.

**Expected result:** `lab-ok` while the server is running; an HTTP 404 for a missing file; a connection failure after shutdown. Exact exception wording varies by OS.

**Evidence:** a dependency diagram, listener output and three outcomes. Explain why “process running” is weaker evidence than a successful application request.

**Troubleshooting:** “address already in use” means another listener uses the port. Choose another unused high port consistently; do not terminate an unfamiliar process. If a request fails while the server is running, compare address, port, filename and working directory.

**Cleanup:** stop the server and remove only the disposable files you created. Confirm the listener has gone.

## Lab 11 — Windows process and recovery practice

**Unit:** Operating Systems.

**Goal:** practise read-only inspection and file recovery with PowerShell.

**Prerequisites:** Windows with PowerShell; unprivileged account. No services or system configuration are changed.

```powershell
$labDir = Join-Path ([System.IO.Path]::GetTempPath()) ("az4caf-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $labDir | Out-Null
try {
    $original = Join-Path $labDir "original.txt"
    $backup = Join-Path $labDir "backup.txt"
    $restored = Join-Path $labDir "restored.txt"
    Set-Content -Path $original -Value "Synthetic configuration" -Encoding UTF8
    Copy-Item -Path $original -Destination $backup
    Copy-Item -Path $backup -Destination $restored
    Get-FileHash -Algorithm SHA256 -Path $original, $restored
    Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, Id, CPU
} finally {
    Remove-Item -LiteralPath $labDir -Recurse -Force
}
```

1. Compare hashes and explain why copying files is only a small recovery exercise.
2. Interpret `CPU` as accumulated processor time for the process, not the current CPU utilisation percentage. Explain why two observations at different times can differ.
3. Use `Get-Service | Select-Object -First 10 Name, Status` for read-only service inspection. Do not stop or reconfigure unfamiliar services.
4. Compare the terms process, service, listening port and application response with Lab 10.

**Expected result:** matching content hashes; process and service lists reflect the local machine. Do not publish personally identifying paths or process details unnecessarily.

**Evidence:** a short interpretation using only approved, relevant output. Redact personal path details from screenshots.

**Troubleshooting:** shell versions and permissions affect available fields. A blank CPU value does not mean a process has never used CPU; access restrictions or unavailable data may apply.

**Cleanup:** the `finally` block removes the new temporary directory. Do not alter it to point at an existing folder.

## Lab 12 — AI evaluation without a training framework

**Units:** Core AI; Fundamentals of Computer Science.

**Goal:** calculate metrics, compare a baseline and explain operational consequences.

**Prerequisites:** Python 3; synthetic labels only.

1. Treat `1` as “requires investigation” and `0` as “does not require investigation.” Create `metrics.py`:

   ```python
   actual = [1] * 12 + [0] * 88
   predicted = [1] * 8 + [0] * 4 + [1] * 2 + [0] * 86

   def metrics(truth, guess):
       if len(truth) != len(guess) or not truth:
           raise ValueError("non-empty label lists must have equal length")
       if any(value not in (0, 1) for value in truth + guess):
           raise ValueError("this exercise expects binary labels")
       tp = sum(t == 1 and p == 1 for t, p in zip(truth, guess))
       fp = sum(t == 0 and p == 1 for t, p in zip(truth, guess))
       fn = sum(t == 1 and p == 0 for t, p in zip(truth, guess))
       tn = sum(t == 0 and p == 0 for t, p in zip(truth, guess))
       precision = tp / (tp + fp) if tp + fp else None
       recall = tp / (tp + fn) if tp + fn else None
       accuracy = (tp + tn) / len(truth)
       return tp, fp, fn, tn, precision, recall, accuracy

   result = metrics(actual, predicted)
   assert result[:4] == (8, 2, 4, 86)
   print("Candidate:", result)
   print("Always negative:", metrics(actual, [0] * len(actual)))
   ```

2. Calculate the results by hand before running it: precision 80%, recall about 66.7%, accuracy 94%.
3. The always-negative baseline has 88% accuracy and 0% recall; precision is undefined because it predicts no positive cases. Explain why the code uses `None` rather than pretending the ratio is meaningful.
4. Use illustrative costs of £100 per false negative and £5 per false positive. Candidate error cost: 4×£100 + 2×£5 = £410; always-negative cost: 12×£100 = £1,200. Explain that these assumed costs are a teaching example, not evidence of real business savings.
5. Design a data split for six months of timestamped events: earlier months for training, a later period for validation and the final period held out for testing. Explain why random splitting can leak future operational patterns.
6. List leakage risks: post-resolution labels in input features, duplicates spanning splits, preprocessing fitted on all data and selecting the final model based on the test set.

**Expected result:** confusion counts and baseline above. This lab evaluates supplied predictions; it does not train a model or establish performance on unseen operational data.

**Evidence:** hand calculations, output, a split diagram, a cost discussion and a limitation statement. State which decision remains with a human.

**Troubleshooting:** swapping the meanings of positive and negative changes precision and recall. Define the positive class before calculating.

**Cleanup:** delete the synthetic script if desired. Do not replace the fixture with workplace telemetry without approval.

## Lab 13 — AI-assisted explanation with verification

**Units:** Core AI; Professional Practice.

**Goal:** evaluate an assistant's output as a claim that needs evidence.

**Prerequisites:** an approved AI tool if available; otherwise use a peer-written answer. Use only a fictional scenario.

1. Ask for a troubleshooting explanation for a synthetic host that can reach its gateway but cannot resolve a hostname.
2. Separate the response into facts, assumptions, hypotheses and proposed actions. Mark any invented environmental details.
3. Verify two technical claims against the exact OS or vendor documentation. Record the section and access date.
4. Reject any proposed action that changes unrelated infrastructure, exposes secrets or exceeds the stated scope. Rewrite the advice into read-only tests first.
5. Produce your own final explanation, including uncertainties and the next test that would distinguish a DNS problem from a broader service issue.

**Expected result:** an evidence-based critique, not a screenshot showing that a tool produced fluent text.

**Evidence:** synthetic prompt, relevant output excerpts where permitted, claim/source table and your corrected explanation. Follow your institution's AI-use and attribution rules.

**Troubleshooting:** a link in generated output may be nonexistent or irrelevant. Open the authoritative document and confirm what it supports.

**Cleanup:** remove any accidentally included sensitive content according to the tool and institutional process; prevent it by using synthetic data from the start.

## Lab 14 — Incident handover and change rehearsal

**Units:** Professional Practice; Work Based Learning; Applied Networking.

**Goal:** communicate an operational problem and practise a controlled response.

**Prerequisites:** Lab 6 simulator or a tabletop exercise with a peer. No workplace data.

Scenario: at 10:00 UTC a simulated host in VLAN 20 loses gateway connectivity after an approved lab change. VLAN 10 still works. The previous saved configuration carried both VLANs; the current trunk carries VLAN 10 only.

1. Write a brief incident update with impact, start time, facts, hypothesis, owner and next update time. Label the missing VLAN as a hypothesis until verified.
2. Collect the trunk and interface outputs. State what each supports and what remains unknown.
3. Prepare a change plan to restore VLAN 20. Include a pre-change snapshot, expected impact, positive and negative tests, rollback steps and a measurable stop condition.
4. Have a peer review the plan. In a tabletop exercise, role-play approval; do not imply that a classroom role-play grants workplace permission.
5. Apply the correction only in the simulator. Verify both VLANs and record the result.
6. Write a handover another learner could use without asking you to repeat the history. Include current state, evidence references and remaining actions.
7. Reflect on the process: was the fault detection timely, was the change scope clear and did the communication distinguish facts from assumptions?

**Expected result:** a reproducible plan, successful simulator recovery and a concise factual handover. A peer can explain the next action and its owner.

**Evidence:** incident timeline, change plan, selected outputs, test matrix and reflection. Use [the templates](study-guide.md#reusable-evidence-templates).

**Troubleshooting:** avoid rewriting the initial record to make your first hypothesis look correct. Preserve the original hypothesis and add the test result.

**Cleanup:** restore or save the intended lab baseline; close the simulated incident record as a training exercise.

## Lab 15 — Placement learning plan or optional project proposal

**Units:** Work Based Learning; Professional Practice; optional Designing a Computing Project.

**Goal:** prepare an achievable learning activity with evidence and boundaries.

**Prerequisites:** current tutor guidance. Placement availability and project approval are separate institutional decisions.

### Placement practice route

1. Draft three objectives with observable outcomes, such as “explain an approved incident escalation path using a supervisor-reviewed anonymised flowchart.”
2. For each objective list authorised activities, required supervision, evidence permitted by the host, a review date and a fallback if the activity is unavailable.
3. Draft one learning-log entry using a fictional observation. Label it “practice example”; do not submit it as workplace evidence.
4. Explain how you will distinguish observing, assisting and performing under supervision.
5. Agree actual evidence arrangements with HRUC and the placement host before collecting workplace material.

### Optional project practice route

1. Obtain the current Pearson-set theme and tutor-approved brief before choosing the assessed project.
2. As a practice proposal, consider a local synthetic incident-log analyser. Define users, inputs, outputs and success criteria, such as rejecting malformed timestamps and reproducing a supplied count exactly.
3. Plan research, design, implementation, evaluation and reporting milestones. Add risks, ethical issues and scope exclusions.
4. Create a synthetic dataset with known expected results and a test plan before implementation.
5. Explain how you will evaluate the outcome honestly, including an unmet criterion or limitation.

**Expected result:** a plan that can be reviewed and revised, with clear boundaries and measurable outcomes. It is not a completed assessment or a guarantee of Level 5 progression.

**Evidence:** proposal, objective/evidence matrix, schedule, risk register and tutor feedback where appropriate.

**Troubleshooting:** an objective such as “learn networking” is too broad; narrow it to a concept, activity and observable result. Do not promise access to production systems as a project dependency.

**Cleanup:** replace practice placeholders only after approval; retain version history so scope changes are visible.

## Lab 16 — Linux access and a read-only diagnostic baseline

**Units:** Operating Systems; Applied Networking; Professional Practice.

**Goal:** establish approved access and explain what a diagnostic baseline shows.

**Prerequisites:** a disposable Linux VM or local Linux environment you control. For SSH, the VM must already have a configured SSH service and an individually assigned account. Confirm the expected host-key fingerprint through the VM console or another trusted channel. Do not install or expose an SSH server on a public interface for this exercise.

1. First practise locally. Record identity and environment without displaying secrets:

   ```bash
   id
   hostname
   uname -r
   pwd
   uptime
   df -h .
   free -h
   ps -u "$(id -u)" -o pid,comm,etime
   ```

   Explain real versus effective identity if the environment distinguishes them. `df -h .` reports the filesystem containing the working directory; it is not an inventory of every physical drive. Available memory includes reclaimable resources, so “free” memory alone is not a complete memory-pressure assessment.
2. On the disposable VM, use `ip address` and `ip route` to identify the intended lab interface and route. Record only relevant output. If the host has other interfaces, do not change or probe them.
3. If approved SSH access is available, connect with the assigned account, substituting the real address of your own isolated VM:

   ```bash
   ssh labuser@192.168.56.10
   ```

   `192.168.56.10` is an example private address, not a service provided by this repository. Use only the address assigned to your VM. Confirm the presented fingerprint against the trusted value before accepting it. Do not disable host-key checking to bypass a mismatch.
4. On the remote session run `id`, `hostname` and `pwd` again. Explain which machine produced each result. If the shell prompt alone is ambiguous, include an explicit hostname in your evidence.
5. Inspect your own files and permissions with `ls -ld .` and `ls -l`. Use a dedicated lab directory rather than listing another person's files. Explain why login success does not grant permission for every operation.
6. If the VM uses systemd, run the read-only command `systemctl --failed`. An empty failure list means systemd reports no units in the failed state at that moment; it does not prove every application is healthy. Use Lab 10 to demonstrate the separate need for an application-level check.
7. End the remote session with `exit`. Confirm that a subsequent `hostname` comes from the local environment.

**Expected result:** the intended individual account accesses the intended VM; diagnostic output can be explained; the session closes cleanly. Results such as memory size, uptime and process count depend on the VM.

**Evidence:** a short baseline table with timestamp, machine, command, observation and interpretation. Redact personal usernames, internal hostnames and addresses where required. State that this is lab evidence, not workplace access.

**Troubleshooting:** connection refusal suggests no listener at that address/port; a timeout can have several causes, including routing or filtering; authentication failure does not imply a network fault. A host-key change must be investigated through a trusted channel. Do not delete the known-host entry merely to make the warning disappear.

**Cleanup:** close SSH sessions; remove disposable lab files only. If the VM is no longer needed, shut it down or revert its snapshot using the normal VM controls. Do not remove keys or change account privileges outside the agreed lab scope.

## Extended tools and complex networks

Use [the data-tools guide](data-tools.md) for the detailed **Access, MongoDB, Python and Node** pathway, including local examples and access boundaries. Use [the network-labs guide](network-labs.md) for deeper **switch configuration, firewalls and complex network topologies**. These focused guides extend the sequence above without changing the official unit list.

For every extension keep the same evidence discipline: define a working baseline, predict a result, collect actual output, test allowed and denied behaviour where relevant, document limitations and verify cleanup. An application that connects successfully with one account has not automatically proved least privilege for other operations.

## Integrated challenge — investigate, restore and explain

Combine the skills above in a fresh copy of your simulator and local fixtures:

1. Produce an address plan and inventory for a two-VLAN training environment.
2. Establish and document a working baseline.
3. Ask a peer to introduce one agreed reversible simulator fault. Do not reveal its cause to the investigator.
4. Diagnose with read-only tests, recording predictions and results.
5. Propose and review the smallest correction that addresses the evidence.
6. Restore service, verify unaffected behaviour and record rollback readiness.
7. Write a technical report and a short non-technical incident update.
8. Summarise the evidence in a synthetic CSV and explain one simple metric. If using AI assistance, verify the output and attribute its use according to your institution's policy.

Evaluate the work against reproducibility, correct reasoning, verified recovery, clear communication and honest limitations. These are study criteria, not an official assessment rubric.

## Reading alongside the labs

Use the [authoritative starting references](study-guide.md#authoritative-starting-references), the notes' source links, and the manuals for your actual tool versions. Particularly useful references include [Python `ipaddress`](https://docs.python.org/3/library/ipaddress.html), [Python HTTP server](https://docs.python.org/3/library/http.server.html), [Microsoft PowerShell documentation](https://learn.microsoft.com/powershell/), [Cisco support](https://www.cisco.com/c/en/us/support/index.html) and [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework).

Record the access date when you consult a source. A successful simulator lab demonstrates behaviour in that simulator; explain its limits before generalising to real hardware or operational practice.
