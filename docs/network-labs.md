# Switching, firewalls and complex networks: practical workbook

This workbook builds a small, explainable network before adding complexity. It supports Core Networking, Applied Networking, Operating Systems and work placement preparation. It is supplementary practice, not an official HRUC assessment brief or a claim that every feature is in CCNA.

Use [the main lab pathway](labs.md) for the wider programme and [the study guide](study-guide.md) for revision and evidence planning.

## Working method and prerequisites

Use an isolated Packet Tracer project for the Cisco exercises. The examples assume two Catalyst 2960-style Layer 2 switches and two ISR 2911-style routers. Interface names, crypto capabilities and simulator support vary. A real IOS image, different switch family or another simulator may need different syntax. Check the device help and its own official guide before adapting a command.

For Linux exercises, use a disposable Linux VM with `iproute2`, `nftables`, Python 3, `curl` and optionally `tcpdump`/DNS tools installed. Namespace creation requires administrative rights. These exercises configure only named lab namespaces; do not run them on workplace equipment or a shared host.

For every change:

1. Draw the intended path and record the current state.
2. Keep console access or another known working management path.
3. Change one dependency at a time and verify it before continuing.
4. Save a known working checkpoint; keep the previous file for rollback.
5. Record actual commands and observations, including unsuccessful tests.

A successful ping alone does not establish that DNS, application access, segmentation and recovery all work. Test required flows and prohibited flows.

## 1. The topology and address plan

```text
User PC                     SW1                        R1                 R2
10.44.0.10/26 -- Fa0/1       Gi0/1 -- trunk -- G0/0      G0/1 -- /30 -- G0/0
                            |                                             |
                      Fa0/23 + Fa0/24                                  G0/1
                       LACP Port-channel1                                 |
                            |                                    Remote PC .194/27
                           SW2
                       /     |      \
                    Fa0/1  Fa0/2   Fa0/3
                    Server Admin   Storage test host
                    .70/26 .164/28 .130/27
```

Both switches have VLANs 10, 20, 30, 99 and 999. SW1 connects the router trunk; the two member links between switches form **one** logical LACP trunk. VLAN 999 is an unused native/parking VLAN without a gateway or management address. There is no separate physical firewall in this first topology: the router routes, and a later ACL demonstrates a limited stateless filter. The Linux exercise then demonstrates a stateful firewall separately.

| Purpose | VLAN | Network/prefix | Mask | Usable range | Broadcast | Gateway |
| --- | --- | --- | --- | --- | --- | --- |
| Users | 10 | 10.44.0.0/26 | 255.255.255.192 | .1–.62 | .63 | .1 |
| Servers | 20 | 10.44.0.64/26 | 255.255.255.192 | .65–.126 | .127 | .65 |
| Storage lab | 30 | 10.44.0.128/27 | 255.255.255.224 | .129–.158 | .159 | .129 |
| Management | 99 | 10.44.0.160/28 | 255.255.255.240 | .161–.174 | .175 | .161 |
| R1–R2 transit | — | 10.44.0.176/30 | 255.255.255.252 | .177–.178 | .179 | — |
| Remote branch | — | 10.44.0.192/27 | 255.255.255.224 | .193–.222 | .223 | .193 |

Addresses .180–.191 and .224–.255 remain unallocated; they are not one continuous free subnet. R1 uses transit .177 and R2 uses .178. SW1 management is .162 and SW2 is .163. All abbreviated addresses in this table begin `10.44.0`.

### Worked VLSM checks

A `/26` leaves six host bits: `2^6 = 64` addresses, ordinarily 62 usable host addresses. The increments are 64, so `.70/26` belongs to `.64/26`, not `.0/26`. Its gateway `.65` is inside the same subnet. `.127` is the broadcast address and cannot be allocated to the server.

A `/28` leaves four host bits: 16 addresses and ordinarily 14 usable hosts. `.164/28` falls in the block `.160–.175`. The admin host, `.161` gateway, `.162` SW1 and `.163` SW2 therefore share VLAN 99's subnet.

A `/30` leaves two host bits: `.176` network, `.177` and `.178` hosts, `.179` broadcast. `/31` point-to-point addressing is possible on supporting equipment, but this lab deliberately uses `/30`.

Allocate larger required subnets first, align each network to its block boundary, then check that ranges do not overlap. Count interfaces, gateways and future capacity as well as end devices.

**Evidence:** an annotated topology, a complete address table and calculations for one subnet of each size. Explain why a VLAN number does not determine an IP subnet.

## 2. Establish a switch baseline and management access

Connect through the console. Confirm the device/interface names with `show version` and `show interfaces status`. In Packet Tracer choose private, unique lab passwords when entering these commands; angle-bracket values below are placeholders and must be replaced.

On SW1:

