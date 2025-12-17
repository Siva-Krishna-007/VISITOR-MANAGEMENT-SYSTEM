// backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Serve Frontend (fixes Cannot GET /) =====

// Serve all static files from ../frontend
// So /css/style.css, /reception/checkin.html, /admin/login.html, etc.
app.use(express.static(path.join(__dirname, '../frontend')));

// Root route → frontend home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== API Routes =====
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hosts', require('./routes/host'));
app.use('/api/visitors', require('./routes/visitor'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
