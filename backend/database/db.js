const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Establish SQLite database connection
const dbConn = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Helper utilities to wrap sqlite3 methods in Promises
const db = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbConn.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbConn.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbConn.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      dbConn.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

// Generate UUID-like strings
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// Initialize Tables and seed default data
const initDb = async () => {
  try {
    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON');

    // Create Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        familyId TEXT,
        relationship TEXT
      );

      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        familyName TEXT NOT NULL,
        inviteCode TEXT NOT NULL UNIQUE,
        adminId TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assignedTo TEXT,
        assignedToName TEXT,
        dueDate TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        familyId TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        familyId TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        isRead INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        familyId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        senderName TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    // Add relationship column to existing databases if it doesn't exist
    try {
      await db.run('ALTER TABLE users ADD COLUMN relationship TEXT');
    } catch (err) {
      // Ignore error if column already exists
    }

    // Check if seeding is required (no users)
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('No records found in SQLite. Seeding initial database data...');

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('password123', salt);

      const familyId = generateId();
      const gomezId = generateId();
      const morticiaId = generateId();

      // Seed family
      await db.run(
        'INSERT INTO families (id, familyName, inviteCode, adminId) VALUES (?, ?, ?, ?)',
        [familyId, 'The Adams Family', 'ADAMS123', gomezId]
      );

      // Seed Admin user
      await db.run(
        'INSERT INTO users (id, name, email, password, role, familyId, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gomezId, 'Gomez Adams', 'gomez@adams.com', hashedPassword, 'Family Admin', familyId, 'Father']
      );

      // Seed Member user
      await db.run(
        'INSERT INTO users (id, name, email, password, role, familyId, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [morticiaId, 'Morticia Adams', 'morticia@adams.com', hashedPassword, 'Family Member', familyId, 'Mother']
      );

      // Seed Tasks
      await db.run(
        'INSERT INTO tasks (id, title, description, assignedTo, assignedToName, dueDate, priority, status, category, familyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateId(),
          'Water the carnivorous plants',
          'Use the custom growth serum in the conservatory and watch out for Cleopatra.',
          morticiaId,
          'Morticia Adams',
          '2026-06-15',
          'High',
          'Pending',
          'Chores',
          familyId
        ]
      );

      await db.run(
        'INSERT INTO tasks (id, title, description, assignedTo, assignedToName, dueDate, priority, status, category, familyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateId(),
          'Buy fencing supplies',
          'Get rapier oil and replacement foils for our daily match.',
          gomezId,
          'Gomez Adams',
          '2026-06-10',
          'Medium',
          'Completed',
          'Shopping',
          familyId
        ]
      );

      await db.run(
        'INSERT INTO tasks (id, title, description, assignedTo, assignedToName, dueDate, priority, status, category, familyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateId(),
          'Order new potions book',
          'Check the dark magic bookshop for the 17th-century edition.',
          morticiaId,
          'Morticia Adams',
          '2026-06-08',
          'Low',
          'Pending',
          'Other',
          familyId
        ]
      );

      // Seed Events
      await db.run(
        'INSERT INTO events (id, title, description, date, familyId) VALUES (?, ?, ?, ?, ?)',
        [
          generateId(),
          'Family Dinner at Midnight',
          'Special feast with Cousin Itt and Uncle Fester. Dress code: Dark chic.',
          '2026-06-12',
          familyId
        ]
      );

      await db.run(
        'INSERT INTO events (id, title, description, date, familyId) VALUES (?, ?, ?, ?, ?)',
        [
          generateId(),
          'Tango Practice',
          'Daily practice in the grand ballroom.',
          '2026-06-14',
          familyId
        ]
      );

      // Seed Notifications
      await db.run(
        'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
        [
          generateId(),
          gomezId,
          'You have been assigned the task: "Buy fencing supplies"',
          new Date(Date.now() - 1000 * 60 * 60).toISOString()
        ]
      );

      await db.run(
        'INSERT INTO notifications (id, userId, message, timestamp, isRead) VALUES (?, ?, ?, ?, 0)',
        [
          generateId(),
          morticiaId,
          'You have been assigned the task: "Water the carnivorous plants"',
          new Date(Date.now() - 1000 * 60 * 30).toISOString()
        ]
      );

      console.log('SQLite database successfully seeded!');
    }
  } catch (err) {
    console.error('Error during database creation or seeding:', err);
  }
};

// Execute initialization
initDb();

module.exports = db;
