CREATE DATABASE IF NOT EXISTS az4caf_study
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE az4caf_study;

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  semester TINYINT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  topic VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  vendor VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  source_title VARCHAR(255) NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  case_study TEXT NOT NULL,
  UNIQUE KEY uq_study_notes_unit_topic (unit_id, topic),
  FOREIGN KEY (unit_id) REFERENCES units(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  UNIQUE KEY uq_flashcards_unit_question (unit_id, question(191)),
  FOREIGN KEY (unit_id) REFERENCES units(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
