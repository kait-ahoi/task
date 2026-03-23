const express = require('express');
const router = express.Router();
const db = require('../db');
const requirePin = require('../middleware/adminPin');

const VALID_COUNTRIES = ['EE', 'LV', 'LT', 'ENG'];
const VALID_STATUSES = ['Planning', 'Development', 'Pilot', 'Live', 'Paused', 'Valmis'];

// GET /api/projects
router.get('/', (req, res) => {
  const { country, status, ai_tool } = req.query;
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params = [];

  if (country && VALID_COUNTRIES.includes(country)) {
    sql += ' AND country = ?';
    params.push(country);
  }
  if (status && VALID_STATUSES.includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (ai_tool) {
    sql += ' AND ai_tool = ?';
    params.push(ai_tool);
  }

  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, country, responsible, department, ai_tool, service_provider, status, planned_savings, actual_savings, start_date, description, resources } = req.body;

  if (!name || !country || !responsible || !department || !ai_tool || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!VALID_COUNTRIES.includes(country)) return res.status(400).json({ error: 'Invalid country' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const stmt = db.prepare(`
    INSERT INTO projects (name, country, responsible, department, ai_tool, service_provider, status, planned_savings, actual_savings, start_date, description, resources)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, country, responsible, department, ai_tool, service_provider || '', status, planned_savings || 0, actual_savings || 0, start_date || null, description || '', resources || '');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', requirePin, (req, res) => {
  const { name, country, responsible, department, ai_tool, service_provider, status, planned_savings, actual_savings, start_date, description, resources } = req.body;

  if (!name || !country || !responsible || !department || !ai_tool || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!VALID_COUNTRIES.includes(country)) return res.status(400).json({ error: 'Invalid country' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE projects SET
      name=?, country=?, responsible=?, department=?, ai_tool=?, service_provider=?,
      status=?, planned_savings=?, actual_savings=?, start_date=?, description=?, resources=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(name, country, responsible, department, ai_tool, service_provider || '', status, planned_savings || 0, actual_savings || 0, start_date || null, description || '', resources || '', req.params.id);

  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

// DELETE /api/projects/:id
router.delete('/:id', requirePin, (req, res) => {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
