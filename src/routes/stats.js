const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const totals = db.prepare(`
    SELECT COUNT(*) as totalProjects,
           COALESCE(SUM(planned_savings), 0) as totalPlannedSavings,
           COALESCE(SUM(actual_savings), 0) as totalActualSavings
    FROM projects
  `).get();

  const byStatus = {};
  db.prepare('SELECT status, COUNT(*) as cnt FROM projects GROUP BY status').all()
    .forEach(r => { byStatus[r.status] = r.cnt; });

  const byAiTool = {};
  db.prepare('SELECT ai_tool, COUNT(*) as cnt FROM projects GROUP BY ai_tool').all()
    .forEach(r => { byAiTool[r.ai_tool] = r.cnt; });

  const byCountry = {};
  db.prepare('SELECT country, COUNT(*) as cnt FROM projects GROUP BY country').all()
    .forEach(r => { byCountry[r.country] = r.cnt; });

  res.json({ ...totals, byStatus, byAiTool, byCountry });
});

module.exports = router;
