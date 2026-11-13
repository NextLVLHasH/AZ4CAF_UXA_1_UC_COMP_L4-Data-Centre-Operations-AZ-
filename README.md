# AZ4CAF_UXA_1_UC_COMP_L4-Data-Centre-Operations-AZ-

Interactive study note and flip-card website for the **AZ4CAF Level 4 Data Centre Operations** programme.

## Coverage

The study content includes all listed programme units:

- Semester 1 (Sep 2026 - Feb 2027):
  - Fundamentals of Computer Science
  - Computer Systems Architecture (A+)
  - Core Networking (CCNA)
  - Applied Networking (CCNA)
- Semester 2 (Feb 2027 - Jul 2027):
  - Operating Systems
  - Core AI
  - Work Based Learning
  - Professional Practice
  - Designing a Computing Project (optional)

It also includes focused notes and flashcards for:

- Switches and switch management (Cisco, Netgear, Fortinet)
- Firewalls
- Fiber networking concepts
- Transferable professional skills and experiential learning context

## Tech stack

- **Backend:** Python (Flask)
- **Database style:** MySQL (`db/schema.sql`, `db/seed.sql`)
- **Frontend:** HTML/CSS/JavaScript (interactive filtering + flip cards)

## Run locally

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. (Optional, for MySQL-backed mode) create and seed the database:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
```

3. Set database environment variables as needed:

```bash
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=az4caf_study
```

4. Start the app:

```bash
python app.py
```

Open `http://127.0.0.1:5000`.

> If MySQL is unavailable, the app serves built-in fallback study notes and flashcards.
