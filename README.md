# AZ4CAF · Level 4 Data Centre Operations study companion

Detailed revision notes, worked examples, practical workbooks and recall cards for the **HRUC Level 4 Data Centre Operations programme (2026–2027)**. Study in the browser using either the Flask app or the static GitHub Pages version. Both use the same curriculum dataset and shared interface.

This is an independent learning resource, not an official HRUC, Amazon, Pearson, Cisco or CompTIA publication. The unit names and programme dates below follow the supplied programme outline. Learning checklists and exercises are supplementary; your tutor's unit specifications and assessment briefs determine what you must submit. Examples are illustrative, not evidence of real incidents or completed student work.

## Start studying

- [Study and revision guide](docs/study-guide.md): semester pathway, learning checklists, revision routine, evidence and referencing.
- [Practical lab workbook](docs/labs.md): computing, hardware planning, Linux, networking, AI and professional practice exercises.
- [Switches, firewalls and complex networks](docs/network-labs.md): connected Cisco lab, VLANs, trunks, LACP, STP, routing, firewall policies, Linux verification and fault injection.
- [Access, MongoDB, Python and Node.js](docs/data-tools.md): supplementary database and programming notes, local examples and operational use cases.
- [Using AI and understanding AI firewalls](docs/ai-guide.md): prompts, verification, agent files, tool permissions, Boolean policy decisions and probabilistic detection.
- [Research sources and verification](docs/research.md): inspected primary sources, claim mapping, corrections and verification limits.
- [Canonical notes and cards](docs/data/study_content.json): structured source used by both versions.

The browser notebook includes full-text search, unit/semester/category/vendor filters, worked examples, practice prompts, self-check answers, references, read-aloud controls and progress stored in your browser. Flashcard ratings help plan revision; they do not measure qualification or exam readiness. The six guides also have generated HTML versions linked from the notebook, with contents lists and print support.

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

Open <http://127.0.0.1:8000>. GitHub Pages can use **Deploy from a branch → main → /docs** once the changes are merged. This task does not change the repository's hosting settings.

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

Edit `docs/data/study_content.json` for searchable material and `docs/*.md` for the six long-form workbooks. Preserve unit/topic or unit/question identifiers when revising existing material so browser progress remains associated with the same item. Unit names connect notes, cards, filters and metadata.

```bash
python -m pip install -r requirements-dev.txt
python scripts/validate_content.py
python scripts/sync_seed.py
python scripts/build_guides.py
python -m unittest discover -s tests -v
node --check docs/assets/study.js
```

Node.js is needed only for that optional JavaScript syntax check and relevant lab exercises. The Python `Markdown` development dependency generates browsable guide pages; generated guide HTML and SQL seeds are committed so the static site has no build requirement. CI checks content relationships, complete teaching fields, generated-file freshness, backend fallback/filter behaviour and JavaScript syntax.

Shared styles and scripts live in `docs/assets`. `docs/index.html` and `templates/index.html` use the same interface with different asset/data URLs. Flask exposes `/api/content`, `/api/units`, `/api/notes` and `/api/flashcards`; the last two accept `semester`, `unit`, `category`, `vendor` and `q` filters.

## Sources and academic integrity

Notes link to official vendor documentation, standards or recognised technical references. A source supports further study, not a claim that an illustrative scenario occurred. Verify version-specific commands in your simulator or device documentation. Keep a source log and record actual observations, limitations and your own reasoning in assessed work. Do not submit example evidence as your own.