```text
enable
configure terminal
hostname SW1
no ip domain-lookup
enable secret <choose-a-unique-lab-enable-secret>
username labadmin privilege 15 secret <choose-a-different-lab-secret>
ip domain-name az4caf.example
crypto key generate rsa modulus 2048
ip ssh version 2
line console 0
 logging synchronous
 exec-timeout 10 0
 login local
exit
line vty 0 15
 login local
 transport input ssh
 exec-timeout 10 0
exit
vlan 10
 name USERS
vlan 20
 name SERVERS
vlan 30
 name STORAGE_LAB
vlan 99
 name MANAGEMENT
vlan 999
 name PARKING_NATIVE
exit
interface vlan 99
 ip address 10.44.0.162 255.255.255.240
 no shutdown
exit
ip default-gateway 10.44.0.161
end
```

Repeat on SW2, changing the hostname and SVI address to `10.44.0.163`. Some simulator images prompt for the RSA modulus instead of accepting it on the same line; use the platform-supported equivalent. Do not substitute Telnet on a production network if a simulator lacks SSH.

An SVI can remain down until that VLAN exists and an appropriate Layer 2 port is active and forwarding. At this stage no remote gateway is configured on R1, so routed SSH access is not expected yet.

`ip default-gateway` is for this Layer 2 switch's own management traffic. It does not enable inter-VLAN routing. On a Layer 3 switch running `ip routing`, use the appropriate routed/default route design instead.

The `privilege 15` account is a lab convenience. In operations, use approved role-based accounts, AAA, central authentication and emergency access controls. Never publish secrets, private keys or full sensitive configurations as assignment evidence.

Verify:

```text
show vlan brief
show ip interface brief
show ip ssh
show running-config
```

**Expected:** the VLANs exist, the management address is correct, and VTY access allows SSH. Record whether the SVI is up and explain the dependencies.

## 3. Configure access ports and the router trunk

On SW1 configure the user port and router-facing trunk:

```text
configure terminal
interface fastethernet 0/1
 description LAB_USER_PC
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
exit
interface gigabitethernet 0/1
 description TRUNK_TO_R1_G0_0
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99,999
 switchport nonegotiate
 no shutdown
end
```

On SW2:

```text
configure terminal
interface fastethernet 0/1
 description LAB_SERVER
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
exit
interface fastethernet 0/2
 description LAB_ADMIN
 switchport mode access
 switchport access vlan 99
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
exit
interface fastethernet 0/3
 description LAB_STORAGE_HOST
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
end
```

PortFast and BPDU Guard here are for known endpoint access ports. Do not apply this edge configuration blindly to switch uplinks. Receiving a BPDU can disable an edge port under BPDU Guard; investigate the unexpected bridge before recovery.

Some switches require `switchport trunk encapsulation dot1q`; 2960 platforms with only 802.1Q do not offer that command. A command rejected because the platform differs is evidence to investigate, not a reason to paste larger configuration blocks repeatedly.

For unused access ports, select only ports that are genuinely unused, put them in VLAN 999 and administratively shut them down. Keep the selected uplinks and console path available.

## 4. Build the LACP inter-switch trunk

Cable SW1 Fa0/23 to SW2 Fa0/23 and SW1 Fa0/24 to SW2 Fa0/24. Start from unconfigured lab ports. On **both** switches:

```text
configure terminal
interface range fastethernet 0/23 - 24
 description LACP_MEMBERS_TO_OTHER_SWITCH
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99,999
 switchport nonegotiate
 channel-group 1 mode active
 no shutdown
exit
interface port-channel 1
 description LACP_TRUNK_TO_OTHER_SWITCH
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99,999
 no shutdown
end
```

LACP `active`/`active` negotiates; `active`/`passive` can negotiate; `passive`/`passive` does not initiate. Match native/allowed VLANs, speed, duplex and channel settings. Do not mix LACP with proprietary PAgP on the peer.

Verify:

```text
show etherchannel summary
show interfaces trunk
show interfaces port-channel 1
```

**Expected:** Port-channel1 is Layer 2 and in use; both physical members are bundled. IOS commonly displays `Po1(SU)` and member `(P)` flags. Exact formatting varies. A suspended or standalone member is not a successful bundle.

A two-link bundle can carry multiple flows across members according to a hash. It does not normally double the speed of one flow, and it does not survive loss of both switches. Record which failures it addresses and which remain single points of failure.

## 5. Set and inspect spanning tree

On both switches:

```text
configure terminal
spanning-tree mode rapid-pvst
end
```

On SW1:

```text
configure terminal
spanning-tree vlan 10,20,30,99,999 priority 24576
end
```

On SW2:

```text
configure terminal
spanning-tree vlan 10,20,30,99,999 priority 28672
end
```

Verify `show spanning-tree vlan 10` and `show spanning-tree vlan 99`. SW1 should be the root with this isolated topology. Displayed bridge priorities may include the extended system ID (VLAN number), so VLAN 10 can display `24586` rather than `24576`.

