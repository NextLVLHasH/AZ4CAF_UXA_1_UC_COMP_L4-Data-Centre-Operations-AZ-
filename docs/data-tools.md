# Databases and automation: Access, MongoDB, Python and Node.js

These are supplementary study notes requested for this repository. They support data handling, Operating Systems, Computer Science and practical operations; they are not an assertion that HRUC assesses these specific tools. Here, **Access means Microsoft Access**. For remote access to Linux and network devices, use the SSH and management-network exercises in the [practical lab guide](labs.md).

Use synthetic asset records in the examples. Record the command, expected result, actual result and explanation in your own lab notebook.

## 1. Choose a data model before choosing a tool

| Question | Relational model, including Access | Document model, including MongoDB |
| --- | --- | --- |
| What is a record? | A row with values in defined columns | A BSON document with fields and potentially nested objects/arrays |
| How are relationships represented? | Primary keys and foreign keys; join tables for many-to-many relationships | Embedded documents or references; choose according to access patterns and update boundaries |
| What enforces structure? | Column types, constraints and relationships | Collection validation plus application rules; validation is worth configuring |
| Where does consistency matter? | A foreign key can prevent a device referring to a nonexistent rack | A referenced rack is not automatically checked like a SQL foreign key; the application or a transaction must enforce the intended rule |
| Typical learning exercise | Inventory tables, parameter queries and reports | Flexible device telemetry or inventory documents with indexes |

Neither model automatically provides good backups, good access control or a good schema. MongoDB supports multi-document transactions, but they have costs and do not remove the need to design document boundaries. Access is a desktop database application; use a licensed Windows environment to run it. These notes do not require installing Access on Linux. A shared Access file also has different concurrency, availability and operational characteristics from a managed database server.

**Recall:** Is a device serial number a good relationship key? It can be a useful unique business identifier, but an internal immutable DeviceID avoids tying all relationships to a potentially corrected serial number. Enforce uniqueness on the serial number separately.

## 2. Microsoft Access: a useful asset inventory

### Relationships and integrity

Use a `Rack` table and a `Device` table. One rack can contain many devices; each device belongs to one rack in this exercise. `Rack.RackID` is the primary key. `Device.RackID` is the foreign key, and must have the same underlying integer size as the referenced key. An Access AutoNumber uses Long Integer in this common case, so its corresponding foreign key is a Number with Field Size **Long Integer**.

In a new empty `.accdb` file, create a query, switch to SQL View, and run **each statement separately**. Access does not execute this whole script as one batch in the query designer.

```sql
CREATE TABLE Rack (
    RackID COUNTER CONSTRAINT PK_Rack PRIMARY KEY,
    RackName TEXT(30) NOT NULL,
    LocationName TEXT(80) NOT NULL
);
```

```sql
CREATE UNIQUE INDEX UX_RackName ON Rack (RackName);
```

```sql
CREATE TABLE Device (
    DeviceID COUNTER CONSTRAINT PK_Device PRIMARY KEY,
    SerialNumber TEXT(40) NOT NULL,
    HostName TEXT(63) NOT NULL,
    RackID LONG NOT NULL,
    DeviceStatus TEXT(20) NOT NULL,
    CONSTRAINT FK_Device_Rack FOREIGN KEY (RackID) REFERENCES Rack (RackID)
);
```

```sql
CREATE UNIQUE INDEX UX_DeviceSerial ON Device (SerialNumber);
```

```sql
INSERT INTO Rack (RackName, LocationName) VALUES ('LAB-R01', 'Training room');
```

Look up the generated RackID with `SELECT * FROM Rack;`. The following statements assume it is **1** in this fresh database. Substitute the actual value if different.

```sql
INSERT INTO Device (SerialNumber, HostName, RackID, DeviceStatus)
VALUES ('LAB-01', 'lab-sw01', 1, 'Ready');
```

```sql
INSERT INTO Device (SerialNumber, HostName, RackID, DeviceStatus)
VALUES ('LAB-02', 'lab-fw01', 1, 'Investigate');
```

In the Relationships window, inspect the one-to-many relationship and referential integrity. Attempting to insert a device with a nonexistent RackID should fail. Reusing a SerialNumber should fail. A primary key prevents duplicate row identity; a foreign key prevents an orphan relationship. Neither verifies that someone physically installed the device in that rack.

