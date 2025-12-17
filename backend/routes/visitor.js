const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Host = require('../models/Host');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate badge number
function generateBadgeNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VIS${timestamp}${random}`;
}

// Check-in visitor
router.post('/checkin', async (req, res) => {
  try {
    const { name, phone, email, company, purpose, hostId, photo, idProof } = req.body;

    // Generate badge number
    const badgeNumber = generateBadgeNumber();

    // Save photo to file system
    const photoBuffer = Buffer.from(photo.split(',')[1], 'base64');
    const photoFilename = `visitor_${Date.now()}.png`;

    const uploadDir = path.join(__dirname, '../uploads/visitors');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const photoPathFs = path.join(uploadDir, photoFilename);
    fs.writeFileSync(photoPathFs, photoBuffer);

    // IMPORTANT: Web-accessible path for frontend
    const photoPath = `/uploads/visitors/${photoFilename}`;

    // Generate QR code
    const qrData = JSON.stringify({
      badgeNumber,
      name,
      checkInTime: new Date().toISOString()
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Create visitor record
    const visitor = new Visitor({
      name,
      phone,
      email,
      company,
      purpose,
      hostId,
      photoPath,       // stored as '/uploads/visitors/xxx.png'
      idProof,
      qrCode,
      badgeNumber
    });

    await visitor.save();

    // Get host details and send notification
    const host = await Host.findById(hostId);
    if (host && host.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: host.email,
        subject: 'Visitor Arrival Notification',
        html: `
          <h3>Visitor Checked In</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Check-in Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
        `
      };

      transporter.sendMail(mailOptions).catch(err => console.log('Email error:', err));
    }

    res.json({
      success: true,
      visitor,
      message: `Check-in successful! Badge: ${badgeNumber}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check-out visitor
router.post('/checkout/:badgeNumber', async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ badgeNumber: req.params.badgeNumber });

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    if (visitor.status === 'checked-out') {
      return res.status(400).json({ error: 'Already checked out' });
    }

    visitor.checkOutTime = new Date();
    visitor.status = 'checked-out';
    await visitor.save();

    const duration = Math.round((visitor.checkOutTime - visitor.checkInTime) / 60000);

    res.json({
      success: true,
      message: `Check-out successful! Duration: ${duration} minutes`,
      visitor
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all visitors
router.get('/', async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = {};

    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.checkInTime = { $gte: startDate, $lte: endDate };
    }

    const visitors = await Visitor.find(query)
      .populate('hostId')
      .sort({ checkInTime: -1 });

    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get visitor by badge number
router.get('/badge/:badgeNumber', async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ badgeNumber: req.params.badgeNumber })
      .populate('hostId');

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalToday = await Visitor.countDocuments({
      checkInTime: { $gte: today }
    });

    const checkedIn = await Visitor.countDocuments({
      status: 'checked-in',
      checkInTime: { $gte: today }
    });

    const checkedOut = await Visitor.countDocuments({
      status: 'checked-out',
      checkInTime: { $gte: today }
    });

    const totalHosts = await Host.countDocuments({ status: 'active' });

    res.json({
      totalToday,
      checkedIn,
      checkedOut,
      totalHosts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
