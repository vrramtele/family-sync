const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Register User
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // Check if user exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const userId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    await db.run(
      'INSERT INTO users (id, name, email, password, role, familyId) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email.toLowerCase(), hashedPassword, role || 'Family Member', null]
    );

    const token = jwt.sign(
      { id: userId, name, email: email.toLowerCase(), role: role || 'Family Member' },
      process.env.JWT_SECRET || 'secret_family_coordination_token_12345!',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
        role: role || 'Family Member',
        familyId: null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter both email and password' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret_family_coordination_token_12345!',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        familyId: user.familyId
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// Reset Password (Mock / Simple Reset for MVP)
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Please provide email and new password' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ message: 'No user registered with this email address' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during password reset', error: err.message });
  }
});

module.exports = router;
