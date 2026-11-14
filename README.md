# AZ4CAF · Level 4 Data Centre Operations study companion

A guided learning workspace with **36 lessons, 104 detailed notes, 124 recall cards, 108 original checkpoint questions, 24 trackable labs, two semester capstones and four interactive practice tools** for the **HRUC Level 4 Data Centre Operations programme (2026–2027)**. Study in the browser using either the Flask app or the static GitHub Pages version. Both use the same curriculum dataset and shared interface.

This is an independent learning resource, not an official HRUC, Amazon, Pearson, Cisco or CompTIA publication. The unit names and programme dates below follow the supplied programme outline. Learning checklists and exercises are supplementary; your tutor's unit specifications and assessment briefs determine what you must submit. Examples are illustrative, not evidence of real incidents or completed student work.

## Start studying

- [Study and revision guide](docs/study-guide.md): semester pathway, learning checklists, revision routine, evidence and referencing.
- [Practical lab workbook](docs/labs.md): computing, hardware planning, Linux, networking, AI and professional practice exercises.
- [Switches, firewalls and complex networks](docs/network-labs.md): connected Cisco lab, VLANs, trunks, LACP, STP, routing, firewall policies, Linux verification and fault injection.
- [Access, MongoDB, Python and Node.js](docs/data-tools.md): supplementary database and programming notes, local examples and operational use cases.
- [Using AI and understanding AI firewalls](docs/ai-guide.md): prompts, verification, agent files, tool permissions, Boolean policy decisions and probabilistic detection.
- [Hardware, power, cooling and resilience](docs/facilities-guide.md): power paths, UPS sizing, airflow, safe servicing and two facilities desk labs.
- [Research sources and verification](docs/research.md): inspected primary sources, claim mapping, corrections and verification limits.
- [Canonical notes and cards](docs/data/study_content.json): structured source used by both versions.

The interface uses dark blue accents and grouped **Learn → Practise → Review** navigation. Start with the next lesson on the Continue dashboard, open its linked notes and cards, follow a lab, then check your understanding. The reference library stays available beneath the workspace.

- **Learning pathway:** at least four ordered lessons per unit, suggested prerequisites, objectives, study time and links to supporting notes/cards/labs. The optional project remains separate.
- **Checkpoints:** ten questions selected from a twelve-question unit bank, including three applied scenarios. Feedback explains each answer and links to notes and sources. A repeat checkpoint prioritises questions absent from the last saved attempt. An 80% result is a personal study milestone, not an official grade or certification result.
- **Recall sessions:** up to ten due/new cards. Successful reviews advance through 1, 3, 7, 14 and 30 calendar days; “practise again” returns to one day. Review any card outside the schedule when useful.
- **Lab notebook:** step checklists, expected results, troubleshooting, cleanup and optional reflections. Completion is self-reported; the browser cannot verify that you ran an external lab.
- **Interactive tools:** subnet/VLSM calculations, a bounded packet-path explorer, editable ordered firewall rules and an AI Boolean/risk/metrics explorer. All use synthetic data and make no infrastructure changes or paid API calls.
- **Search and reading:** search notes, cards and generated guide sections; direct links and retained reading state make it easier to revisit material. Read-aloud controls remain close to the reading area.

The seven long-form guides have generated HTML versions with contents lists and print support.

### Save and transfer your progress

Progress stays in this browser, with no accounts or server upload. **Export progress** downloads a JSON backup including your optional lab reflections. Keep it private. Import validates the entire backup and previews it before you confirm replacement; malformed files leave existing progress intact. Progress from the earlier version migrates automatically using explicit legacy mappings. Unreadable saved data is retained for download rather than silently overwritten.

Clearing browser/site data removes local progress. Export before changing browsers or moving between the Flask and GitHub Pages origins. The stable content IDs preserve records when wording changes; IDs are not qualification evidence.

## Programme map

| Semester | Dates supplied | Units |
| --- | --- | --- |
| 1 | September 2026–February 2027 | Fundamentals of Computer Science; Computer Systems Architecture (A+); Core Networking (CCNA); Applied Networking (CCNA) |
| 2 | February–July 2027 | Operating Systems; Core AI; Work Based Learning; Professional Practice |
| Optional route | Confirm with HRUC | Designing a Computing Project (Pearson-set unit) |

The programme outline states that tuition is free and eligible candidates may have an opportunity for **14 weeks of work experience in Amazon data centres**, with work experience dates **from January 2027**. This can overlap the listed semester dates; confirm your individual timetable, eligibility and placement arrangements with HRUC. A placement is not guaranteed by this resource.

The optional project provides flexibility for students unable to complete work experience and for those considering Level 5 HND study. Confirm the appropriate unit combination and progression requirements with HRUC.

**Certification support:** Cisco CCNA v7 learning is integrated with networking; external professionals support CompTIA A+ alongside Systems Architecture. Course participation and these notes do not award a vendor certification. Use the current vendor exam objectives and tutor guidance to plan separate exam preparation.

