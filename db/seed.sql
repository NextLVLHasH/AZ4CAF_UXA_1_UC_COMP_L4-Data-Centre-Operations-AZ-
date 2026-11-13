USE az4caf_study;

INSERT IGNORE INTO units (name, semester) VALUES
('Fundamentals of Computer Science', 1),
('Computer Systems Architecture (A+)', 1),
('Core Networking (CCNA)', 1),
('Applied Networking (CCNA)', 1),
('Operating Systems', 2),
('Core AI', 2),
('Work Based Learning', 2),
('Professional Practice', 2),
('Designing a Computing Project (Optional)', 2);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Data Representation and Algorithms', 'computer-science', 'Generic',
'Binary/hex conversion, algorithmic thinking, complexity basics and practical debugging skills.',
'Pearson BTEC Computing Higher Nationals specification',
'https://qualifications.pearson.com/en/qualifications/btec-higher-nationals/computing-for-england-2022.html',
'Case study: students applied algorithm tracing and data conversion to troubleshoot monitoring scripts in lab tasks.'
FROM units WHERE name='Fundamentals of Computer Science'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'CompTIA A+ Hardware and Maintenance', 'hardware', 'CompTIA',
'PC components, fault diagnosis, preventive maintenance and service documentation.',
'CompTIA A+ Core Series certification objectives',
'https://www.comptia.org/certifications/a',
'Case study: standardized diagnostics and maintenance logs reduced repeated hardware incidents during practical sessions.'
FROM units WHERE name='Computer Systems Architecture (A+)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Cisco VLANs, Trunks and STP', 'switching', 'Cisco',
'Configure VLAN segmentation, 802.1Q trunks, and STP variants for resilient switching.',
'Cisco documentation: VLAN and trunk configuration guidance',
'https://www.cisco.com/c/en/us/support/docs/lan-switching/vlan/10023-3.html',
'Case study: splitting management, server, and user VLANs reduced broadcast congestion and improved fault isolation.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Netgear Smart Switch Management', 'switching', 'Netgear',
'Use web/CLI management, monitor ports, apply RSTP, and configure LAG for throughput and resiliency.',
'NETGEAR support and managed switch documentation portal',
'https://www.netgear.com/support/',
'Case study: enabling LAG and RSTP on top-of-rack switches improved redundancy without extra cabling complexity.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Fortinet Switching and Segmentation', 'switching', 'Fortinet',
'Apply FortiSwitch + FortiGate integration, NAC policies and centralized switch lifecycle management.',
'Fortinet official docs: FortiSwitch and FortiLink integration',
'https://docs.fortinet.com/document/fortiswitch/',
'Case study: centralized VLAN/policy rollout through FortiLink reduced configuration drift across multiple racks.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Firewall Fundamentals in Data Centres', 'firewall', 'Multi-vendor',
'Zone policies, ACLs, NAT, logging and change management for secure east-west and north-south traffic.',
'NIST SP 800-41 Rev.1: Guidelines on Firewalls and Firewall Policy',
'https://csrc.nist.gov/publications/detail/sp/800-41/rev-1/final',
'Case study: replacing broad allow rules with zone policies and log review reduced unauthorized lateral movement risk.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Fiber Optic Cabling and Transceivers', 'fiber', 'Generic',
'Compare SMF/MMF, connectors (LC/SC), optics (SFP/SFP+/QSFP), and validate link budget requirements.',
'Cisco transceiver compatibility matrix and optics references',
'https://tmgmatrix.cisco.com/',
'Case study: correcting optic/fiber mismatches and validating budget calculations removed intermittent uplink failures.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Linux/Windows Operational Administration', 'systems', 'Generic',
'Service management, patching, security hardening, backup/restore and troubleshooting workflows.',
'Microsoft Learn: Windows security baselines and hardening guidance',
'https://learn.microsoft.com/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines',
'Case study: introducing planned patch windows and rollback checks improved service stability after updates.'
FROM units WHERE name='Operating Systems'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Core AI for Infrastructure Teams', 'ai', 'Generic',
'Data pipelines, model basics, risk/ethics, and AI-assisted operations in enterprise environments.',
'NIST AI Risk Management Framework (AI RMF 1.0)',
'https://www.nist.gov/itl/ai-risk-management-framework',
'Case study: introducing data-quality checkpoints reduced false alerts in AI-assisted operations dashboards.'
FROM units WHERE name='Core AI'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Work Based Learning Placement', 'professional', 'Amazon',
'14-week experiential learning from Jan 2027 within Amazon Data Centres for real-world operations skills.',
'Course brief provided in repository issue statement',
'https://github.com/NextLVLHasH/AZ4CAF_UXA_1_UC_COMP_L4-Data-Centre-Operations-AZ-',
'Case study: internship rotation plan maps learners through operations, safety, and incident response support tasks.'
FROM units WHERE name='Work Based Learning'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO study_notes (unit_id, topic, category, vendor, content, source_title, source_url, case_study)
SELECT id, 'Professional Practice Skills', 'professional', 'Generic',
'Communication, teamwork, planning, problem solving, IT proficiency and numerical techniques.',
'SFIA Foundation: SFIA skills framework',
'https://sfia-online.org/en/sfia-9',
'Case study: structured shift handover templates improved clarity and reduced missed follow-up actions.'
FROM units WHERE name='Professional Practice'
ON DUPLICATE KEY UPDATE content=VALUES(content), source_title=VALUES(source_title), source_url=VALUES(source_url), case_study=VALUES(case_study);

INSERT INTO flashcards (unit_id, category, question, answer)
SELECT id, 'programme',
'Which units are delivered in semester 1?',
'Fundamentals of Computer Science, Computer Systems Architecture (A+), Core Networking (CCNA), Applied Networking (CCNA).'
FROM units WHERE name='Fundamentals of Computer Science'
ON DUPLICATE KEY UPDATE answer=VALUES(answer);

INSERT INTO flashcards (unit_id, category, question, answer)
SELECT id, 'switching',
'What is the purpose of a trunk port on a switch?',
'It carries traffic for multiple VLANs between network devices, usually tagged with 802.1Q.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE answer=VALUES(answer);

INSERT INTO flashcards (unit_id, category, question, answer)
SELECT id, 'switching',
'How is a FortiSwitch commonly centrally managed?',
'Through FortiLink integration with FortiGate for policy and VLAN orchestration.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE answer=VALUES(answer);

INSERT INTO flashcards (unit_id, category, question, answer)
SELECT id, 'firewall',
'Name two data centre firewall best practices.',
'Least-privilege rules and continuous logging/monitoring with regular rule reviews.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE answer=VALUES(answer);

INSERT INTO flashcards (unit_id, category, question, answer)
SELECT id, 'fiber',
'When should single-mode fiber be preferred?',
'For longer-distance links and high-bandwidth backbone paths with lower attenuation.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE answer=VALUES(answer);
