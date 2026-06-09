const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// Get family info and members
router.get('/members', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.familyId) {
      return res.status(200).json({ inFamily: false, members: [] });
    }

    const family = await db.get('SELECT * FROM families WHERE id = ?', [user.familyId]);
    if (!family) {
      return res.status(404).json({ message: 'Family group not found' });
    }

    // Get all users in the family
    const members = await db.all('SELECT id, name, email, role, relationship FROM users WHERE familyId = ?', [user.familyId]);

    res.json({
      inFamily: true,
      familyId: family.id,
      familyName: family.familyName,
      inviteCode: family.inviteCode,
      adminId: family.adminId,
      members
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving members', error: err.message });
  }
});

// Create Family Group
router.post('/create', authMiddleware, async (req, res) => {
  const { familyName } = req.body;

  if (!familyName) {
    return res.status(400).json({ message: 'Please enter a family name' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (user.familyId) {
      return res.status(400).json({ message: 'You are already in a family group' });
    }

    // Generate invite code: uppercase name abbreviation + random number
    const codePrefix = familyName.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    const inviteCode = `${codePrefix}${codeSuffix}`;
    const newFamilyId = generateId();

    // Insert family
    await db.run(
      'INSERT INTO families (id, familyName, inviteCode, adminId) VALUES (?, ?, ?, ?)',
      [newFamilyId, familyName, inviteCode, user.id]
    );

    // Update user's role to Family Admin and set familyId
    await db.run(
      'UPDATE users SET familyId = ?, role = ? WHERE id = ?',
      [newFamilyId, 'Family Admin', user.id]
    );

    res.status(201).json({
      message: 'Family created successfully',
      family: { id: newFamilyId, familyName, inviteCode, adminId: user.id },
      userRole: 'Family Admin',
      familyId: newFamilyId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error creating family', error: err.message });
  }
});

// Join Family Group via invite code
router.post('/join', authMiddleware, async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: 'Please provide an invite code' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (user.familyId) {
      return res.status(400).json({ message: 'You are already in a family group' });
    }

    const family = await db.get('SELECT * FROM families WHERE inviteCode = ?', [inviteCode.trim()]);
    if (!family) {
      return res.status(404).json({ message: 'Invalid invite code. Family group not found.' });
    }

    // Update user with familyId and make them Family Member
    await db.run(
      'UPDATE users SET familyId = ?, role = ? WHERE id = ?',
      [family.id, 'Family Member', user.id]
    );

    // Notify other family members
    const familyMembers = await db.all('SELECT * FROM users WHERE familyId = ?', [family.id]);
    for (const m of familyMembers) {
      if (m.id !== user.id) {
        await db.run(
          'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
          [generateId(), m.id, `${user.name} has joined the family group!`, new Date().toISOString()]
        );
      }
    }

    res.json({
      message: 'Joined family successfully',
      familyName: family.familyName,
      userRole: 'Family Member',
      familyId: family.id
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error joining family', error: err.message });
  }
});

// Remove Member (Admin only)
router.delete('/members/:memberId', authMiddleware, async (req, res) => {
  const { memberId } = req.params;

  try {
    const currentUser = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (currentUser.role !== 'Family Admin') {
      return res.status(403).json({ message: 'Unauthorized. Only the Family Admin can remove members.' });
    }

    const memberToRemove = await db.get('SELECT * FROM users WHERE id = ?', [memberId]);
    if (!memberToRemove || memberToRemove.familyId !== currentUser.familyId) {
      return res.status(404).json({ message: 'Member not found in your family' });
    }

    if (memberToRemove.id === currentUser.id) {
      return res.status(400).json({ message: 'As Admin, you cannot remove yourself from the family' });
    }

    // Reset memberToRemove's family details
    await db.run(
      'UPDATE users SET familyId = NULL, role = ? WHERE id = ?',
      ['Family Member', memberId]
    );

    const family = await db.get('SELECT * FROM families WHERE id = ?', [currentUser.familyId]);

    // Notify removed user
    await db.run(
      'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
      [generateId(), memberId, `You have been removed from the family group "${family.familyName}"`, new Date().toISOString()]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error removing member', error: err.message });
  }
});

// Add a managed member to the family
router.post('/add-managed-member', authMiddleware, async (req, res) => {
  const { name, email, password, relationship } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const admin = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (admin.role !== 'Family Admin') {
      return res.status(403).json({ message: 'Only Family Admins can add managed members directly' });
    }

    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUserId = generateId();

    await db.run(
      'INSERT INTO users (id, name, email, password, role, familyId, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newUserId, name, email.toLowerCase(), hashedPassword, 'Family Member', admin.familyId, relationship || null]
    );

    // Notify family
    const family = await db.get('SELECT * FROM families WHERE id = ?', [admin.familyId]);
    await db.run(
      'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
      [generateId(), admin.id, `You added ${name} (${relationship || 'Member'}) to the family`, new Date().toISOString()]
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    res.status(500).json({ message: 'Server error adding member', error: err.message });
  }
});

// Update member relationship
router.put('/members/:memberId/relationship', authMiddleware, async (req, res) => {
  const { memberId } = req.params;
  const { relationship } = req.body;

  try {
    const admin = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (admin.role !== 'Family Admin') {
      return res.status(403).json({ message: 'Only Family Admins can update roles' });
    }

    const member = await db.get('SELECT * FROM users WHERE id = ?', [memberId]);
    if (!member || member.familyId !== admin.familyId) {
      return res.status(404).json({ message: 'Member not found in your family' });
    }

    await db.run(
      'UPDATE users SET relationship = ? WHERE id = ?',
      [relationship, memberId]
    );

    res.json({ message: 'Relationship updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating relationship', error: err.message });
  }
});

module.exports = router;
