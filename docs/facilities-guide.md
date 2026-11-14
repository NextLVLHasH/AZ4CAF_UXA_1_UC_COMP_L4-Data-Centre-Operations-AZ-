# Hardware and facilities: keeping the whole service available

This supplementary workbook connects Computer Systems Architecture with data centre operations, numerical techniques and professional practice. Follow the [study pathway](study-guide.md) and the [practical lab workbook](labs.md) alongside it.

**Learning boundary:** the exercises use diagrams, synthetic readings and calculations. They do not authorise electrical switching, opening power supplies, removing rack feeds, handling batteries, defeating interlocks or changing a live cooling system. Electrical work requires the relevant competence and site authorisation. Report unsafe equipment through the approved process; do not investigate exposed conductors yourself. [HSE electrical-safety guidance](https://www.hse.gov.uk/electricity/faq.htm) supports this competence-based approach.

## 1. Draw the service dependencies first

A server can be healthy while the service is unavailable. Its dependencies include power, cooling, network, storage, identity and the application. Describe the user-facing service before deciding which component to investigate.

A simplified power dependency drawing is:

```text
Utility supply ── switchgear / transfer arrangement ── UPS ── distribution ── rack PDU ── server PSU
                         ↑
                  standby generator

Example A path: UPS A ── distribution A ── rack PDU A ── server PSU A
Example B path: UPS B ── distribution B ── rack PDU B ── server PSU B
```

This is a teaching drawing, not a wiring diagram. Actual arrangements may place transfer, bypass and distribution components differently. Trace an approved single-line diagram and equipment labels rather than inferring independence from the names “A” and “B”.

| Component | Question for an operator | Evidence to request or inspect |
| --- | --- | --- |
| Utility / generator | Which source is available, and what happens during a transition? | Approved power diagram, monitoring state and recent authorised test record |
| UPS | Can it support the required load and bridge the specified interruption? | Both kW/kVA limits, load readings, battery condition, applicable runtime curve |
| Distribution / rack PDU | Which upstream path and capacity limit applies? | Circuit/outlet mapping, measured current, alerts and approved allocation |
| Server PSU | Which feed supplies each PSU, and can one remaining PSU support this server? | Model-specific PSU configuration, health and operating mode |
| Cooling | Is enough heat removal available throughout the event? | Inlet readings, airflow state, cooling dependency and escalation thresholds |

A UPS commonly bridges a short interruption until another source is established or systems shut down in a controlled way. A generator is not an instantaneous substitute for a UPS. Continuing to power IT while required cooling is unavailable is also a dependency problem. Check the complete chain, including maintenance and transition states.

**Recall:** Do two server power cords prove end-to-end resilience? No. Both could lead to the same PDU, circuit, UPS or upstream dependency. A dual-cord arrangement also needs adequate surviving-path capacity.

## 2. Capacity redundancy and path redundancy

Let **N** be the capacity needed for the design load under stated conditions.

- **N:** the required capacity is present, without an additional spare capacity unit in the stated scope.
- **N+1:** one additional capacity unit is available beyond those required. State the unit size and the part of the system being described.
- **2N:** two full-capacity systems are provided in the stated scope. Their independence and distribution paths still need examining.

For an illustrative 120 kW design load using identical 40 kW modules, three modules supply N and four supply N+1. Removing one from four leaves 120 kW. This arithmetic says nothing about a shared downstream breaker, common cooling dependency or whether a component can safely be maintained while the load remains supported.

For two 120 kW paths, each path must be able to support the whole required load when the other is unavailable. Two partially loaded systems do not automatically prove this. Test the reasoning against actual ratings, ambient conditions, derating rules and the approved operating envelope.

ASHRAE explicitly distinguishes additional capacity from a complete maintainable system. Its discussion is why this guide asks learners to name the scope of each redundancy claim. [ASHRAE Handbook 2023, Chapter 20](https://handbook.ashrae.org/Handbooks/A23/SI/A23_Ch20/a23_ch20_si.aspx).

### Failure-domain review

Annotate the dependency drawing with:

1. Shared upstream equipment and common control systems.
2. Shared physical routes vulnerable to the same incident.
3. Capacity remaining after the specified failure.
4. The maintenance state that removes an additional component.
5. Cooling and network dependencies of the same service.
6. The evidence needed to establish successful recovery.

Do not translate N+1 or 2N directly into a guaranteed uptime percentage or an official facility classification. Design, implementation, operation and the scope of a particular standard all matter.

## 3. Watts, volt-amperes, current and energy

Use quantities with units. A number labelled “power” is incomplete if you do not know whether it is real power, apparent power, a nameplate maximum or a measured value.

| Quantity | Meaning | Useful relationship |
| --- | --- | --- |
| W or kW | Real power being used | 1 kW = 1,000 W |
| VA or kVA | Apparent power | For the stated load, W = VA × power factor |
| Power factor | Real power divided by apparent power | PF = W / VA; use a measured or documented value |
| A | Current | For the simplified single-phase example, I = W / (V × PF) |
| kWh | Energy over time | kWh = average kW × hours |
| BTU/h | Heat-transfer rate | 1 W is approximately 3.412 BTU/h |

The single-phase relationship above is not a three-phase circuit design method. Real installations require phase loading, protective devices, cable/connector ratings, inrush, harmonics and applicable electrical requirements to be assessed by competent personnel. Do not assume every IT load has PF = 1.

**Worked example:** a synthetic 4,000 W rack load at PF 0.95 represents approximately 4,210.5 VA. At a stated 230 V single-phase input, that corresponds to approximately 18.31 A. These values describe the exercise's assumptions, not permission to connect the rack to a particular circuit.

A device with two 1,000 W PSUs does not necessarily consume 2,000 W continuously. PSU ratings describe capability; consumption depends on the system and workload. Use appropriate measured load profiles, documented maxima and the site's capacity method rather than simply adding every PSU nameplate.

Check both the W and VA output limits of a UPS. Runtime is a separate selection requirement, dependent on load and the battery system. [Eaton UPS sizing guide](https://www.eaton.com/us/en-us/products/backup-power-ups-surge-it-power-distribution/backup-power-ups/ups-sizing-guide.html).

### A/B load transfer

If a 4 kW load normally shares equally across two feeds, each carries about 2 kW. Losing one path can transfer approximately 4 kW to the survivor for equipment designed to operate that way. Normal readings therefore cannot establish failover capacity alone.

Do not assume perfectly equal sharing or identical PSU efficiency; verify the server's supported power mode. Include single-corded loads and transfer devices separately. [Schneider Electric's rack-powering paper](https://www.se.com/ww/en/download/document/SPD_NRAN-5TDSPN_EN/) identifies feed arrangement, overload and loss of redundancy as related design questions; its landing page is a reference starting point rather than a verified site design.

## 4. Battery runtime and graceful recovery

A simplified energy calculation is useful for checking units:

```text
Illustrative usable battery energy before conversion: 1.2 kWh
Assumed conversion efficiency:                       0.90
Illustrative load:                                   4.0 kW
Idealised supported time: (1.2 × 0.90) / 4.0 = 0.27 h = 16.2 min
```

This is an idealised arithmetic exercise. It is **not** a prediction for an actual UPS. Battery age, temperature, discharge rate, state of charge, internal cutoff behaviour, inverter losses, auxiliary loads and manufacturer test conditions can change runtime. Use the manufacturer curve or validated sizing tool for the exact UPS, battery configuration and load, with the site's required margin.

A recovery plan must also answer:

- How long is available to recognise the event and make a decision?
- Which shutdown sequence preserves application and storage consistency?
- Is cooling available during that interval?
- What if the generator or transfer sequence fails?
- Who authorises the next action, and where are its verification and rollback steps?

Do not trigger a real battery discharge or generator transfer to complete this workbook. Those are site-managed tests with separate competence, planning and authorisation.

## 5. Heat, air movement and environmental readings

Air-cooled equipment draws inlet air through the chassis and exhausts warmer air. Air supplied to a room, air entering a server and air leaving a rack are different measurement locations. A room thermostat can miss a hot inlet at the top of one rack.

| Observation | Possible explanation to investigate | Read-only evidence first |
| --- | --- | --- |
| Top inlet hotter than bottom | Hot-air recirculation or local supply restriction | Compare nearby rack inlet sensors and the airflow arrangement |
| Fan speed rises at similar workload | Higher inlet temperature, obstruction or equipment control response | Correlate inlet, workload and fan trends |
| Cold supply but hot server inlet | Bypass/mixing or airflow path problem | Locate sensors and compare supply-to-inlet measurements |
| One sensor jumps while others stay stable | A local event, sensor placement or sensor fault | Confirm its location, timestamp and independent corroboration |
| Cooling alarm with stable current inlets | A developing dependency loss rather than immediate overheating | Escalate using the approved procedure; monitor trend and redundancy state |

Containment, blanking panels and cable management can help keep supply and exhaust paths separate. Their placement must fit the installed airflow direction; network equipment can have different fan/PSU airflow variants. Unused openings, incorrect covers and missing manufacturer-required blanks can alter cooling performance.

Choose limits from the equipment's environmental class, vendor requirements and approved site operating policy. **Recommended** conditions and **allowable** extremes are different concepts. Do not use an allowable boundary as a universal normal setpoint or copy a temperature number without checking its equipment class and measurement location.

**Heat estimate:** nearly all the electrical power consumed by a conventional IT rack becomes heat in its local environment. The synthetic 4,000 W rack therefore gives an approximate 4 kW sensible heat load, or 13,648 BTU/h. Cooling-system input power and distribution losses are additional facility loads; do not add them twice to the rack's measured IT power.

The [DOE/NREL design guide, revised July 2024](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf) discusses airflow management and infrastructure energy metrics. This exercise uses it to frame measurement and efficiency questions, not to prescribe a temperature change on a live site.

## 6. Hardware diagnosis without guessing a replacement

Start with identity and evidence: asset ID, location, model, firmware, symptoms, timestamps, affected service and recent changes. A warning LED is a clue requiring interpretation, not a complete diagnosis.

A practical sequence is:

1. Confirm impact and distinguish a host failure from an application or network problem.
2. Read approved management logs and the platform's documented status codes.
3. Compare temperature, power, memory and storage alerts with the event timeline.
4. Check exact component identity and the supported configuration.
5. Choose the least disruptive authorised diagnostic step.
6. Define the expected result, stop condition and recovery plan before a change.
7. Record what was actually observed and what remains uncertain.

### Memory and storage distinctions

**ECC memory** detects and, within its supported capabilities, corrects particular error patterns. A corrected-error event is not identical to a crash, but a trend can require investigation. Record DIMM location, count, rate and vendor guidance. Never assume ECC corrects every possible fault or that replacing a DIMM is the first action in every case.

**RAID** can provide particular availability/performance characteristics across drives. It does not preserve a separate historical copy against accidental deletion, corruption, malicious changes or all controller/host/site failures. Match the array's failure tolerance to its actual level and layout; RAID 10 does not guarantee survival of every arbitrary pair of failed drives.

**SMART/predictive alerts** report signals that warrant investigation. An alert is not an exact countdown, and absence of an alert does not guarantee a drive will remain healthy. Dell's current predictive-failure guidance connects error trends with backup, logs and platform-specific action; firmware/reporting behaviour and multiple alerts can require escalation. [Dell PowerEdge predictive drive failure](https://www.dell.com/support/kbdoc/en-us/000126418/poweredge-hdd-what-is-predicted-drive-failure-and-how-to-solve-it?lang=en).

A successful rebuild restores redundancy only within the array's intended operation. Separately check application data, error logs, backups and the cause of the event. A drive's physical slot number, controller identifier and operating-system device name are not automatically interchangeable.

### ESD, handling and service boundaries

Before a permitted hardware exercise, use the exact product service manual and the site's maintenance process. Distinguish a documented hot-plug procedure from work requiring shutdown and isolation; standby power can remain after an OS shutdown.

Use the approved tested ESD system and correct static-safe packaging. Handle components by appropriate edges and avoid contacts. Touching a chassis once is not a complete ESD control. ESD controls protect components; they do not make work on dangerous electrical equipment safe. The inspected [Dell MX7000 service precautions](https://www.dell.com/support/manuals/en-us/poweredge-mx7000/mx7000_fsm/safety-precautions?guid=guid-58747f98-609a-4a19-a64c-bf2cf7c32135&lang=en-us) are product-specific and should not be treated as universal replacement instructions.

## 7. Physical access, inventory and controlled changes

Physical security and accurate records support technical resilience. Verify identity and access authorisation through the site's process, prevent unapproved access, and report a lost badge or suspicious entry promptly. A familiar person or an urgent request does not replace authorisation.

For a synthetic rack inventory, record asset ID, model, serial, rack/unit location, power-feed mapping, network-port mapping, owner and lifecycle status. Store secrets separately. Track removed storage through the approved chain of custody and sanitisation/disposal process; do not carry real data-bearing drives away as coursework evidence.

An equipment move affects more than available rack units. Check load/weight, mounting compatibility, power paths, airflow, cable reach, network identity, documentation and service dependencies. Plan verification before the move and update the record after the actual outcome.

Use a change record that states scope, responsible roles, prerequisites, exact target, expected impact, success checks, stop conditions and recovery. A diagram annotated “B disconnected” is suitable for a desk exercise; physically disconnecting B is a different activity requiring separate authorisation.

## 8. Capacity, availability and recoverability

Capacity is not a single percentage. Space, power, cooling, ports, optics, CPU, memory, storage capacity and I/O can each be the limiting resource. Record units, measurement window, peak/average behaviour and available capacity after the defined failure.

**Availability arithmetic:** in a 365-day year, 99.9% corresponds to 8.76 hours of unavailability; 99.99% corresponds to 52.56 minutes. These are arithmetic budgets, not promises made by a redundancy label. State whether the agreement includes planned maintenance and what service is measured.

**RPO** describes the tolerated data-loss interval relative to the disruption; **RTO** describes the target time to restore the required service. A backup taken hourly does not automatically meet a one-hour RPO if copies fail, are inconsistent or cannot be recovered. A restore of one file does not establish the full service's RTO.

A restore rehearsal should include the application's dependencies, correct recovery point, integrity checks and a usable service test. Document actual timings and exceptions. The [NIST contingency-planning guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) supplies a planning framework; it is a versioned publication, not a site-specific recovery procedure.

**Energy metrics:** compare equal time windows and measurement boundaries. If a fictional month has 3,600 kWh total facility energy and 2,880 kWh IT energy, PUE = 3,600 / 2,880 = 1.25. It does not reveal useful computing output, carbon intensity or whether an individual application is efficient. A monthly exercise value is not an annual PUE claim.

## Desk lab A: size a synthetic rack and test the surviving path

**Goal:** explain power quantities and expose a failure-state capacity constraint.

**Prerequisites:** calculator or Python 3; the synthetic figures below; no equipment access.

| Item | Quantity | Average measured power per item |
| --- | --- | --- |
| Server | 8 | 420 W |
| Switch | 2 | 85 W |
| Storage unit | 1 | 470 W |

Assume the aggregate PF is 0.95 and the single-phase voltage is 230 V. All loads are compatible with dual-feed failover for this exercise. Each feed has a fictional **approved planning allocation of 16 A**. This allocation is a supplied exercise constraint, not a universal electrical rule.

1. Calculate total real power, apparent power and current.
2. Predict normal current per feed with equal sharing, then current on the survivor.
3. Add 20% planned growth. Check a fictional UPS rated at 6,000 VA and 5,400 W against both limits.
4. Calculate 30-day IT energy at the original steady load.
5. Estimate sensible heat in kW and BTU/h.
6. Use the idealised 1.2 kWh / 90% runtime calculation from Section 4, and state why it is insufficient for UPS selection.
7. Write a two-sentence capacity finding identifying the constraint and the evidence needed before a real change.

```python
rack_w = 8 * 420 + 2 * 85 + 470
pf, voltage = 0.95, 230
rack_va = rack_w / pf
survivor_a = rack_w / (voltage * pf)
growth_w = rack_w * 1.20
growth_va = growth_w / pf
assert rack_w == 4000
assert round(rack_va, 1) == 4210.5
assert round(survivor_a, 2) == 18.31
assert growth_w < 5400 and growth_va < 6000
assert survivor_a > 16
assert rack_w / 1000 * 24 * 30 == 2880
print("Rack W / VA:", rack_w, round(rack_va, 1))
print("Normal per-feed A:", round(survivor_a / 2, 2))
print("Surviving-feed A:", round(survivor_a, 2))
print("Growth W / VA:", growth_w, round(growth_va, 1))
print("Heat BTU/h:", rack_w * 3.412)
print("Idealised minutes:", (1.2 * 0.90) / (rack_w / 1000) * 60)
```

**Expected:** 4,000 W; approximately 4,210.5 VA; 9.15 A per normal feed; 18.31 A on the survivor. Growth gives 4,800 W / approximately 5,052.6 VA, below the two example UPS ratings. Nevertheless, the original load already exceeds the supplied 16 A surviving-feed allocation. Passing the UPS checks does not resolve that downstream constraint. Energy is 2,880 kWh and approximate heat is 13,648 BTU/h. Idealised runtime is 16.2 minutes, not a product runtime guarantee.

**Evidence:** calculations with units, the annotated A/B diagram, assumptions, the limiting constraint and a request for the exact approved circuit/UPS/runtime data.

**Troubleshooting:** a result of 4,000 VA confuses W and VA at PF 0.95; 9.15 A as the final failure-state answer omits the transferred load. Do not “fix” the design by changing the stated allocation without supporting engineering approval.

**Cleanup:** remove only the synthetic worksheet/script if desired. Do not change rack cabling or UPS configuration.

## Desk lab B: triage a thermal and hardware alert timeline

**Goal:** distinguish a supported observation from an unproven cause and prepare a useful handover.

**Prerequisites:** the fictional readings below; a blank incident record; no live system access.

| Time UTC | Observation |
| --- | --- |
| 09:00 | Rack LAB-R03 lower/middle/upper inlet readings are 23 / 24 / 30°C. Neighbouring upper inlets are 24–25°C. |
| 09:01 | The R03 upper servers report higher fan speed. Their synthetic workload counters are unchanged. |
| 09:02 | A recent change record says a blanking panel was removed; its final physical position is unverified. |
| 09:03 | R03 upper inlet reads 32°C. No other inlet sensor has a matching increase. |
| 09:04 | One server reports a predictive drive alert. No evidence currently links that alert to the local inlet trend. |
| 09:05 | The service owner reports the application still responds. No recovery test has been performed. |

1. Identify the affected location, trend, current service impact and unknowns.
2. Explain why the room-average temperature and a successful application request cannot dismiss a developing local dependency problem.
3. List three hypotheses and a read-only observation that would help distinguish each. Include sensor validity and airflow arrangement.
4. Identify which exact equipment/environmental policy determines escalation; do not invent a universal 32°C shutdown rule.
5. Separate the drive alert into its own evidence trail unless a supported correlation emerges. Identify the backup/log/model information needed by its owner.
6. Write a factual handover with owner, next update time, outstanding decision and required authorised checks.
7. State what would demonstrate that the event is resolved: stable appropriate inlets, explained cause, verified configuration and service checks over the agreed observation period.

**Suggested answer:** the upper inlet at one rack is rising and corroborated by a fan response, but cause is not established. Possible recirculation after a panel change, another airflow restriction, and a sensor/placement fault each need distinguishing evidence. The predictive drive warning requires prompt platform-specific investigation and backup status review; the timeline alone does not prove heat caused it. Follow the actual site's escalation and service-ownership process.

**Evidence:** a claim/hypothesis table, two short handover updates and explicit unknowns. An entry such as “panel restored successfully” is unacceptable unless that action was authorised and actually observed.

**Troubleshooting:** replacing a drive or changing a cooling setpoint before resolving scope and evidence can introduce another fault. The desk task is complete when the next justified checks and responsible roles are clear, not when an invented cause sounds convincing.

**Cleanup:** retain synthetic records only. No equipment changes are part of this lab.

## Objective checklist

Before leaving this guide, explain or demonstrate:

- The power chain and the difference between a redundant component and an independent path.
- Why the surviving A/B path needs a separate capacity check.
- W, VA, PF, A, kWh and sensible-heat calculations with units and assumptions.
- Why an idealised energy/runtime calculation is not a manufacturer runtime curve.
- Inlet versus supply/exhaust readings, and recommended versus allowable environmental conditions.
- How ESD precautions differ from electrical-safety controls.
- RAID versus backup, corrected memory events and the limits of predictive drive warnings.
- Inventory identity, physical access, change records and storage custody.
- Availability arithmetic, RPO/RTO and the limits of a small restore test.
- A factual handover that separates observation, inference, authorisation and unknowns.

## Research and verification record

Sources below were opened on **13 November 2026**. “Document reviewed” means relevant page content was inspected; it does not mean the described hardware operation was executed. The two desk labs are original synthetic exercises. The calculation script was executed separately and rechecked on **14 November 2026**: all assertions passed, including the 4,000 W rack load, 18.31 A surviving-feed current and 2,880 kWh energy calculation. No electrical, cooling or hardware intervention was performed.

| Source | Inspected scope / version | Status |
| --- | --- | --- |
| [HSE electrical FAQs](https://www.hse.gov.uk/electricity/faq.htm) | Competence, inspection and safe-working boundaries; consult current task-specific guidance | Document reviewed |
| [ASHRAE Handbook Chapter 20](https://handbook.ashrae.org/Handbooks/A23/SI/A23_Ch20/a23_ch20_si.aspx) | 2023 SI handbook; system dependencies and redundancy distinctions | Document reviewed |
| [Eaton UPS sizing](https://www.eaton.com/us/en-us/products/backup-power-ups-surge-it-power-distribution/backup-power-ups/ups-sizing-guide.html) | Capacity versus runtime, load and growth considerations | Document reviewed |
| [Schneider rack-powering options](https://www.se.com/ww/en/download/document/SPD_NRAN-5TDSPN_EN/) | WP29 / SPD_NRAN-5TDSPN_EN, version 8, 13 October 2021 | Landing-page description reviewed; full PDF not inspected |
| [DOE/NREL design guide](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf) | Revised July 2024; airflow and energy-metric sections | PDF reviewed |
| [Dell MX7000 precautions](https://www.dell.com/support/manuals/en-us/poweredge-mx7000/mx7000_fsm/safety-precautions?guid=guid-58747f98-609a-4a19-a64c-bf2cf7c32135&lang=en-us) | Product-specific ESD/service precautions; regional rendering can vary | Document reviewed |
| [Dell predictive drive failure](https://www.dell.com/support/kbdoc/en-us/000126418/poweredge-hdd-what-is-predicted-drive-failure-and-how-to-solve-it?lang=en) | Article 000126418, displayed version 36, modified 7 October 2026 | Document reviewed |
| [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) | Updated November 2010; contingency-planning context | Publication record reviewed |

The general Dell RAID overview could not be retrieved through the research tool and is not marked verified. This guide does not assert that a public handbook or product landing page establishes the configuration, competence or resilience of a particular workplace.
