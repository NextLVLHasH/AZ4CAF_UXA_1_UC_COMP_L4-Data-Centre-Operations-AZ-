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

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Data Representation and Algorithms', 'computer-science', 'Generic',
'Binary/hex conversion, algorithmic thinking, complexity basics and practical debugging skills.'
FROM units WHERE name='Fundamentals of Computer Science'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'CompTIA A+ Hardware and Maintenance', 'hardware', 'CompTIA',
'PC components, fault diagnosis, preventive maintenance and service documentation.'
FROM units WHERE name='Computer Systems Architecture (A+)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Cisco VLANs, Trunks and STP', 'switching', 'Cisco',
'Configure VLAN segmentation, 802.1Q trunks, and STP variants for resilient switching.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Netgear Smart Switch Management', 'switching', 'Netgear',
'Use web/CLI management, monitor ports, apply RSTP, and configure LAG for throughput and resiliency.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Fortinet Switching and Segmentation', 'switching', 'Fortinet',
'Apply FortiSwitch + FortiGate integration, NAC policies and centralized switch lifecycle management.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Firewall Fundamentals in Data Centres', 'firewall', 'Multi-vendor',
'Zone policies, ACLs, NAT, logging and change management for secure east-west and north-south traffic.'
FROM units WHERE name='Applied Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Fiber Optic Cabling and Transceivers', 'fiber', 'Generic',
'Compare SMF/MMF, connectors (LC/SC), optics (SFP/SFP+/QSFP), and validate link budget requirements.'
FROM units WHERE name='Core Networking (CCNA)'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Linux/Windows Operational Administration', 'systems', 'Generic',
'Service management, patching, security hardening, backup/restore and troubleshooting workflows.'
FROM units WHERE name='Operating Systems'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Core AI for Infrastructure Teams', 'ai', 'Generic',
'Data pipelines, model basics, risk/ethics, and AI-assisted operations in enterprise environments.'
FROM units WHERE name='Core AI'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Work Based Learning Placement', 'professional', 'Amazon',
'14-week experiential learning from Jan 2027 within Amazon Data Centres for real-world operations skills.'
FROM units WHERE name='Work Based Learning'
ON DUPLICATE KEY UPDATE content=VALUES(content);

INSERT INTO study_notes (unit_id, topic, category, vendor, content)
SELECT id, 'Professional Practice Skills', 'professional', 'Generic',
'Communication, teamwork, planning, problem solving, IT proficiency and numerical techniques.'
FROM units WHERE name='Professional Practice'
ON DUPLICATE KEY UPDATE content=VALUES(content);

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
