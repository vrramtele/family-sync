const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// Get all events for the family
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.familyId) {
      return res.json([]);
    }

    const events = await db.all('SELECT * FROM events WHERE familyId = ?', [user.familyId]);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving events', error: err.message });
  }
});

// Create a new event
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, date } = req.body;

  if (!title || !date) {
    return res.status(400).json({ message: 'Event title and date are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.familyId) {
      return res.status(400).json({ message: 'You must belong to a family to schedule events' });
    }

    const eventId = generateId();

    await db.run(
      'INSERT INTO events (id, title, description, date, familyId) VALUES (?, ?, ?, ?, ?)',
      [eventId, title, description || '', date, user.familyId]
    );

    const newEvent = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);

    // Notify other family members
    const familyMembers = await db.all('SELECT * FROM users WHERE familyId = ?', [user.familyId]);
    for (const member of familyMembers) {
      if (member.id !== user.id) {
        await db.run(
          'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
          [generateId(), member.id, `${user.name} scheduled a new family event: "${title}" on ${date}`, new Date().toISOString()]
        );
      }
    }

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ message: 'Server error scheduling event', error: err.message });
  }
});

// Edit an event
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.familyId !== user.familyId) {
      return res.status(403).json({ message: 'Unauthorized. This event belongs to a different family' });
    }

    const updatedTitle = title !== undefined ? title : event.title;
    const updatedDescription = description !== undefined ? description : event.description;
    const updatedDate = date !== undefined ? date : event.date;

    await db.run(
      'UPDATE events SET title = ?, description = ?, date = ? WHERE id = ?',
      [updatedTitle, updatedDescription, updatedDate, id]
    );

    const updatedEvent = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating event', error: err.message });
  }
});

// Delete an event
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.familyId !== user.familyId) {
      return res.status(403).json({ message: 'Unauthorized. This event belongs to a different family' });
    }

    await db.run('DELETE FROM events WHERE id = ?', [id]);
    res.json({ message: 'Event deleted successfully', id });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting event', error: err.message });
  }
});

module.exports = router;
