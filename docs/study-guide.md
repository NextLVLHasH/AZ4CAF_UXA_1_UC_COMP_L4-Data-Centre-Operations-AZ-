# AZ4CAF study guide: from concepts to operations

[Return to the repository](../README.md) · [Practical labs](labs.md) · [Complex network labs](network-labs.md) · [Access, MongoDB, Python and Node](data-tools.md) · [AI operations guide](ai-guide.md)

Use this guide with the searchable notes and flashcards in the study app. It provides a learning sequence, evidence templates and readiness checks. It is supplementary revision material, not an HRUC assessment brief, a Pearson grading rubric, an Amazon operating procedure or a promise of certification. Your tutor's current unit specification and assessment instructions take priority.

## Programme map

The programme information below comes from the course description supplied for this repository. Confirm current dates, assessment arrangements, placement eligibility and certification arrangements with HRUC.

| Period | Units | Suggested connection to data centre work |
| --- | --- | --- |
| Semester 1: September 2026–February 2027 | Fundamentals of Computer Science; Computer Systems Architecture (A+); Core Networking (CCNA); Applied Networking (CCNA) | Interpret data, diagnose hardware, understand packet paths and practise controlled network changes. |
| Semester 2: February–July 2027 | Operating Systems; Core AI; Work Based Learning; Professional Practice | Administer services, evaluate operational data, collect permitted learning evidence and communicate decisions. |
| Optional route | Designing a Computing Project | A Pearson-set project option for students unable to complete work experience, and for students considering progression to Level 5 HND (RQF) study. Confirm the applicable route and progression conditions with HRUC. |

Eligible students may have the opportunity to undertake a **14-week placement at Amazon data centres, with work experience starting from January 2027**. January overlaps semester 1; do not infer a fixed weekly timetable from the semester headings. A placement is an opportunity subject to eligibility and arrangements, not a guaranteed entitlement.

The supplied programme description identifies Cisco CCNA v7 learning integrated with Core Networking and CompTIA A+ support from external professionals for Computer Systems Architecture. CCNA v7 describes a curriculum; certification exams have their own published objectives, versions, booking rules and fees. Confirm the current exam and what the programme provides before booking. Completion of these notes does not establish exam readiness or an award.

The course is described as free of charge for students. Confirm what is included in any certification or placement arrangement directly with HRUC.

## How to study a topic

Work through five activities for each topic. A reading session alone rarely reveals whether you can apply a concept.

1. **Explain it without notes.** Define the concept and draw the relevant system: a CPU datapath, a subnet, a service dependency or a data pipeline.
2. **Calculate or trace an example.** Show intermediate steps and units. Trace a packet hop by hop; convert a number; calculate usable addresses; distinguish an observation from a hypothesis.
3. **Practise in an isolated lab.** Predict the output, perform the task, collect the actual result and explain any difference. Use [the lab sequence](labs.md).
4. **Diagnose a variation.** Change one controlled variable, such as a mask or file permission. State why the result changed and how you would verify recovery.
5. **Recall it later.** Answer the flashcards before revealing answers. Return to uncertain topics the next day, after a week and after several weeks. These intervals are a practical starting point, not a mandatory schedule.

Suggested weekly pattern, adaptable around taught sessions and work:

| Session | Activity | Deliverable |
| --- | --- | --- |
| First pass, 40–60 minutes | Read one topic group; list unfamiliar terms; build a small diagram. | One page of your own explanation and three questions. |
| Practice, 60–90 minutes | Complete one lab with predictions and verification. | Commands, relevant output, a diagram and a short interpretation. |
| Recall, 20–30 minutes | Answer mixed flashcards without notes; correct misconceptions. | A list of weak topics and why each answer was wrong. |
| Review, 30 minutes | Revisit a previous unit and connect it to the current one. | An explanation of a cross-unit failure or operational trade-off. |

Keep a small error log. For example: “I treated a /27 as 27 host bits; correction: 32−27=5 host bits, 32 addresses, normally 30 usable host addresses.” An error log is useful only when it records the corrected reasoning.

### Extended practical pathways

After the core exercises, use the focused guides to connect several technologies:

- [Complex network labs](network-labs.md): switch setup, VLANs, trunks, routed networks, firewall policy, verification and recovery.
- [Access, MongoDB, Python and Node](data-tools.md): data modelling, queries, application access and reproducible local examples. Treat these as supplementary tools that support the computing units; they are not additional confirmed HRUC units.
- [AI operations guide](ai-guide.md): deeper study of AI use, evaluation, agents and their operational boundaries.
- [Linux access and diagnostics](labs.md#lab-16--linux-access-and-a-read-only-diagnostic-baseline): approved SSH access, identity, permissions and evidence collection.

## Semester 1 learning pathway

### Fundamentals of Computer Science

**Study sequence:** data representation → logic → algorithms → data structures → programming and testing → handling files and structured data.

Be able to:

- Convert decimal, binary and hexadecimal by showing place values; explain why one hexadecimal digit represents four bits.
- Distinguish bits from bytes and decimal capacity units from binary units: 1 GB = 10⁹ bytes; 1 GiB = 2³⁰ bytes. Explain why a device can appear smaller when the display uses a different unit convention.
- Interpret unsigned and two's-complement values for a stated bit width. Explain overflow rather than treating a wrapped value as a valid large positive number.
- Trace Boolean expressions, including AND, OR and NOT; build a truth table and connect the result to an access or monitoring rule.
- Write pseudocode with sequence, selection and iteration. Explain termination and test boundary cases.
- Compare a list, set, dictionary and queue for an inventory or incident-processing task. Explain ordering, duplicate handling and lookup behaviour.
- Explain O(1), O(log n), O(n) and O(n²) as growth models, not exact elapsed times. Identify assumptions such as a sorted input for binary search.
- Parse CSV or JSON; validate required fields; distinguish malformed data from an empty valid result.
- Design tests for normal, boundary and invalid inputs. Handle a failed lookup explicitly rather than silently returning a plausible value.

**Operational application:** a script reconciles an approved asset list with a lab discovery file. A set difference finds missing identifiers; a dictionary maps an identifier to a location. Explain how duplicate identifiers and stale data could produce a wrong conclusion.

**Readiness check:** calculate 0x2F in decimal and binary; explain the behaviour of an empty input list; choose a data structure for detecting duplicate serial numbers; show a test that would expose an off-by-one error.

**Evidence to practise producing:** annotated code, input fixtures, expected and actual results, a complexity explanation, a short note on input validation and limitations. Do not upload real asset inventories.

### Computer Systems Architecture (A+)

**Study sequence:** CPU and memory → motherboards and buses → storage → power and cooling → firmware and boot → virtualisation → troubleshooting and maintenance.

Be able to:

- Explain fetch–decode–execute at an appropriate level, registers, cache and RAM; distinguish CPU utilisation from throughput and latency.
- Explain volatile and non-volatile storage, capacity versus bandwidth, and why a cache hit reduces access time.
- Identify component compatibility constraints from manufacturer documentation: socket, memory generation, capacity, form factor, firmware support and power requirements.
- Compare SATA, SAS and NVMe in context; distinguish a protocol/interface from a drive form factor.
- Calculate raw and usable capacity for a stated RAID layout. Explain tolerated failures and why RAID does not replace an independent, tested backup.
- Trace power supply, motherboard, firmware, boot device, bootloader and OS start-up. Use observable symptoms to narrow a fault domain.
- Explain the purpose of ECC, redundant power supplies and out-of-band management without assuming that redundancy removes the need for monitoring.
- Distinguish physical, virtual and containerised resources. Explain overcommitment and the dependency of virtual machines on their host.
- Calculate power, energy and cost with stated assumptions: W versus Wh, kW versus kWh, and why maximum nameplate power is not a measurement of normal draw.
- Explain airflow and inlet conditions; follow approved ESD, lifting and isolation procedures. Electrical, optical and mechanical work requires local authorisation and training.
- Use a structured diagnostic method: establish the symptom, identify a likely cause, test safely, plan a correction, verify and document.

**Worked relationship:** a 400 W measured load running continuously for 24 hours uses 0.4 kW × 24 h = 9.6 kWh. At an illustrative £0.25/kWh, the energy cost is £2.40. This excludes cooling and other overheads; state this limitation. Do not use an illustrative tariff as a real cost estimate.

**Readiness check:** compare RAID 1 and RAID 5 for four equal drives; explain why a failed redundant PSU can remain a high-priority fault; distinguish a thermal symptom from proof that the fan is defective.

**Evidence to practise producing:** a component compatibility table with source/model/revision, a boot-chain diagram, a non-invasive diagnostic record and a recovery verification checklist.

### Core Networking (CCNA)

**Study sequence:** layered communication → Ethernet and switching → IPv4 subnetting → IPv6 → VLANs and trunks → routing → DHCP/DNS → wireless and security fundamentals.

Be able to:

- Trace an application request through transport, IP and the local link. Identify which addresses change across a routed hop and which normally remain end-to-end.
- Distinguish Ethernet switching based on MAC tables from routing based on destination prefixes. Explain flooding, learning and the role of ARP for IPv4.
- Calculate a subnet's network, broadcast, host range and size. Recognise conventional host-address rules and the special use of /31 and /32.
- Allocate VLSM subnets from largest to smallest and verify that ranges neither overlap nor exceed the parent prefix.
- Explain a default gateway and longest-prefix match. Distinguish a connected route, static route and dynamically learned route.
- Explain IPv6 notation, prefix lengths, link-local addresses and neighbour discovery. Do not apply IPv4 broadcast terminology to IPv6.
- Explain access ports, VLAN separation, 802.1Q trunks, allowed VLAN lists and inter-VLAN routing.
- Explain how STP prevents Layer 2 loops; identify the need for consistent edge-port protection and an intentional root bridge design.
- Compare single-mode and multimode fibre, wavelengths, connectors, transceiver compatibility and link-budget assumptions. Never look into a fibre end or use an unapproved optic.
- Separate a name-resolution problem from a reachability problem. Explain the DHCP address, mask/prefix, gateway and DNS information a host needs.
- Explain TCP reliability and UDP use cases without saying “UDP is always faster” or “TCP guarantees application success.”

**Worked subnet:** 192.0.2.77/27 has mask 255.255.255.224 and a block size of 32. The containing block starts at 64, so the network is 192.0.2.64, broadcast 192.0.2.95 and conventional host range .65–.94. There are 32 addresses and normally 30 host addresses. The 192.0.2.0/24 range is reserved for documentation; lab connectivity must stay inside the simulator or isolated environment.

**Readiness check:** explain a same-VLAN and different-VLAN packet path; calculate three differently sized non-overlapping subnets; predict the effect of a wrong gateway; explain why a switch can have a management IP without routing user traffic.

**Evidence to practise producing:** an address plan, labelled logical and physical diagrams, relevant `show` output, predicted packet paths and verification of both allowed and denied communication.

### Applied Networking (CCNA)

**Study sequence:** baseline configuration → verification → routing and resilience → access policies → monitoring → controlled change → troubleshooting.

Be able to:

- Build a small simulated topology from an address and port plan. Apply descriptions and capture the configuration before changing it.
- Verify VLAN membership, trunks, STP state, interface errors and routing before assuming an application is faulty.
- Explain link aggregation: multiple links can share traffic across flows, but one flow is generally limited to one member link. Check the platform's actual hashing and protocol behaviour.
- Explain static routes and single-area OSPF at the appropriate course level; recognise neighbour, area, mask and interface-state faults.
- Trace ACL processing, direction and implicit deny. Prove that required traffic passes and prohibited traffic is blocked.
- Distinguish stateful firewall policy, stateless ACLs and NAT. NAT alone is not a security policy.
- Interpret counters and logs with timestamps and scope; distinguish total counts from rates and a normal baseline from an unexplained deviation.
- Explain management-plane protection, SSH, role-based access, backups and approved firmware lifecycle work.
- Compare Cisco, Netgear and Fortinet features using the exact model and software documentation. Never assume CLI syntax or licence availability transfers between products.
- Prepare a change record with impact, dependencies, verification, rollback conditions and a named decision owner.

**Operational application:** a newly provisioned server cannot reach a service. Test link state, VLAN, addressing, gateway, route, policy, transport port and service in sequence. Record the last known working point. A successful ping is one observation, not proof that the required application works.

**Readiness check:** design a verification plan before entering commands; diagnose a trunk missing a VLAN; explain a route that wins by longest-prefix match; write rollback criteria that are measurable.

**Evidence to practise producing:** before/after configuration extracts, a test matrix, a fault timeline, a rollback plan and an explanation of remaining uncertainty.

## Semester 2 learning pathway

### Operating Systems

**Study sequence:** processes and memory → filesystems and permissions → users and services → networking and logs → patching → backup and recovery → automation.

Be able to:

- Distinguish a program, process, thread and service; describe scheduling and virtual memory without assuming that high RAM use always means a fault.
- Explain users, groups, least privilege, Linux permission bits and Windows access control at the relevant platform level.
- Interpret filesystem paths, ownership, free space, inode usage and mount points. Distinguish filesystem capacity from the underlying storage arrangement.
- Use read-only diagnostics to inspect CPU, memory, disk, processes, services, routes, sockets and logs. Explain the meaning of each selected output field.
- Separate a service being installed, enabled, running and reachable. Identify dependency and configuration failures.
- Explain patch testing, maintenance windows, backups and recovery verification. Define the difference between a backup existing and a restore being proven.
- Explain RPO (acceptable data loss measured in time) and RTO (target time to restore service). State what is included in any measurement.
- Write small scripts with validation, meaningful errors and logs; avoid embedding passwords and tokens.
- Explain the difference between authentication, authorisation and auditing. Use individual approved accounts rather than shared credentials.

**Readiness check:** investigate “service running but inaccessible”; explain `640` permissions; recover a disposable file from a lab backup; distinguish a process listening only on loopback from an externally reachable service.

**Evidence to practise producing:** a reproducible command sequence, an interpreted log extract, a service dependency diagram and a measured recovery exercise using disposable data.

### Core AI

**Study sequence:** problem framing → data preparation → model concepts → evaluation → operational use → risk and governance.

Be able to:

- Distinguish supervised, unsupervised and reinforcement learning; separate a trained model from deterministic rule-based automation.
- Define a prediction target and a baseline before choosing a model. Explain when a simple threshold or manual review may be adequate.
- Identify missing values, duplicates, class imbalance and label quality issues in operational data.
- Separate training, validation and test data. Use time-aware splits when future data must not influence earlier predictions.
- Explain data leakage with a concrete example, such as including a post-incident resolution field in an incident prediction model.
- Calculate TP, FP, FN and TN; derive precision, recall and accuracy; explain why high accuracy can conceal rare-fault detection failure.
- Discuss the operational cost of false positives and false negatives. Threshold choice is a decision about impact, not just a mathematical score.
- Distinguish correlation from causation and prediction from a verified diagnosis.
- Explain drift, monitoring, review and rollback. An initially good score does not establish continuing reliability.
- Treat generated text and commands as unverified suggestions. Check authoritative sources and obtain normal change authorisation before any operational action.
- Describe privacy, confidentiality, access control, bias and accountability. Use synthetic or expressly approved data for learning.

**Worked metrics:** with TP=8, FP=2, FN=4 and TN=86, precision is 8/(8+2)=80%, recall is 8/(8+4)=66.7% and accuracy is (8+86)/100=94%. The 94% accuracy does not cancel the four missed positive cases. Explain whether missing those cases is acceptable for the intended use.

**Readiness check:** detect leakage in a dataset plan; compare a model to an always-negative baseline; explain why an AI-generated incident summary needs verification; propose a meaningful human review boundary.

**Evidence to practise producing:** a data dictionary, split strategy, baseline, confusion matrix, limitations and an approval/review plan. Do not claim model performance on data you did not evaluate.

### Work Based Learning

**Study sequence:** induction and scope → observation → supervised practice → evidence review → reflection and development planning.

Be able to:

- Explain your authorised role, supervision arrangements and escalation route. Ask when a task exceeds training or permission.
- Follow site-specific access, safety, confidentiality and change procedures. This repository does not authorise production access or maintenance.
- Record what you observed, what you performed, what someone else performed and what remains uncertain as separate statements.
- Connect an experience to taught concepts using a reasoned explanation, not only a diary of activities.
- Maintain a factual learning log with dates, approved evidence references, feedback and a next action.
- Remove confidential details before using workplace material in academic work. Anonymisation needs employer and tutor guidance; deleting a name alone may be insufficient.
- Reflect on an outcome and explain what you would repeat or change. Include supervision and limitations honestly.

**Readiness check:** draft a learning objective with observable evidence; explain how to escalate an unfamiliar alarm; turn an observation into a reflection without inventing hands-on work.

**Evidence to practise producing:** an approved learning agreement, a redacted activity log, supervisor feedback where permitted and a skills-development review. Placement availability and evidence acceptance must be confirmed with HRUC and the host organisation.

### Professional Practice

**Study sequence:** communication → teamwork → planning → problem solving → ethics → reflective development.

Be able to:

- Write an incident update that states impact, evidence, actions, current owner and next update time.
- Produce a handover another person can act on without relying on an informal conversation.
- Separate fact, hypothesis, recommendation and decision. State confidence and missing information when relevant.
- Plan work with dependencies, owners, milestones, risks and contingency. Explain why a deadline or estimate changed.
- Compare options using explicit criteria: safety, service impact, time, cost, maintainability and evidence quality.
- Listen, ask focused questions and give constructive feedback. Record decisions and responsibilities accurately.
- Cite sources, paraphrase accurately and distinguish your own evidence from a published example.
- Explain professional conduct, accessibility, privacy and responsible handling of information.

**Readiness check:** write a 100-word incident update for a non-specialist reader; create a dependency-aware plan; evaluate a failed team decision without assigning unsupported blame.

**Evidence to practise producing:** a stakeholder map, meeting decisions, a plan with changes explained, a risk register and a reflection linked to observable outcomes.

### Designing a Computing Project: optional route

Use the current **Pearson-set theme and tutor-approved brief**. The following is a practice framework, not a substitute brief or a completed submission.

Be able to:

- Define a research question, intended users, constraints and measurable success criteria.
- Review credible sources and record where each claim comes from.
- Choose a proportionate method for collecting and analysing permitted data.
- Plan milestones, resources, risks, ethical issues and dependencies.
- Build or investigate only within the approved scope and retain reproducible evidence.
- Evaluate against the original success criteria, including unsuccessful results and limitations.
- Explain changes in scope and what future work would address.

A suitable **practice idea**, subject to approval, is a local synthetic incident-log dashboard: ingest a supplied CSV, validate records, calculate counts and durations, and present an accessible summary. It can connect programming, data interpretation and professional communication without requiring access to workplace systems.

## Cross-unit operational reasoning

Use a fault-domain map to organise troubleshooting:

| Layer or dependency | Questions | Possible lab evidence |
| --- | --- | --- |
| Physical and power | Is equipment powered? Is there a link? Is an approved component compatible? | Simulator state or manufacturer specifications; permitted inventory. |
| Link and VLAN | Are ports in the correct VLAN? Does a trunk carry it? Is a loop being prevented? | VLAN, trunk, MAC table and STP outputs. |
| Addressing and routing | Are prefix and gateway correct? Which route matches? Is the return path valid? | Address plan, route tables and hop-by-hop tests. |
| Policy and transport | Does policy permit this direction and port? Is a process listening? | ACL test matrix, counters and local socket listing. |
| Service and OS | Is the service healthy? Does it depend on DNS, storage or another service? | Logs, service state and a direct local request. |
| Data and human process | Is the input current? Is the change approved? Has the handover reached the next owner? | Validated fixtures, change plan and handover record. |

Do not change every layer at once. A useful hypothesis predicts an observable result: “If VLAN 20 is missing from the trunk, adding it in the simulator should restore gateway reachability from PC-B while PC-A remains reachable.” Collect the relevant before/after result and check for side effects.

## Reusable evidence templates

### Lab record

```text
Title and date:
Unit and learning goal:
Environment: simulator/VM/tool version, topology, disposable data
Scope and permissions:
Prediction and explanation:
Inputs and starting state:
Actions: numbered commands or GUI steps
Expected result:
Actual result: concise output or screenshot reference
Interpretation: why the result supports or rejects the prediction
Limitations: what this test does not establish
Recovery/cleanup and verification:
Sources: title, organisation, URL, revision/date if available, access date
Next question or improvement:
```

### Change plan for a lab

```text
Purpose and success criteria:
Affected components and dependencies:
Risk and expected impact:
Prerequisites and pre-change backup:
Implementation steps:
Verification: positive and negative tests, expected outputs
Rollback trigger: measurable condition or time limit
Rollback steps and verification:
Decision owner and communication plan:
Actual outcome and lessons:
```

### Incident update and handover

```text
Reference and UTC timestamp:
Impact: affected function, scope, start time, known exclusions
Facts: observations with timestamps and evidence references
Current hypothesis: explicitly labelled, with proposed test
Actions completed and results:
Current state and remaining risk:
Next action, named owner and next update time:
Escalation/decision needed:
```

### Placement reflection

```text
Date and approved learning objective:
Context: anonymised only as authorised
My role: observed / assisted / performed under supervision
What happened: factual account
Evidence reference: permitted location, not confidential content
Connection to taught concepts:
Feedback received:
What went well and why:
What I would change and why:
Next development action and review date:
```

### Source and claim record

```text
Claim or technical decision:
Source title and publishing organisation:
Exact URL and document/software revision:
Section/page or heading:
Date accessed:
What the source actually supports:
My interpretation and any uncertainty:
Related evidence I collected myself:
```

A vendor guide can support a statement about a feature; it does not prove you configured or tested it. An illustrative scenario is not a real case study result. Use your own lab output or approved workplace evidence for claims about what you did.

## Revision checkpoints

Use these as readiness reviews, not a replacement timetable or grading scheme.

1. **After the foundations:** explain binary/hex, a CPU–memory relationship, a layered packet path and a simple diagnostic sequence without notes.
2. **Before complex network labs:** calculate subnets accurately, label every interface, predict VLAN boundaries and state the intended communication policy.
3. **Before placement or a project:** confirm scope and permissions, agree learning objectives, prepare a factual evidence log and practise a concise handover.
4. **During semester 2:** connect an OS symptom to network and hardware dependencies; evaluate an AI result using a baseline and operational impact.
5. **Before an assessment or certification:** work from the current tutor brief or official exam objectives, identify gaps, practise under realistic conditions and explain the reasoning behind answers.

For each checkpoint use a simple personal scale: **can explain**, **can perform with notes**, **can perform independently in a lab**, **can diagnose a variation**. This is a study aid; it does not map to Pearson pass/merit/distinction criteria.

## Authoritative starting references

Prefer the document for the exact device, OS and software version you use. These links are starting points; source availability and document locations can change.

- [HRUC](https://www.hruc.ac.uk/) — confirm programme, timetable and placement arrangements directly with the institution.
- [Pearson Higher Nationals in Computing for England](https://qualifications.pearson.com/en/qualifications/btec-higher-nationals/computing-for-england-2022.html) — consult the applicable specification and tutor-supplied unit/assessment documents.
- [Cisco CCNA](https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html) and [Cisco learning resources](https://www.netacad.com/) — check current curriculum and exam information.
- [CompTIA A+](https://www.comptia.org/certifications/a) — obtain current objectives for the exam version you intend to take.
- [Cisco technical support documentation](https://www.cisco.com/c/en/us/support/index.html), [NETGEAR support](https://www.netgear.com/support/) and [Fortinet documentation](https://docs.fortinet.com/) — use model- and release-specific configuration guides.
- [RFC 1918: private IPv4 addresses](https://www.rfc-editor.org/rfc/rfc1918), [RFC 5737: documentation IPv4 addresses](https://www.rfc-editor.org/rfc/rfc5737) and [RFC 3849: documentation IPv6 prefix](https://www.rfc-editor.org/rfc/rfc3849) — distinguish lab addressing from addresses intended for public routing.
- [RFC 8200: IPv6](https://www.rfc-editor.org/rfc/rfc8200) and [RFC 4861: neighbour discovery](https://www.rfc-editor.org/rfc/rfc4861) — protocol references for deeper study.
- [Python tutorial](https://docs.python.org/3/tutorial/), [Python `ipaddress`](https://docs.python.org/3/library/ipaddress.html) and [Python `unittest`](https://docs.python.org/3/library/unittest.html) — reproducible programming and calculation exercises.
- [Ubuntu Server documentation](https://documentation.ubuntu.com/server/), [systemd manuals](https://www.freedesktop.org/software/systemd/man/latest/) and [Microsoft Learn for Windows](https://learn.microsoft.com/windows/) — operating-system administration references.
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) — structured thinking about AI risk, evaluation and governance.
- [NIST firewall policy guidance, SP 800-41 Rev. 1](https://csrc.nist.gov/pubs/sp/800/41/r1/final) — firewall concepts; combine it with current platform documentation and policy.
- [UK National Cyber Security Centre guidance](https://www.ncsc.gov.uk/section/advice-guidance/all-topics) and [Information Commissioner's Office](https://ico.org.uk/) — security and data-protection guidance relevant to handling information.

Record an access date when you actually consult a source. This repository does not imply every external page has been checked against the latest academic or certification requirement.
