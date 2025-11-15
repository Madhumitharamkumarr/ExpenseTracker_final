require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');

// Log some environment info
console.log('Working directory:', process.cwd());
console.log('.env path:', path.join(__dirname, '.env'));
console.log('.env exists:', fs.existsSync(path.join(__dirname, '.env')));
console.log('MONGO_URI present:', !!process.env.MONGO_URI);

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is undefined. Check your .env file.');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ExpenseZen API is running',
    version: '1.0.0'
  });
});

// Import route modules
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const incomeRoutes = require('./routes/income');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notification');
// ⭐ NEW — Loan route import
const loanRoutes = require('./routes/loan');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/analytics', analyticsRoutes);

// ⭐ NEW — Mount loan route
app.use('/api/loan', loanRoutes);
app.use('/api/notification', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Start server after DB connection
async function startServer() {
  try {
    await connectDB();
    require('./services/cronService'); // Start cron service
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} — env: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

startServer();
