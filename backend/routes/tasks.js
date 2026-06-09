const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// Get all tasks for the family
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.familyId) {
      return res.json([]);
    }

    const tasks = await db.all('SELECT * FROM tasks WHERE familyId = ?', [user.familyId]);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving tasks', error: err.message });
  }
});

// Create a new task
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, assignedTo, dueDate, priority, category } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.familyId) {
      return res.status(400).json({ message: 'You must belong to a family to create tasks' });
    }

    let assignedToName = 'Unassigned';
    if (assignedTo) {
      const assignee = await db.get('SELECT * FROM users WHERE id = ?', [assignedTo]);
      if (assignee && assignee.familyId === user.familyId) {
        assignedToName = assignee.name;
      } else {
        return res.status(400).json({ message: 'Assigned member is not part of your family' });
      }
    }

    const taskId = generateId();

    await db.run(
      'INSERT INTO tasks (id, title, description, assignedTo, assignedToName, dueDate, priority, status, category, familyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        taskId,
        title,
        description || '',
        assignedTo || null,
        assignedToName,
        dueDate || null,
        priority || 'Medium',
        'Pending',
        category || 'Chores',
        user.familyId
      ]
    );

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

    // Notify assigned member (if someone else was assigned)
    if (assignedTo && assignedTo !== user.id) {
      await db.run(
        'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
        [generateId(), assignedTo, `${user.name} assigned you the task: "${title}"`, new Date().toISOString()]
      );
    }

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating task', error: err.message });
  }
});

// Update a task
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, assignedTo, dueDate, priority, status, category } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.familyId !== user.familyId) {
      return res.status(403).json({ message: 'Unauthorized. This task is from a different family group' });
    }

    let assignedToName = task.assignedToName;
    if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
      if (assignedTo) {
        const assignee = await db.get('SELECT * FROM users WHERE id = ?', [assignedTo]);
        if (assignee && assignee.familyId === user.familyId) {
          assignedToName = assignee.name;

          // Notify new assignee
          if (assignedTo !== user.id) {
            await db.run(
              'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
              [generateId(), assignedTo, `${user.name} assigned you the task: "${title || task.title}"`, new Date().toISOString()]
            );
          }
        } else {
          return res.status(400).json({ message: 'Assigned member is not part of your family' });
        }
      } else {
        assignedToName = 'Unassigned';
      }
    }

    const updatedTitle = title !== undefined ? title : task.title;
    const updatedDescription = description !== undefined ? description : task.description;
    const updatedAssignedTo = assignedTo !== undefined ? assignedTo : task.assignedTo;
    const updatedDueDate = dueDate !== undefined ? dueDate : task.dueDate;
    const updatedPriority = priority !== undefined ? priority : task.priority;
    const updatedStatus = status !== undefined ? status : task.status;
    const updatedCategory = category !== undefined ? category : task.category;

    await db.run(
      'UPDATE tasks SET title = ?, description = ?, assignedTo = ?, assignedToName = ?, dueDate = ?, priority = ?, status = ?, category = ? WHERE id = ?',
      [
        updatedTitle,
        updatedDescription,
        updatedAssignedTo || null,
        assignedToName,
        updatedDueDate || null,
        updatedPriority,
        updatedStatus,
        updatedCategory,
        id
      ]
    );

    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    // Notify task creator when completed (if different from who completed it)
    // We don't have task.createdBy stored directly in database, wait, in previous code:
    // the backend database schema in PRD only lists: id, title, description, assignedTo, dueDate, priority, status.
    // Let's notify other members or Admin when chores are completed to keep it simple.
    if (status === 'Completed' && task.status !== 'Completed') {
      const familyAdmin = await db.get('SELECT adminId FROM families WHERE id = ?', [user.familyId]);
      if (familyAdmin && familyAdmin.adminId && familyAdmin.adminId !== user.id) {
        await db.run(
          'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
          [generateId(), familyAdmin.adminId, `${user.name} completed the task: "${task.title}"`, new Date().toISOString()]
        );
      }
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating task', error: err.message });
  }
});

// Delete a task
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.familyId !== user.familyId) {
      return res.status(403).json({ message: 'Unauthorized. This task is from a different family group' });
    }

    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ message: 'Task deleted successfully', id });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting task', error: err.message });
  }
});

module.exports = router;
