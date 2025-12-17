const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    let admin = await Admin.findOne({ username });
    if (!admin) {
      admin = new Admin({ username, password });
      await admin.save();
    }
    
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