## Coverage and practical depth

- **Computing and automation:** binary/hex, algorithms, data structures, Python, testing, Git, Node.js, structured data and database concepts.
- **Hardware and facilities:** CPU/memory, storage and RAID, power calculations, cooling, diagnostics, safe maintenance and availability planning.
- **Networking:** IPv4/VLSM, IPv6, Ethernet, VLANs/trunks, STP, LACP, DHCP/DNS/NTP, static/OSPF routing, ACLs, NAT, monitoring, resilience, fibre and optics.
- **Switches and firewalls:** Cisco IOS setup/verification; NETGEAR and Fortinet model-dependent workflows; stateful filtering, segmentation, management protection and controlled changes.
- **Linux and operating systems:** services/processes, permissions, SSH, filesystems, logs, networking tools, scripting, backups and recovery; Windows administration and identity.
- **AI:** data preparation, baselines, evaluation metrics, leakage, prompting and verification, agent instruction files, prompt injection, tool permissions, Boolean policy rules and AI-assisted firewalls.
- **Professional practice:** communication, teamwork, incident handovers, numerical analysis, planning, reflection, evidence and project work.
- **Databases:** Microsoft Access relational examples and MongoDB document/CRUD/index/security concepts are supplementary learning extensions.

Use isolated VMs, simulators or approved lab equipment. Platform/version prerequisites, verification and cleanup are included with the exercises; simulated configurations are not production change plans. Do not publish credentials, workplace records or confidential placement information as study evidence.

## Run locally

Requires Python 3.10+ (CI uses Python 3.12). No database, MongoDB or Node.js service is needed to run the study companion; these appear as study topics.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000>. JSON mode is the default and includes the entire bundled curriculum. After editing the dataset, restart Flask.

For the static version, serve the `docs` directory (opening `index.html` directly as `file://` will prevent JSON fetching in many browsers):

```bash
python -m http.server 8000 --directory docs
```

Open <http://127.0.0.1:8000>. The repository's existing GitHub Actions Pages workflow builds Jekyll from `./docs` on pushes to `main`; this release uses the same generated static files and hosting configuration.

## Optional MySQL overlay

MySQL is disabled by default. The JSON content is authoritative for rich learning fields; database rows can extend or override the basic unit, note and card fields. Search progress remains browser-local.

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
export MYSQL_ENABLED=1
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=az4caf_reader
export MYSQL_PASSWORD='your-local-password'
export MYSQL_DATABASE=az4caf_study
python app.py
```

Create a suitable local read-only application account separately; the app needs `SELECT` on the three tables. Do not commit credentials. Connection or query failures fall back to bundled content. The static site always uses JSON and cannot display database-only customisations.

The seed is generated from the current JSON, retains custom rows and updates matching rows. On an existing database, legacy sample topics with different names remain; review them separately before removing any custom content.

## Maintain and validate

Edit `docs/data/study_content.json` for units, notes, cards and source records, `docs/data/learning_content.json` for lessons/questions/labs/capstones, and `docs/*.md` for the seven guides. Preserve assigned IDs when wording changes, and retain `legacy_keys` for migration from the earlier browser format. References use stable IDs and are validated for coverage and consistency. Source records distinguish document review from further references and identify applicable versions and dates.

```bash
python -m pip install -r requirements-dev.txt
python scripts/validate_content.py
python scripts/sync_seed.py
python scripts/build_guides.py
python scripts/build_site.py
python -m unittest discover -s tests -v
node --test tests/*.test.js
node --check docs/assets/study.js
python -m playwright install chromium
python -m unittest discover -s tests/browser -v
```

Node.js 24 LTS is used in CI for dependency-free JavaScript logic tests and syntax checks; it is not a runtime requirement for the site. For an existing system Chromium, set `CHROMIUM_EXECUTABLE=/usr/bin/chromium` when running browser tests. The Python `Markdown` development dependency generates browsable guide pages; generated guide HTML and SQL seeds are committed so the static site has no build requirement. CI checks curriculum/path coverage, question integrity, generated-file freshness, backend compatibility, progress migration/import/scheduling, simulation calculations and end-to-end browser journeys on both serving modes.

Shared styles and scripts live in `docs/assets`. `templates/index.html` is the single source for the interface; `scripts/build_site.py` renders `docs/index.html` with Pages URLs. `scripts/build_guides.py` also generates `docs/data/search-index.json` using actual guide heading IDs. Do not edit generated HTML or search entries directly. Flask exposes aggregate `/api/content`, `/api/learning`, `/api/search-index`, `/api/units`, `/api/notes` and `/api/flashcards`; the last two accept `semester`, `unit`, `category`, `vendor` and `q` filters.

## Sources and academic integrity

Notes link to official vendor documentation, standards or recognised technical references. A source supports further study, not a claim that an illustrative scenario occurred. Verify version-specific commands in your simulator or device documentation. Keep a source log and record actual observations, limitations and your own reasoning in assessed work. Do not submit example evidence as your own.
