const express = require('express');
const router = express.Router();
const Host = require('../models/Host');
const fs = require('fs');
const path = require('path');

// Helper: save base64 image and return web path
function saveHostPhoto(base64) {
  if (!base64) return '';

  const uploadDir = path.join(__dirname, '../uploads/hosts');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `host_${Date.now()}.png`;
  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(base64.split(',')[1], 'base64');
  fs.writeFileSync(filePath, buffer);

  // Web-accessible path
  return `/uploads/hosts/${filename}`;
}

// Get all hosts
router.get('/', async (req, res) => {
  try {
    const hosts = await Host.find({ status: 'active' }).sort({ name: 1 });
    res.json(hosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new host (with optional photo)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, department, photo } = req.body;

    let photoPath = '';
    if (photo) {
      photoPath = saveHostPhoto(photo);
    }

    const host = new Host({
      name,
      email,
      phone,
      department,
      photoPath
    });

    await host.save();
    res.json({ success: true, host });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update host (including replacing photo if new one sent)
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, department, photo } = req.body;

    const updateData = { name, email, phone, department };

    if (photo) {
      updateData.photoPath = saveHostPhoto(photo);
    }

    const host = await Host.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, host });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete host (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await Host.findByIdAndUpdate(req.params.id, { status: 'inactive' });
    res.json({ success: true, message: 'Host deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