The LACP members form one logical STP port. In this topology there is no extra standalone inter-switch link that STP needs to block. Do not manufacture a loop to test redundancy on physical equipment.

**Failure exercise:** after saving a working checkpoint, shut down one channel member. The port-channel should remain up through the other member. Restore the member and confirm it rejoins. A brief transient or packet loss is possible; observe rather than promising zero interruption.

## 6. Configure router-on-a-stick gateways

On R1, G0/0 is connected to SW1's Gi0/1 trunk:

```text
enable
configure terminal
hostname R1
interface gigabitethernet 0/0
 description DOT1Q_TRUNK_TO_SW1
 no ip address
 no shutdown
exit
interface gigabitethernet 0/0.10
 encapsulation dot1Q 10
 ip address 10.44.0.1 255.255.255.192
exit
interface gigabitethernet 0/0.20
 encapsulation dot1Q 20
 ip address 10.44.0.65 255.255.255.192
exit
interface gigabitethernet 0/0.30
 encapsulation dot1Q 30
 ip address 10.44.0.129 255.255.255.224
exit
interface gigabitethernet 0/0.99
 encapsulation dot1Q 99
 ip address 10.44.0.161 255.255.255.240
exit
interface gigabitethernet 0/0.999
 encapsulation dot1Q 999 native
 no ip address
end
```

Set endpoint IP addresses, masks and gateways from the address table. Initially allow routing between all lab VLANs to verify the foundation. Security policy is added after the path works.

Verify:

```text
show ip interface brief
show ip route connected
show arp
```

Test from the admin PC to `.161`, `.162` and `.163`. Test the user PC's own gateway before testing `.70` on the server VLAN. Test SSH to both switches from the admin PC. In Packet Tracer, a PC can use `ssh -l labadmin 10.44.0.162` if its SSH client is supported.

**Explain the packet path:** the user PC determines that `.70` is outside its `/26`, ARPs for `.1`, sends a frame to R1's MAC, and R1 routes to VLAN 20. The destination IP remains `.70` while Layer 2 addresses change at the routed boundary. Switches learn source MAC addresses; they do not route this packet merely because they have a management SVI.

**Design comparison:** a multilayer switch could use SVIs and `ip routing` instead of router subinterfaces. This can remove the router trunk bottleneck, but changes the topology and routing responsibilities. Do not configure both designs with duplicate gateway addresses in the same live lab.

## 7. Add a routed branch with static routes

Cable R1 G0/1 to R2 G0/0. Cable R2 G0/1 to the remote PC.

On R1:

```text
configure terminal
interface gigabitethernet 0/1
 description TRANSIT_TO_R2
 ip address 10.44.0.177 255.255.255.252
 no shutdown
exit
ip route 10.44.0.192 255.255.255.224 10.44.0.178
end
```

On R2:

```text
enable
configure terminal
hostname R2
interface gigabitethernet 0/0
 description TRANSIT_TO_R1
 ip address 10.44.0.178 255.255.255.252
 no shutdown
exit
interface gigabitethernet 0/1
 description REMOTE_LAN
 ip address 10.44.0.193 255.255.255.224
 no shutdown
exit
ip route 10.44.0.0 255.255.255.192 10.44.0.177
ip route 10.44.0.64 255.255.255.192 10.44.0.177
ip route 10.44.0.128 255.255.255.224 10.44.0.177
ip route 10.44.0.160 255.255.255.240 10.44.0.177
end
```

Give the remote PC `.194/27` and gateway `.193`. Verify routes in **both** directions. The exact reverse routes make the return path explicit. A broad summary/default route can be valid in other designs, but can also create a loop or black hole if the next-hop design is wrong.

Test the transit neighbor first, then remote gateway, then end-to-end traffic. Use `traceroute` on IOS or `tracert` on a simulated PC to investigate the path. Firewalls and control-plane rate limits can affect traceroute replies even when a service works.

## 8. Replace static routing with single-area OSPF

Save a separate checkpoint. This is an alternative to the static route exercise, not an extra reason for the existing statics to remain. Remove the exact static routes above with `no ip route ...`, using each complete route command.

On R1:

```text
configure terminal
no ip route 10.44.0.192 255.255.255.224 10.44.0.178
router ospf 1
 router-id 1.1.1.1
 passive-interface default
 no passive-interface gigabitethernet 0/1
 network 10.44.0.0 0.0.0.63 area 0
 network 10.44.0.64 0.0.0.63 area 0
 network 10.44.0.128 0.0.0.31 area 0
 network 10.44.0.160 0.0.0.15 area 0
 network 10.44.0.176 0.0.0.3 area 0
end
```

On R2:

