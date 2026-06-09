const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

// Get all notifications for the current user (sorted by recent)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC', [req.user.id]);
    
    // Map integer boolean (0/1) to JavaScript boolean (false/true)
    const notifications = rows.map(row => ({
      ...row,
      isRead: row.isRead === 1
    }));

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving notifications', error: err.message });
  }
});

// Mark all notifications as read for current user
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const result = await db.run('UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0', [req.user.id]);
    res.json({ message: 'All notifications marked as read', count: result.changes });
  } catch (err) {
    res.status(500).json({ message: 'Server error marking notifications read', error: err.message });
  }
});

// Mark single notification as read
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await db.run('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
    const updated = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
    
    res.json({
      ...updated,
      isRead: updated.isRead === 1
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating notification', error: err.message });
  }
});

module.exports = router;
