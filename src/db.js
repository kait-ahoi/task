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

module.exports = db;