```text
configure terminal
no ip route 10.44.0.0 255.255.255.192 10.44.0.177
no ip route 10.44.0.64 255.255.255.192 10.44.0.177
no ip route 10.44.0.128 255.255.255.224 10.44.0.177
no ip route 10.44.0.160 255.255.255.240 10.44.0.177
router ospf 1
 router-id 2.2.2.2
 passive-interface default
 no passive-interface gigabitethernet 0/0
 network 10.44.0.176 0.0.0.3 area 0
 network 10.44.0.192 0.0.0.31 area 0
end
```

The OSPF network statements select matching interfaces; they are not ordinary forwarding routes. The wildcard mask is the inverse of the subnet mask: `/27` has `0.0.0.31`. Passive interfaces advertise their attached networks without forming neighbors there. The transit interfaces are the intended neighbor adjacency.

Verify:

```text
show ip ospf neighbor
show ip ospf interface brief
show ip protocols
show ip route ospf
```

**Expected:** the transit neighbor reaches FULL state. A broadcast Ethernet network can show a FULL/DR or FULL/BDR relationship. R1 learns the remote `/27`; R2 learns the four VLAN networks. Static routes left in place can hide the expected OSPF route because a normal static route has lower administrative distance.

This two-router topology has no alternate routed path. OSPF does not create redundancy without another usable path. For an extension, add a third router, two separate transit subnets and another destination network. Draw all return paths, assign unique router IDs, establish adjacencies and compare route costs before testing link failure.

**Troubleshooting:** check physical state, addressing/subnet, matching area, compatible hello/dead timers, authentication settings, passive status and filtering of OSPF before changing routing statements at random.

### Optional complete routed triangle and failover test

To practise an actual alternate path, use the spare G0/2 interfaces on R1 and R2 and add a third 2911-style router. This extends the **OSPF variant**; retain the existing VLAN/remote LAN design and do not restore the old static routes.

| New link/network | Prefix | First endpoint | Second endpoint |
| --- | --- | --- | --- |
| R1 G0/2 — R3 G0/0 | 10.44.0.180/30 | R1 .181 | R3 .182 |
| R2 G0/2 — R3 G0/1 | 10.44.0.184/30 | R2 .185 | R3 .186 |
| R3 G0/2 — additional test PC | 10.44.0.224/28 | R3 .225 gateway | PC .226 |

These allocations do not overlap the original subnets. Give the additional PC mask `255.255.255.240` and gateway `10.44.0.225`.

On R1:

```text
configure terminal
interface gigabitethernet 0/1
 ip ospf cost 10
exit
interface gigabitethernet 0/2
 description TRANSIT_TO_R3
 ip address 10.44.0.181 255.255.255.252
 ip ospf cost 50
 no shutdown
exit
router ospf 1
 no passive-interface gigabitethernet 0/2
 network 10.44.0.180 0.0.0.3 area 0
end
```

On R2:

```text
configure terminal
interface gigabitethernet 0/0
 ip ospf cost 10
exit
interface gigabitethernet 0/2
 description TRANSIT_TO_R3
 ip address 10.44.0.185 255.255.255.252
 ip ospf cost 10
 no shutdown
exit
router ospf 1
 no passive-interface gigabitethernet 0/2
 network 10.44.0.184 0.0.0.3 area 0
end
```

On R3:

```text
enable
configure terminal
hostname R3
interface gigabitethernet 0/0
 description TRANSIT_TO_R1
 ip address 10.44.0.182 255.255.255.252
 ip ospf cost 50
 no shutdown
exit
interface gigabitethernet 0/1
 description TRANSIT_TO_R2
 ip address 10.44.0.186 255.255.255.252
 ip ospf cost 10
 no shutdown
exit
interface gigabitethernet 0/2
 description ADDITIONAL_TEST_LAN
 ip address 10.44.0.225 255.255.255.240
 no shutdown
exit
router ospf 1
 router-id 3.3.3.3
 passive-interface default
 no passive-interface gigabitethernet 0/0
 no passive-interface gigabitethernet 0/1
 network 10.44.0.180 0.0.0.3 area 0
 network 10.44.0.184 0.0.0.3 area 0
 network 10.44.0.224 0.0.0.15 area 0
end
```

Verify that each router has two FULL neighbors. Explicit costs make the experiment independent of automatic bandwidth-derived cost on the transit links. R1 normally reaches R2's remote LAN over its cost-10 direct link instead of the cost-60 transit path through R3. R1 normally reaches R3's additional LAN through R2 (transit cost 20) instead of the direct cost-50 R1–R3 link. The advertised destination interface cost is added to these transit costs.

Record the current `show ip route` next hops and a trace to both PCs. Shut **only R1 G0/1** through its console. After link detection and OSPF convergence, the remote LAN should be reached through R3 via next hop `.182`. Expect a convergence interval and possible packet loss. Restore the interface with `no shutdown`, verify the adjacency returns and confirm that the lower-cost route is selected again. Do not assume the first trace accurately represents the converged state.

