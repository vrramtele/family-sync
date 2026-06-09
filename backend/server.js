require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const taskRoutes = require('./routes/tasks');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');
const dbManagerRoutes = require('./routes/dbManager');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes setup
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/db', dbManagerRoutes);
app.use('/api/chat', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Family Shared To-Do & Activity Coordination Platform API',
    version: '1.0.0'
  });
});

// Start listener
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
