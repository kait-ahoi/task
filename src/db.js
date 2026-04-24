const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new DatabaseSync(path.join(dataDir, 'registry.db'));

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    country          TEXT NOT NULL CHECK(country IN ('EE','LV','LT','ENG')),
    responsible      TEXT NOT NULL,
    department       TEXT NOT NULL,
    ai_tool          TEXT NOT NULL CHECK(ai_tool IN ('Claude','ChatGPT','Copilot','Gemini','Other')),
    service_provider TEXT,
    status           TEXT NOT NULL CHECK(status IN ('Planning','Development','Pilot','Live','Paused')),
    planned_savings  REAL DEFAULT 0,
    actual_savings   REAL DEFAULT 0,
    start_date       TEXT,
    description      TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migrations
const version = db.prepare('PRAGMA user_version').get().user_version;
if (version < 1) {
  db.exec(`
    BEGIN;
    CREATE TABLE projects_new (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      country          TEXT NOT NULL CHECK(country IN ('EE','LV','LT','ENG')),
      responsible      TEXT NOT NULL,
      department       TEXT NOT NULL,
      ai_tool          TEXT NOT NULL,
      service_provider TEXT,
      status           TEXT NOT NULL CHECK(status IN ('Planning','Development','Pilot','Live','Paused','Valmis')),
      planned_savings  REAL DEFAULT 0,
      actual_savings   REAL DEFAULT 0,
      start_date       TEXT,
      description      TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO projects_new SELECT * FROM projects;
    DROP TABLE projects;
    ALTER TABLE projects_new RENAME TO projects;
    PRAGMA user_version = 1;
    COMMIT;
  `);
}

if (version < 2) {
  db.exec(`
    ALTER TABLE projects ADD COLUMN resources TEXT DEFAULT '';
    PRAGMA user_version = 2;
  `);
}

if (version < 3) {
  db.exec(`
    BEGIN;
    CREATE TABLE projects_new (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      country          TEXT NOT NULL,
      responsible      TEXT NOT NULL,
      department       TEXT NOT NULL,
      ai_tool          TEXT NOT NULL,
      service_provider TEXT,
      status           TEXT NOT NULL CHECK(status IN ('Planning','Development','Pilot','Live','Paused','Valmis')),
      planned_savings  REAL DEFAULT 0,
      actual_savings   REAL DEFAULT 0,
      start_date       TEXT,
      description      TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
      resources        TEXT DEFAULT ''
    );
    INSERT INTO projects_new SELECT * FROM projects;
    DROP TABLE projects;
    ALTER TABLE projects_new RENAME TO projects;
    PRAGMA user_version = 3;
    COMMIT;
  `);
}

module.exports = db;