Repeat using loss of R2 G0/2 while the direct R1–R2 link is working: the additional R3 LAN remains reachable over the more expensive R1–R3 link. Draw each path and distinguish link redundancy from failure of R1, which still owns every original VLAN gateway. This design still has single points of failure and is a teaching model rather than a production data centre architecture.

## 9. Apply a limited router ACL and understand its limits

Policy example: users in VLAN 10 may reach a lab web service on server `.70` using TCP 80/443, but may not reach other VLAN 20 hosts, storage VLAN 30 or management VLAN 99. Other destinations remain allowed for this exercise.

On R1:

```text
configure terminal
ip access-list extended USERS_IN
 permit tcp 10.44.0.0 0.0.0.63 host 10.44.0.70 eq 80
 permit tcp 10.44.0.0 0.0.0.63 host 10.44.0.70 eq 443
 deny ip 10.44.0.0 0.0.0.63 10.44.0.64 0.0.0.63
 deny ip 10.44.0.0 0.0.0.63 10.44.0.128 0.0.0.31
 deny ip 10.44.0.0 0.0.0.63 10.44.0.160 0.0.0.15
 permit ip 10.44.0.0 0.0.0.63 any
exit
interface gigabitethernet 0/0.10
 ip access-group USERS_IN in
end
```

Rules are processed in order, first match wins, with an implicit deny at the end. The final permit is intentionally broad for other destinations; it is **not** a production least-privilege policy. The source restriction also drops packets using unexpected sources that fail to match any rule, but this does not replace a complete anti-spoofing design.

Enable the simulated server's web service, then test browser access to `.70`. A ping to `.70` is now supposed to fail: TCP web access is allowed while ICMP is denied. Verify counters with `show access-lists USERS_IN` and the binding/direction with `show ip interface gigabitethernet 0/0.10`.

This is a stateless ingress ACL. It does not track sessions, and devices inside VLAN 10 can communicate locally without passing this routed interface. A TCP `established` ACL keyword checks selected TCP flags; it is not equivalent to a stateful connection table.

**Rollback:** `no ip access-group USERS_IN in` under the same subinterface removes the binding. Confirm access and investigate the rules before deleting the ACL itself.

## 10. Stateful firewall lab with Linux namespaces

This separate topology makes the firewall behaviour observable without depending on a commercial appliance image:

```text
az-client                 az-fw                       az-server
10.60.10.2/24 -- c0 : fwc 10.60.10.1
                         fws 10.60.20.1 : s0 -- 10.60.20.2/24
```

Use a dedicated disposable Linux VM. Do not replace the VM's host firewall or flush its ruleset. The `nft` commands below run only inside `az-fw`. If any of these namespace names already exist, choose different names consistently instead of deleting an unknown namespace.

### Build the topology

Run the following commands one at a time and stop if any command fails. Resolve the failure before continuing. The veth pairs are created inside the newly created lab namespaces, so an existing host interface with a similar name is never moved.

```bash
sudo ip netns add az-client
sudo ip netns add az-fw
sudo ip netns add az-server
sudo ip -n az-client link add c0 type veth peer name fwc
sudo ip -n az-client link set fwc netns az-fw
sudo ip -n az-server link add s0 type veth peer name fws
sudo ip -n az-server link set fws netns az-fw
sudo ip -n az-client addr add 10.60.10.2/24 dev c0
sudo ip -n az-fw addr add 10.60.10.1/24 dev fwc
sudo ip -n az-fw addr add 10.60.20.1/24 dev fws
sudo ip -n az-server addr add 10.60.20.2/24 dev s0
sudo ip -n az-client link set lo up
sudo ip -n az-fw link set lo up
sudo ip -n az-server link set lo up
sudo ip -n az-client link set c0 up
sudo ip -n az-fw link set fwc up
sudo ip -n az-fw link set fws up
sudo ip -n az-server link set s0 up
sudo ip -n az-client route add default via 10.60.10.1
sudo ip -n az-server route add default via 10.60.20.1
sudo ip netns exec az-fw sysctl -w net.ipv4.ip_forward=1
```

Before installing the firewall rules, verify `sudo ip netns exec az-client ping -c 2 10.60.20.2`. If it fails, resolve the routing/interface issue first.

In two additional VM terminals, start these disposable test services and keep the terminals open:

```bash
# Terminal A: the service that will be allowed.
sudo ip netns exec az-server python3 -m http.server 8080 --bind 10.60.20.2
```

```bash
# Terminal B: a working service that will deliberately be blocked.
sudo ip netns exec az-server python3 -m http.server 8081 --bind 10.60.20.2
```

Python's development web server is a lab test service, not a production deployment. Confirm both URLs work from `az-client` before filtering. Using two running services avoids confusing a closed listening port with a firewall denial.

