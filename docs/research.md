# Research sources, findings and verification

**Research checked: 13 November 2026.** This register records a multi-source web review of primary documentation used to improve this study companion. It separates inspected sources from further-reading links and distinguishes documentation review from executing a lab. The examples and explanations are original teaching material; they are not copied assessment answers or reported workplace incidents.

## Method and scope

1. Check the supplied programme outline against the college's published course page.
2. Consult vendor, standards, language and operating-system documentation for important technical claims.
3. Compare the material with the platform and version named in each source. A portal, search snippet or redirect is not confirmation that a particular command exists.
4. Turn findings into bounded explanations, worked examples, exercises and recall questions.
5. Execute suitable local examples and application checks; identify exercises needing unavailable simulators, operating systems or privileged environments.

This is a targeted research review across the programme and the requested extensions. It does not claim that every external link in the inherited repository has been revalidated, that every command was run on vendor hardware, or that the notes cover every current certification objective. Recheck documentation when using a different software release.

## Programme and certification sources

| Inspected source | What it supports | Application and limits |
| --- | --- | --- |
| [HRUC/Uxbridge: AZ4CAF course](https://www.uxbridgecollege.ac.uk/courses/computing-information-technology/level-4-data-centre-operations-az4caf) | The named units, semester dates, optional project, certification support and conditional 14-week placement opportunity. | The programme structure follows this page and the supplied outline. Placement dates from January overlap the listed semester boundaries; an individual placement remains subject to arrangements. |
| [Pearson: Computing for England (2022)](https://qualifications.pearson.com/en/qualifications/btec-higher-nationals/computing-for-england-2022.html) | The published Level 4/5 qualification family and links to its specification. | Background for qualification context. This general landing page does not replace the student's specific HRUC unit brief or establish that every added topic is assessed. |
| [Cisco: CCNA exam overview](https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html) | CCNA is a certification exam covering several networking domains. | Distinguish completing course material from earning certification. |
| [Cisco: 200-301 v1.1 objectives PDF](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf) | A dated exam blueprint including VLANs, LACP, OSPF, ACLs and automation. | Useful topic mapping, with a stated version. **CCNA v7 course content and exam blueprint version numbers describe different things.** Check the blueprint applicable to the intended exam date. |

The HRUC page contains differing timetable/fee presentations in separate sections. This site uses the supplied academic dates and the page's employer-sponsored-course description rather than attempting to resolve a personal timetable or funding entitlement. Confirm administrative arrangements with the college.

CompTIA's certification landing pages could not be retrieved successfully during this research pass. The site therefore retains the supplied description of A+ support and directs learners to the current official objectives, without asserting a newly verified exam series, retirement date or complete exam coverage. Cisco Learning Network's live topics page returned a rendering error; the accessible versioned PDF above was inspected instead. Search-result snippets were not treated as enough evidence for an exam transition date.

## Switching, routing, Linux and firewalls

| Inspected primary source | Supported teaching point | Version or verification boundary |
| --- | --- | --- |
| [Cisco Catalyst 2960 VLAN configuration, IOS 15.2(1)E](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-2_1_e/configuration/guide/2960_scg/swvlan.html) | VLAN membership, access ports, trunking and native-VLAN configuration. | Family/release-specific reference for the IOS-style training examples; simulator features can differ. |
| [Cisco EtherChannel load balance and redundancy](https://www.cisco.com/c/en/us/support/docs/lan-switching/etherchannel/12023-4.html) | Multiple links form a logical channel and traffic distribution depends on the platform's hashing. | Supports the warning that one flow does not ordinarily gain the sum of all member speeds. This article is conceptual, not the lab's complete configuration procedure. |
| [Cisco IP access lists](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html) | Wildcard matching, ordered rules and applying ACLs to the intended traffic direction. | Used for positive/negative flow tests and the distinction between a routed ACL and stateful inspection. |
| [Cisco IOS XE OSPF configuration](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_iro-cfg-0.html) | OSPF configuration, interface participation and verification concepts. | Current IOS XE documentation is not a guarantee of identical syntax on the workbook's simulated older router. The retired design-guide URL redirected to a general list and was replaced. |
| [Ubuntu nftables documentation](https://documentation.ubuntu.com/security/security-features/network/firewall/nftables/) | Netfilter filtering, base-chain hooks and connection-state rules. | The workbook uses a separate namespace forwarding policy; this vendor page's host example must not be pasted over a shared host firewall. |
| [ip-link manual](https://man7.org/linux/man-pages/man8/ip-link.8.html) | Link creation and moving links into named network namespaces. | Used to keep the exercise's veth creation inside lab namespaces and avoid collisions with host interface names. |
| [ip-netns manual](https://man7.org/linux/man-pages/man8/ip-netns.8.html) | Namespace-local network state and namespace/process lifecycle. | Supports the cleanup requirement to stop namespace processes first. These privileged exercises were reviewed, not executed here. |
| [NIST SP 800-41 Rev. 1](https://csrc.nist.gov/pubs/sp/800/41/r1/final) | Firewall policy, selection, deployment and testing principles. | A 2009 foundational publication, not a current product command reference or proof of AI detection accuracy. |

The nftables wiki's connection-state page timed out; Ubuntu's maintained documentation supplied an accessible corroborating reference. The FortiGate release-specific guide returned HTTP 403, so Fortinet/NETGEAR material remains an explicitly model-dependent workflow, not a claim that a portal verified specific commands. Select the installed model and release before attempting vendor exercises.

## AI, agents and true/false decisions

| Inspected primary source | Supported teaching point | Application and limits |
| --- | --- | --- |
| [Google: introduction to LLMs](https://developers.google.com/machine-learning/crash-course/llm) | Language models estimate token sequences using context. | Explains why fluent output and next-token likelihood are different from independent factual verification. |
| [AGENTS.md format](https://agents.md/) | A project guidance convention for coding agents. | Supports setup/test/style guidance. Product support and discovery behaviour still need checking. |
| [OpenAI: AGENTS.md discovery](https://developers.openai.com/codex/guides/agents-md) | Global/project guidance, override filenames, directory order and size limits. | The inspected URL redirected to OpenAI's ChatGPT Learn documentation. The guide keeps discovery tool-specific rather than declaring a universal agent-file rule. |
| [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Direct and indirect injection can alter model behaviour through untrusted input. | Supports layered controls and the warning that retrieval and filtering do not eliminate the problem. |
| [Azure API Management AI gateway](https://learn.microsoft.com/en-us/azure/api-management/genai-gateway-capabilities) | Authentication, authorisation, moderation, routing and governance around AI endpoints. | Gives a concrete example of an AI gateway, distinct from a packet firewall. Features vary by tier and release. |
| [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) | Lifecycle risk management and evaluation of AI systems. | The inspected page notes revision work; RMF 1.0 is identified as a versioned framework, not a guarantee of safe output. |
| [Python truth-value and Boolean operations](https://docs.python.org/3/library/stdtypes.html#truth-value-testing) | Empty/nonempty truth values and the operand-return behaviour of `and`/`or`. | Explains why the text `"false"` must not be accepted as a trusted Boolean policy input. |
| [Google classification metrics](https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall) | Precision, recall, accuracy and threshold-dependent evaluation. | The numerical confusion matrices are independently worked synthetic examples, not measured vendor performance. |

The research-informed distinction is central: **Boolean logic expresses a policy decision; a classifier score expresses a model signal. Neither is an automatic truth detector.** The AI workbook's Python policy demo uses manually supplied synthetic inputs. It has no trained model, no network enforcement and no authority to approve real actions. Unknown/error states pause the simulated protected action rather than silently treating unavailable evidence as permission.

## Databases and programming

| Inspected primary source | Supported teaching point | Boundary |
| --- | --- | --- |
| [Microsoft Access CREATE TABLE](https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/create-table-statement-microsoft-access-sql) | Access-specific DDL and constraints. | The page names Access 2013; verify against the installed Access engine. The SQL was reviewed, not executed on Windows here. |
| [Microsoft Access PARAMETERS](https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/parameters-declaration-microsoft-access-sql) | Typed parameters preceding the query. | Supports the parameter-query example; it does not imply that string concatenation becomes safe in application code. |
| [MongoDB schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/) | Flexible documents can still have field/type/range validation. | A validator does not automatically enforce the lab's real-world rack relationships. |
| [MongoDB security checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/) | Authentication, least privilege and protected communication. | Loopback binding, identity and authorisation are separate controls. |
| [MongoDB mongodump](https://www.mongodb.com/docs/database-tools/mongodump/) and [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/) | Logical export/restore tools and compatibility constraints. | The local lab stops writes and restores to a separate namespace; it does not claim a live dump is automatically consistent across a distributed system. |
| [Python 3.12 csv](https://docs.python.org/3.12/library/csv.html) | CSV parsing with dialect/quoting support. | Used instead of splitting lines on commas. Input schema and semantic validation remain application responsibilities. |
| [Python 3.12 ipaddress](https://docs.python.org/3.12/library/ipaddress.html) | IPv4/IPv6 parsing, host/network checks and strict network validation. | Used to independently check examples; a syntactically valid address does not establish network reachability. |
| [Node.js HTTP](https://nodejs.org/api/http.html) and [global APIs](https://nodejs.org/api/globals.html) | Local HTTP service, fetch and timeout primitives. | Check supported release documentation. The examples run on loopback and are learning services, not production deployment templates. |

## Corrections and checks resulting from review

- Replaced fictional “case study” achievements with explicitly illustrative scenarios.
- Expanded topic summaries into explanations, worked examples, practice tasks and suggested answers.
- Separated current programme facts from supplementary subject coverage and vendor exam requirements.
- Kept switch management, route selection, traffic permission and application health as separate checks.
- Corrected the injected wrong server mask to `/24`; `/26` is the expected server subnet in that lab.
- Clarified that removing VLAN 99 from the inter-switch trunk breaks remote management paths while a same-switch management SVI can remain reachable.
- Kept namespace veth creation local to the new lab namespaces, and bypassed inherited HTTP proxy settings for direct lab traffic tests.
- Made the AI demo reject non-Boolean identity inputs, invalid scores, unavailable scores and threshold-boundary cases explicitly.
- Preserved rich JSON teaching fields when optional database rows override basic content.

## What was verified

Backend tests exercise JSON mode, optional-database failures, rich-field merging, combined filters and API behaviour. Browser checks exercise both Flask and static views, search/empty/error states, navigation, card reveal/rating, local progress persistence/reset and mobile layout. Python calculation examples, the synthetic AI policy demo, the unprivileged Linux archive/restore exercise, and the Python/Node examples were executed with appropriate success/failure checks.

Cisco/Packet Tracer configurations, privileged namespace firewall rules, Windows PowerShell, Microsoft Access and MongoDB server exercises were reviewed but not executed in this environment. A reviewed example's **expected result** is a prediction for the stated lab, not an observation that the lab was run. MySQL query behaviour is covered using mocks; a live MySQL import was not performed.