Do not enable cascading deletes casually: deleting a rack should not silently erase operational history. A status field or archived record is often more suitable. In Table Design, consider validation such as `In ("Ready","Investigate","Retired")` for DeviceStatus and disallow zero-length text where appropriate. `NOT NULL` alone does not impose a useful text format or a list of allowed statuses.

### Queries that answer an operational question

Save this query as `DevicesToInvestigate`:

```sql
SELECT Device.HostName, Device.SerialNumber, Rack.RackName
FROM Rack INNER JOIN Device ON Rack.RackID = Device.RackID
WHERE Device.DeviceStatus = 'Investigate'
ORDER BY Rack.RackName, Device.HostName;
```

Expected: one row, `lab-fw01 | LAB-02 | LAB-R01`.

A parameter query separates the selected value from SQL text. Save this as `DevicesByStatus`:

```sql
PARAMETERS [Target status] Text (20);
SELECT Device.HostName, Device.DeviceStatus
FROM Device
WHERE Device.DeviceStatus = [Target status]
ORDER BY Device.HostName;
```

Enter `Ready` at the prompt. Expected: `lab-sw01 | Ready`. In an application, bind query parameters through its driver; do not build SQL by concatenating user input.

To include empty racks in a count, use a left join and count the child primary key:

```sql
SELECT Rack.RackName, Count(Device.DeviceID) AS DeviceCount
FROM Rack LEFT JOIN Device ON Rack.RackID = Device.RackID
GROUP BY Rack.RackName
ORDER BY Rack.RackName;
```

Expected: `LAB-R01 | 2`. A second rack with no devices should show zero. `Count(*)` counts the retained rack row and would give the wrong result for an empty rack.

**Practical task:** Add a second rack, move LAB-02 to it, and create a report based on `DevicesToInvestigate`. Include HostName, SerialNumber, RackName and an export date. Explain which fields identify a device and which merely describe its current location.

**Check your answer:** Only Device.RackID needs changing; duplicating the device creates competing records. Refresh the query and confirm the new rack name appears. A report layout does not change the underlying data. Keep a backup copy and verify that it opens with its relationships and queries intact; a successful file-copy message alone is not a restore test.