### Define the policy

Allow new client-to-server TCP 8080 sessions. Permit established/related return traffic. Deny other forwarded traffic and unexpected traffic addressed to the firewall itself. This exercise is IPv4 only: the veth endpoints receive no routed IPv6 design and the `inet` policy also defaults to dropping unapproved IPv6 forwarding.

```bash
sudo ip netns exec az-fw nft -f - <<'NFT'
table inet az_lab {
  chain input {
    type filter hook input priority 0; policy drop;
    iifname "lo" accept
    ct state invalid drop
    ct state established,related accept
  }
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state invalid counter drop
    ct state established,related counter accept
    iifname "fwc" oifname "fws" ip saddr 10.60.10.0/24 ip daddr 10.60.20.2 tcp dport 8080 ct state new counter accept
    counter drop
  }
  chain output {
    type filter hook output priority 0; policy accept;
  }
}
NFT
```

Run the load once. A second load of an identical table definition can conflict with or append to existing state depending on what is loaded; inspect it first. To replace this particular lab table, delete only `table inet az_lab` inside `az-fw`, then reload it. Do not issue a host-wide `flush ruleset`.

```bash
sudo ip netns exec az-client curl --noproxy '*' --max-time 3 http://10.60.20.2:8080/
sudo ip netns exec az-client curl --noproxy '*' --max-time 3 http://10.60.20.2:8081/
sudo ip netns exec az-client ping -c 2 -W 1 10.60.20.2
sudo ip netns exec az-fw nft list table inet az_lab
```

`--noproxy '*'` keeps these private lab requests on the direct namespace path even if the VM inherits HTTP proxy variables.

**Expected:** 8080 returns an HTTP directory page; 8081 times out; ICMP echo receives no reply. The explicit drop counter increments for denied traffic. Established replies succeed because the connection tracker recognises the reverse traffic, not because a broad server-to-client allow rule was added.

The input chain protects the firewall's own addresses. The forward chain controls traffic passing through it. Adding an SSH rule only to input would not permit SSH to a server behind it. A router doing no local DNS service should not receive arbitrary DNS queries just because clients need DNS elsewhere.

### Inspect the path

```bash
sudo ip -n az-client route get 10.60.20.2
sudo ip -n az-fw route
sudo ip -n az-fw neigh
sudo ip netns exec az-server ss -lnt
sudo ip netns exec az-fw tcpdump -ni fwc 'tcp port 8080 or tcp port 8081'
```

`route get` should select the client interface and next hop `10.60.10.1`. `ss` should show listeners on both test ports. Capture briefly while repeating a request; stop with Ctrl+C. Do not collect workplace traffic or secrets for this exercise.

A packet capture on the client-side interface can see a denied SYN before it is dropped. Compare server-side `fws` if needed: seeing a frame at an ingress interface is not proof it was forwarded.

### NAT is a separate decision

The namespace networks have working return routes, so they need **no NAT**. Address translation changes addressing; it is not an access-control rule and is not encryption.

For a separate extension with a deliberately created external uplink named `fwout`, a masquerade rule could have the following shape:

```text
table ip az_nat {
  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    oifname "fwout" ip saddr 10.60.10.0/24 masquerade
  }
}
```

Do not apply this fragment to the current two-interface lab: `fwout` does not exist. First design the external subnet, default route, explicit permitted forwarding, source translation and return path. Distinguish source NAT for outbound sessions from destination NAT/port forwarding for an inbound service. A destination NAT mapping alone must not accidentally grant access through the forwarding policy.

### Cleanup

Stop the two Python servers using Ctrl+C in their own terminals and stop packet captures. Exit shells that are still inside a namespace. Then remove only the namespaces created for this exercise:

```bash
sudo ip netns del az-client
sudo ip netns del az-server
sudo ip netns del az-fw
```

The veth interfaces disappear with their namespaces. A namespace can remain alive while a process still holds it, which is why stopping the test services comes first. Confirm `ip netns list` no longer includes the lab names. No host interfaces, host firewall rules or host forwarding setting were changed by this procedure.

## 11. Translate the design to managed switches and firewalls

### NETGEAR managed switches

Use the manual for the exact model and firmware. Unmanaged, smart managed and fully managed families do not expose identical features or syntax. A web UI feature name can differ from its Cisco counterpart.

1. Discover the current management address through the approved local method and back up the configuration.
2. Change credentials and configure a dedicated management VLAN/address with a recovery path.
3. Create VLAN membership. Identify each access port's untagged membership and PVID; confirm that ingress classification and egress tagging agree.
4. Mark uplinks as tagged members of the required VLANs. Match the peer's handling of native/untagged frames.
5. Configure LACP on matching member ports at both ends; inspect the operational bundle.
6. Set supported RSTP/MSTP behaviour deliberately. Do not assume it implements Cisco Rapid PVST+ identically.
7. Limit management services/source networks, configure time/logging and verify access from the authorised admin host.
8. Save persistent configuration and export a fresh backup after verification.

