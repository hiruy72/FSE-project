const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth'); // Legacy Firebase auth
const authNewRoutes = require('./routes/authNew'); // New JWT auth
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const questionRoutes = require('./routes/questions');
const sessionRoutes = require('./routes/sessions');
const chatRoutes = require('./routes/chat');
const ratingRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');
const matchingRoutes = require('./routes/matching'); // New matching system

// Import middleware
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authNewRoutes); // New JWT auth (primary)
app.use('/api/auth/legacy', authRoutes); // Legacy Firebase auth (for migration)
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matching', matchingRoutes); // New matching system

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Neon PostgreSQL',
    auth: 'JWT'
  });
});

// Database status check
app.get('/api/status', async (req, res) => {
  try {
    const { query } = require('./config/database');
    await query('SELECT 1 as test');
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;