Sources: [Access relationships](https://support.microsoft.com/en-us/office/guide-to-table-relationships-30446197-4fbe-457b-b992-2f6fb812b58f), [Access CREATE TABLE](https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/create-table-statement-microsoft-access-sql), [Access PARAMETERS](https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/parameters-declaration-microsoft-access-sql), [Access SQL data types](https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/sql-data-types).

## 3. MongoDB: documents, indexes and controlled access

### Local lab and document validation

Use a disposable local MongoDB Community instance and `mongosh`, following the official installation instructions for your operating system. Bind the training instance to loopback (`127.0.0.1`), and configure authentication before permitting other hosts to reach it. The examples below run inside `mongosh` as a user permitted to create collections, indexes and documents in `az4caf_lab`.

```javascript
use az4caf_lab

db.createCollection("devices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["serial", "hostname", "status"],
      properties: {
        serial: { bsonType: "string", minLength: 1 },
        hostname: { bsonType: "string", minLength: 1 },
        status: { enum: ["ready", "investigate", "retired"] },
        rack: { bsonType: "string" }
      }
    }
  }
})

db.devices.createIndex({ serial: 1 }, { unique: true })
db.devices.insertMany([
  { serial: "LAB-01", hostname: "lab-sw01", status: "ready", rack: "LAB-R01" },
  { serial: "LAB-02", hostname: "lab-fw01", status: "ready", rack: "LAB-R01" }
])
```

Expected: an acknowledged insert containing two generated IDs. The unique index enforces serial uniqueness. The validator enforces the declared types/statuses, but does not validate DNS names, check a real rack, or forbid additional fields in this example.

MongoDB documents use BSON, which supports more types than JSON. `_id` values commonly use ObjectId; account for this when exporting to JSON rather than assuming every value is a plain string.

### CRUD with a deliberate selector

```javascript
db.devices.find({ status: "ready" }, { _id: 0, serial: 1, hostname: 1 }).sort({ serial: 1 })

db.devices.updateOne(
  { serial: "LAB-02" },
  { $set: { status: "investigate" } }
)

db.devices.find({ status: "investigate" }, { _id: 0 })
```

Expected: the first query returns two records; the update reports one matched and one modified document; the last query returns LAB-02. Repeating the identical update should match one and modify zero because the value is already set.

`updateOne` with `$set` changes named fields. Replacing a document is a different operation and may remove fields you intended to keep. Omitting a selector from a broad update/delete can affect the whole collection. Inspect the matching records and intended scope before a write.

For a deletion exercise, create and remove a separate disposable record:

```javascript
db.devices.insertOne({ serial: "LAB-TEMP", hostname: "lab-temp", status: "retired" })
db.devices.deleteOne({ serial: "LAB-TEMP" })
db.devices.countDocuments({ serial: "LAB-TEMP" })
```

Expected final count: `0`; the two main devices remain.

**Index task:** Create `db.devices.createIndex({ status: 1, hostname: 1 })`, then inspect:

```javascript
db.devices.find({ status: "investigate" }).sort({ hostname: 1 }).explain("executionStats")
```

**Check your answer:** Compare returned rows, examined documents/keys and the winning plan. On two documents, a collection scan may be a sensible planner choice; do not claim a speedup from an index existing. Indexes consume storage and add write work. A compound index's leading fields affect which queries and sorts it can support.

### Authentication, bind addresses and backups

Network binding and authentication solve different problems. Binding determines where a server listens; authentication identifies a connecting user; role-based authorisation controls that user's actions. A firewall further limits which connections can reach the listener. Loopback binding does not replace authentication for a shared or exposed service.

An administrator can create a database-scoped training account with a prompted password:

```javascript
use az4caf_lab
db.createUser({
  user: "az4caf_lab_user",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "az4caf_lab" }]
})
```

Run this through an authenticated administrator session, or follow the documented localhost bootstrap process on a fresh instance. Then enable access control in the appropriate service configuration and reconnect. Do not lock yourself out by enabling authentication without establishing the required administrator accounts.

For a local configuration, the relevant settings are:

```yaml
net:
  bindIp: 127.0.0.1
  port: 27017
security:
  authorization: enabled
```

Restart the local service using your operating system's service manager and verify the effective configuration. From a terminal, connect without putting a password in the command line:

```bash
mongosh --host 127.0.0.1 --port 27017 --username az4caf_lab_user --authenticationDatabase az4caf_lab --password
```

Expected: an authenticated session with access to the lab database. Check an authorised read and confirm an unauthenticated attempt cannot read protected data. Do not paste passwords, connection strings or real asset records into submitted evidence.

For backup practice, an administrator should provision a `backup_operator` account with the appropriate `backup` role and a `restore_operator` with the appropriate `restore` role in `admin`. These commands assume those local accounts exist; both prompt for a password when needed:

```bash
mongodump --host 127.0.0.1 --port 27017 --username backup_operator --authenticationDatabase admin --db az4caf_lab --archive=az4caf-lab.archive.gz --gzip
mongorestore --host 127.0.0.1 --port 27017 --username restore_operator --authenticationDatabase admin --archive=az4caf-lab.archive.gz --gzip --nsFrom='az4caf_lab.*' --nsTo='az4caf_restore.*'
```

Restore into the separate disposable `az4caf_restore` namespace. Have an authorised reader verify document counts, known serials, index definitions and validator configuration against the original. Do not use `--drop` for this exercise. Document the tool/server versions and supported compatibility for the versions being used.

A logical dump taken while writes continue does **not automatically guarantee a consistent point-in-time view across collections**. For this standalone lab, stop application writes before the dump and keep them stopped until it completes. A replica-set backup may require an oplog-based or coordinated snapshot strategy; sharded clusters require a suitable coordinated method. Backup completion, archive integrity and application recovery are separate checks. Practise a restore and measure the time it takes.

**Recall:** Why might an application embed a small set of interface details inside a device document? They may be read together and updated within one document's atomic boundary. Unbounded event history is a poor candidate for an ever-growing embedded array. A single-document write is atomic; a sequence of independent writes is not automatically one atomic transaction.

Sources: [MongoDB installation](https://www.mongodb.com/docs/manual/installation/), [CRUD](https://www.mongodb.com/docs/manual/crud/), [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/), [indexes](https://www.mongodb.com/docs/manual/indexes/), [security checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/), [enable access control](https://www.mongodb.com/docs/manual/tutorial/enable-authentication/), [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/), [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).

## 4. Python: validate inventory before automating changes

### Environment and input contract

Use Python 3 in an isolated project folder. A virtual environment separates this project's installed packages from others; it does not sandbox the script's filesystem or network access.

```bash
python3 -m venv .venv
. .venv/bin/activate
python --version
```

On Windows PowerShell, use `py -m venv .venv`, then `.venv\Scripts\Activate.ps1` according to the machine's execution policy. The following script uses only the Python standard library, so no package installation is required.

Save this as `inventory.csv`:

```csv
serial,hostname,management_ip,status
LAB-01,lab-sw01,192.0.2.10,ready
LAB-02,lab-fw01,192.0.2.20,investigate
```

`192.0.2.0/24` is a documentation address range. These are sample values, not addresses to scan or configure on a live network.

Save as `validate_inventory.py`:

```python
import csv
import ipaddress
import json
import re
import sys
from pathlib import Path

FIELDS = {"serial", "hostname", "management_ip", "status"}
STATUSES = {"ready", "investigate", "retired"}
HOSTNAME = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")


def read_inventory(path):
    devices = []
    seen_serials, seen_hosts, seen_ips = set(), set(), set()
    with path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if len(reader.fieldnames or []) != len(FIELDS) or set(reader.fieldnames or []) != FIELDS:
            raise ValueError("expected headers: serial,hostname,management_ip,status")
        for line, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"line {line}: incorrect number of fields")
            device = {key: value.strip() for key, value in row.items()}
            device["hostname"] = device["hostname"].lower()
            device["status"] = device["status"].lower()
            if not device["serial"] or not HOSTNAME.fullmatch(device["hostname"]):
                raise ValueError(f"line {line}: missing serial or invalid hostname label")
            if device["status"] not in STATUSES:
                raise ValueError(f"line {line}: unrecognised status")
            try:
                device["management_ip"] = str(ipaddress.ip_address(device["management_ip"]))
            except ValueError as error:
                raise ValueError(f"line {line}: invalid IP address") from error
            serial, host, address = device["serial"], device["hostname"], device["management_ip"]
            if serial in seen_serials or host in seen_hosts or address in seen_ips:
                raise ValueError(f"line {line}: duplicate serial, hostname or management IP")
            seen_serials.add(serial)
            seen_hosts.add(host)
            seen_ips.add(address)
            devices.append(device)
    return sorted(devices, key=lambda device: device["serial"])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python validate_inventory.py inventory.csv", file=sys.stderr)
        sys.exit(2)
    try:
        devices = read_inventory(Path(sys.argv[1]))
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"inventory error: {error}", file=sys.stderr)
        sys.exit(1)
    print(json.dumps({"count": len(devices), "devices": devices}, indent=2))
```

Run:

```bash
python validate_inventory.py inventory.csv
```

Expected JSON: `count` is `2`; the `devices` array contains LAB-01 and LAB-02 with their four fields. Exit status is `0`. This validates format and uniqueness according to the exercise's policy; it does not prove a device exists, owns the IP, or is healthy.

To save a report after reviewing the output:

```bash
python validate_inventory.py inventory.csv > inventory.json
```

Shell redirection creates/truncates the output file before the program runs. If validation fails, the report may therefore be empty: check the exit status before consuming it, or write to a temporary file and rename it only on success. A production pipeline should also protect an existing last-known-good report.

**Tasks and expected results:**

1. Change LAB-02's IP to `192.0.2.999`: expect a nonzero exit and `invalid IP address` on stderr.
2. Give both records `lab-sw01`: expect a duplicate error.
3. Change a serial value to `"LAB,03"`, keeping exactly four CSV columns: Python's CSV reader handles quoting; splitting a line on commas by hand would not.
4. Explain why `ipaddress.ip_address()` accepts an address that may be unsuitable for management. Answer: syntactic validity does not establish subnet membership, uniqueness outside this file, reachability, or policy approval.
5. Design a next step that proposes switch changes. Answer: first produce a reviewed plan from validated input; compare against current state, obtain the required change authorisation, apply only the approved differences, verify and retain a rollback. Parsing valid CSV is not authorisation to change infrastructure.

Sources: [venv](https://docs.python.org/3/library/venv.html), [csv](https://docs.python.org/3/library/csv.html), [json](https://docs.python.org/3/library/json.html), [ipaddress](https://docs.python.org/3/library/ipaddress.html), [argparse for larger CLIs](https://docs.python.org/3/library/argparse.html).

## 5. Node.js: a small local health service and report

Choose a **currently supported LTS release** from the [official release schedule](https://nodejs.org/en/about/previous-releases). Check the release's support status when installing; LTS is a support lifecycle, not a promise that every installed dependency is secure. The example uses built-in `fetch` and `AbortSignal.timeout`, available in modern supported releases.

```bash
node --version
npm --version
npm init -y
npm install --package-lock-only
```

The example has no third-party runtime dependencies. For projects that add dependencies, commit `package.json` and `package-lock.json`; use `npm ci` in repeatable automated builds once a valid lockfile exists. A lockfile records resolved dependency versions, but is not a security review. Package installation can execute lifecycle scripts; review the packages and project policy before installing unfamiliar code.

Save this local-only service as `server.mjs`:

```javascript
import { createServer } from 'node:http';

const server = createServer((request, response) => {
  const healthy = request.method === 'GET' && request.url === '/health';
  response.writeHead(healthy ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(healthy
    ? { status: 'ok', service: 'az4caf-lab' }
    : { error: 'not found' }));
});

server.on('error', (error) => {
  console.error(`server error: ${error.code ?? error.name}`);
  process.exitCode = 1;
});
server.listen(8081, '127.0.0.1', () => {
  console.log('Lab health service: http://127.0.0.1:8081/health');
});
process.once('SIGINT', () => server.close());
```

In one terminal, run `node server.mjs`. In a second terminal, run this checker saved as `check-health.mjs`:

```javascript
const endpoint = 'http://127.0.0.1:8081/health';

try {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== 'ok' || typeof result.service !== 'string') {
    throw new Error('unexpected health response');
  }
  console.log(JSON.stringify({ endpoint, healthy: true, service: result.service }));
} catch (error) {
  console.error(JSON.stringify({ endpoint, healthy: false, error: error.message }));
  process.exitCode = 1;
}
```

```bash
node check-health.mjs
```

Expected stdout:

```json
{"endpoint":"http://127.0.0.1:8081/health","healthy":true,"service":"az4caf-lab"}
```

Stop the server with Ctrl+C and repeat the checker. Expected: `healthy:false` on stderr and a nonzero exit status; the precise connection-error message depends on the runtime/OS. A timeout prevents a forgotten request from waiting indefinitely. Rejecting an unsuccessful HTTP status and checking its body avoids treating any reachable web server as healthy.

### What the result proves

The event loop lets Node handle asynchronous I/O while other callbacks wait; `await` suspends the current async flow rather than making CPU-heavy work parallel. Large synchronous loops or filesystem operations can still block other work. Use built-in `node:fs/promises` for asynchronous file operations, and understand worker threads/processes before assigning CPU-heavy tasks.

This health endpoint proves that this local process answered a defined request. It does not test a database, a switch, end-to-end application transactions or redundancy. A real readiness probe should check the dependencies needed to serve traffic and should expose only the information its audience needs.

**Tasks and answers:**

1. Change the checker path to `/missing`: expect HTTP 404, `healthy:false`, nonzero exit.
2. Start two copies of the server: the second should fail to bind the already-used port, typically with `EADDRINUSE`. Diagnose the owning process; do not terminate an unknown service simply to free a port.
3. Does wrapping `fetch()` in `try/catch` automatically treat HTTP 500 as an exception? No. Fetch can resolve successfully with an HTTP error response; check `response.ok` or the status.
4. Why use `.mjs` here? It explicitly selects ECMAScript modules so `import` and top-level `await` work without editing `package.json`'s `type` field.
5. Why bind `127.0.0.1`? Only local clients should reach this learning service. Binding `0.0.0.0` would listen on all IPv4 interfaces and changes who may be able to connect, subject to the network/firewall.

Sources: [Node.js HTTP](https://nodejs.org/api/http.html), [Node.js globals and fetch](https://nodejs.org/api/globals.html), [event loop guidance](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop), [npm ci](https://docs.npmjs.com/cli/commands/npm-ci), [package-lock.json](https://docs.npmjs.com/cli/configuring-npm/package-lock-json).

## 6. Combine the skills into a reviewable operations record

A useful final exercise is a synthetic inventory that links a rack and device identifier to a validated hostname/IP, a change ticket reference and a verification result. Choose Access or MongoDB according to your model, validate imported data with Python, and expose a local synthetic status report with Node.js. Keep input validation, proposed changes, authorisation, execution and verification as distinct steps.

Submit a diagram of the data relationships, the sample input, successful and deliberately failed validation results, an explained database query, and a demonstrated restore. Include a short limitation statement: for example, a local health response does not prove network resilience. Explain the result in your own words and cite the relevant official documentation rather than presenting these illustrative exercises as workplace evidence.