A port in the correct VLAN membership table but with the wrong PVID can still put incoming untagged traffic into the wrong VLAN. Show both settings in your evidence.

### FortiGate and FortiSwitch

FortiOS, hardware switch interfaces, software switches, VDOMs and FortiLink-managed switches have version-specific behaviour. Follow the installed release's administration guide. Do not attach an experimental FortiLink or HA configuration to an operational fabric.

Translate each intended flow into a matrix before using the UI:

| Source zone | Destination | Service | Decision | Verification |
| --- | --- | --- | --- | --- |
| Lab users | Designated web server | HTTPS | Allow | Valid TLS/application response and policy log |
| Lab users | Management subnet | Any | Deny | Failed test plus matching deny observation |
| Admin host | Switch management | SSH/HTTPS as required | Allow | Named account and recorded successful login |
| Application servers | Approved DNS resolvers | UDP/TCP 53 | Allow if required | Query and response, including TCP fallback test |
| Untrusted zone | Internal servers | Unrequested new sessions | Deny | Explicit negative tests |

Then:

1. Back up and record the release, operating mode and administrative recovery method.
2. Define physical/VLAN interfaces, zones and connected addressing from the diagram.
3. Verify routing and return routes; consider asymmetric paths that affect stateful inspection.
4. Define address/service objects with clear ownership and purpose.
5. Add the narrow required policies in the correct order, then verify the platform's default-deny behaviour.
6. Decide explicitly whether NAT belongs on each flow. Internal segmentation often needs routing without translation.
7. Enable suitable allowed/denied traffic logging without exposing sensitive payloads.
8. Test allowed and denied traffic, inspect policy hits and the session view, then save evidence and a rollback point.

FortiSwitch standalone management and FortiLink-managed configuration are different workflows. In a managed deployment, confirm where VLAN/port configuration is controlled before changing the switch directly. A GUI screenshot is not sufficient evidence of forwarding: test the path and inspect counters.

## 12. Linux network troubleshooting reference

Use these commands in a lab VM or the relevant namespace. Some tools/packages have different names between distributions. Read-only observation should come before a disruptive change.

| Question | Linux command | What to look for |
| --- | --- | --- |
| Is the interface present and up? | `ip -br link` | Administrative and link state; virtual NIC attachment |
| Is the address/prefix correct? | `ip -br address` | Correct subnet, duplicate/unexpected addresses |
| Which route will this destination use? | `ip route get 10.44.0.70` | Selected interface, source and next hop |
| Can the next hop resolve at Layer 2? | `ip neigh` | Reachable/stale entries vs repeated failed resolution |
| Is the service listening? | `ss -lntup` | Bind address, port and protocol; elevated rights may reveal process details |
| Is name resolution working? | `getent hosts example.com` | Application-facing resolution, including local policy |
| What did a DNS resolver return? | `dig @<lab-resolver-ip> <lab-name> A` | Response code, answer, server and query time |
| Is HTTPS working? | `curl -v --max-time 5 https://<lab-hostname>/` | DNS, TCP, TLS and HTTP stages; use the lab's trusted CA |
| Is the firewall matching? | `sudo nft list ruleset` | Inspect host rules only when authorised; never flush to diagnose |
| Are packets entering/leaving? | `sudo tcpdump -ni <lab-interface> host <lab-peer-ip>` | Direction, retransmissions and observable handshakes |
| Did the service fail? | `systemctl status <lab-service>` / `journalctl -u <lab-service>` | Status, recent errors, timestamps and relevant logs |

Do not use `curl -k` as the default response to certificate errors. Check hostname, trust chain, validity period and system time. Do not paste verbose output containing tokens into public repositories.

For a failure, record: symptom, affected scope, known working comparison, hypothesis, observation, one controlled change, result and rollback. Distinguish a DNS name failure from an IP routing failure and an HTTP error from a TCP connection failure.

## 13. Controlled fault exercises

Use a saved simulator checkpoint. Introduce one fault at a time and write the expected evidence before testing.

