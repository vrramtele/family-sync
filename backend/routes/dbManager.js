const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const ALLOWED_TABLES = ['users', 'families', 'tasks', 'events', 'notifications'];

// Helper to validate table names and prevent SQL injection
const validateTable = (tableName) => {
  return ALLOWED_TABLES.includes(tableName.toLowerCase());
};

// GET: Retrieve list of all tables
router.get('/tables', authMiddleware, async (req, res) => {
  try {
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    res.json(tables.map(t => t.name));
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving tables', error: err.message });
  }
});

// GET: Retrieve rows of a specific table
router.get('/tables/:table', authMiddleware, async (req, res) => {
  const { table } = req.params;

  if (!validateTable(table)) {
    return res.status(400).json({ message: `Invalid table name: "${table}"` });
  }

  try {
    const rows = await db.all(`SELECT * FROM ${table}`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: `Error retrieving data from table "${table}"`, error: err.message });
  }
});

// POST: Execute custom raw SQL query
router.post('/query', authMiddleware, async (req, res) => {
  const { query, params } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ message: 'SQL query string is required' });
  }

  const startTime = Date.now();
  const trimmedQuery = query.trim();
  const isSelect = trimmedQuery.toUpperCase().startsWith('SELECT') || trimmedQuery.toUpperCase().startsWith('PRAGMA');

  try {
    if (isSelect) {
      const rows = await db.all(trimmedQuery, params || []);
      const executionTime = Date.now() - startTime;
      res.json({
        type: 'select',
        data: rows,
        count: rows.length,
        timeMs: executionTime
      });
    } else {
      const result = await db.run(trimmedQuery, params || []);
      const executionTime = Date.now() - startTime;
      res.json({
        type: 'write',
        result,
        message: 'Query executed successfully',
        changes: result.changes,
        lastInsertId: result.id,
        timeMs: executionTime
      });
    }
  } catch (err) {
    res.status(400).json({
      message: 'SQL Execution Error',
      error: err.message
    });
  }
});

// POST: Add new row to table
router.post('/tables/:table/row', authMiddleware, async (req, res) => {
  const { table } = req.params;
  const rowData = req.body;

  if (!validateTable(table)) {
    return res.status(400).json({ message: 'Invalid table name' });
  }

  const keys = Object.keys(rowData);
  if (keys.length === 0) {
    return res.status(400).json({ message: 'Row data is required' });
  }

  try {
    const columnsStr = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(rowData);

    const sql = `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders})`;
    const result = await db.run(sql, values);

    res.status(201).json({
      message: 'Row inserted successfully',
      id: rowData.id || result.id
    });
  } catch (err) {
    res.status(500).json({ message: 'Error inserting row', error: err.message });
  }
});

// PUT: Update row in table
router.put('/tables/:table/row/:id', authMiddleware, async (req, res) => {
  const { table, id } = req.params;
  const rowData = req.body;

  if (!validateTable(table)) {
    return res.status(400).json({ message: 'Invalid table name' });
  }

  const keys = Object.keys(rowData).filter(k => k !== 'id');
  if (keys.length === 0) {
    return res.status(400).json({ message: 'Row update data is required' });
  }

  try {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => rowData[k]);

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    await db.run(sql, [...values, id]);

    res.json({ message: 'Row updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating row', error: err.message });
  }
});

// DELETE: Delete row in table
router.delete('/tables/:table/row/:id', authMiddleware, async (req, res) => {
  const { table, id } = req.params;

  if (!validateTable(table)) {
    return res.status(400).json({ message: 'Invalid table name' });
  }

  try {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    await db.run(sql, [id]);
    res.json({ message: 'Row deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting row', error: err.message });
  }
});

module.exports = router;
