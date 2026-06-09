const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

// Generate UUID-like strings
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// GET all messages for the authenticated user's family
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userRecord = await db.get('SELECT familyId FROM users WHERE id = ?', [req.user.id]);
    const familyId = userRecord ? userRecord.familyId : null;
    
    if (!familyId) {
      return res.status(400).json({ message: 'User does not belong to a family.' });
    }

    const messages = await db.all(
      'SELECT * FROM messages WHERE familyId = ? ORDER BY timestamp ASC',
      [familyId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});

// POST a new message to the family chat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    const userRecord = await db.get('SELECT familyId FROM users WHERE id = ?', [userId]);
    const familyId = userRecord ? userRecord.familyId : null;

    if (!familyId) {
      return res.status(400).json({ message: 'User does not belong to a family.' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const newMessageId = generateId();
    const timestamp = new Date().toISOString();

    await db.run(
      'INSERT INTO messages (id, familyId, senderId, senderName, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [newMessageId, familyId, userId, userName, content.trim(), timestamp]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: newMessageId,
        familyId,
        senderId: userId,
        senderName: userName,
        content: content.trim(),
        timestamp
      }
    });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

module.exports = router;