| Injected fault | Likely observation | Confirmatory checks | Recovery |
| --- | --- | --- | --- |
| Server port assigned to VLAN 10 | Server loses its intended gateway path | Access VLAN, host mask/gateway, MAC table | Restore VLAN 20 |
| VLAN 99 omitted from Port-channel1 allowed list | SW2 admin loses the R1 gateway and SW1 management path; its local SW2 management SVI remains reachable | Trunk allowed/active VLANs on both peers | Restore matching VLAN list through console |
| Native VLAN mismatch | Warnings and possible untagged traffic misclassification | Native VLAN at both ends | Restore native 999; inspect allowed list |
| One LACP member shut | Bundle remains usable with reduced member count | EtherChannel flags and interface counters | `no shutdown`, confirm rebundling |
| Both LACP members shut | SW2 becomes isolated from R1/SW1 | Port-channel state and physical member state | Restore at least one valid member |
| Wrong `/24` mask on server | Some destinations work while others fail unexpectedly | Compare exact subnet calculation and route selection | Restore `/26` |
| R2 return route removed in static variant | Outbound request may arrive but reply cannot return | R2 route lookup, captures/trace | Restore exact reverse route |
| OSPF transit interface made passive | Neighbor disappears and learned routes withdraw | Passive list, adjacency, routing table | Restore non-passive transit interface |
| ACL web permit placed after a broader deny | Required web session fails | Ordered ACL and hit counters | Reorder with narrow permits first |
| Firewall allows input instead of forward | Firewall management works, transit service fails | Interface path and relevant chain counters | Correct forward policy |
| Service binds only to loopback | Local request works; network request fails | `ss -lnt`, bind address | Bind intentionally to lab service address |
| Wrong DNS record | IP access works; name points elsewhere | `dig`, resolver used, record/TTL | Correct lab DNS record and observe cache behaviour |

Never resolve an access failure by repeatedly adding broad `permit any` rules without understanding which layer failed. In the simulator, restore the known working checkpoint if the experiment becomes unclear.

## 14. Design extension: resilient, segmented data centre network

Before adding commands, produce a design that answers these questions:

- Which traffic belongs in management, tenant/application, storage and backup networks? Which boundaries require a firewall?
- Where do default gateways live? Which links are Layer 2 and which are routed? Which device owns each IP address?
- What survives a single cable, NIC, power supply, switch, router or firewall failure? Which shared dependencies remain?
- Does the platform support the intended multi-chassis aggregation/stacking? Two independent switches cannot simply share a conventional LACP bundle without an appropriate supported mechanism.
- If using HSRP/VRRP, are the virtual IP, physical IPs, priorities, tracking and upstream paths defined? A first-hop redundancy protocol alone does not guarantee end-to-end reachability.
- Are MTU and encapsulation overhead consistent, especially for storage or overlay traffic? Jumbo frames need end-to-end support, not a single changed port.
- Are optics, fibre type, wavelength, speed, distance and connector polarity compatible? Do not look into a fibre or transceiver; follow the equipment handling procedure.
- Is time synchronised? Where do logs, SNMPv3/telemetry, configuration backups and alerts go? Who reviews failures and configuration drift?
- How will capacity be measured? Separate link speed, aggregate offered load, latency, loss and per-flow throughput.
- How will IPv6 be routed and filtered? Ignoring it does not establish that it is absent.
- Can a new operator recover management access and restore the last approved configuration?

For a design review, include the physical diagram, logical VLAN/subnet map, routing design, flow matrix, management controls, failure matrix, monitoring plan, change sequence, validation and rollback. State simulator limitations and platform dependencies explicitly.

## 15. Completion evidence and reflection

Create your own evidence rather than treating the expected results above as observations:

```text
Lab / date / simulator or OS version:
Starting checkpoint and topology:
Objective and expected required/prohibited flows:
Address plan and calculations:
Commands or changes made:
Observed results and relevant counters:
Fault introduced and explanation:
Recovery and final verification:
Remaining limitations / questions:
Official sources consulted:
What I would improve next time:
```

Explain at least one successful application flow hop by hop, one blocked flow, one failure recovery and one residual single point of failure. Save sanitised configuration snippets rather than passwords or private infrastructure details.

## Official reference starting points

Use the release/model-specific guide linked from these portals; a general portal is a starting point rather than evidence that a particular command exists on every device.

- [Cisco: VLAN trunking concepts and configuration](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-2_1_e/configuration/guide/2960_scg/swvlan.html)
- [Cisco: EtherChannel support and troubleshooting](https://www.cisco.com/c/en/us/support/docs/lan-switching/etherchannel/12023-4.html)
- [Cisco: OSPF design guide](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_iro-cfg-0.html)
- [Cisco: IP access lists](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html)
- [NETGEAR product documentation and support](https://www.netgear.com/support/)
- [Fortinet documentation: select the installed FortiOS/FortiSwitch release](https://docs.fortinet.com/)
- [nftables documentation and examples](https://wiki.nftables.org/)
- [ip-netns manual](https://man7.org/linux/man-pages/man8/ip-netns.8.html)
- [ip-route manual](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [NIST SP 800-41 Rev. 1: firewall policy guidance](https://csrc.nist.gov/pubs/sp/800/41/r1/final)
- [RFC 1918: private IPv4 address space](https://www.rfc-editor.org/rfc/rfc1918)
- [RFC 5737: IPv4 documentation address ranges](https://www.rfc-editor.org/rfc/rfc5737)
