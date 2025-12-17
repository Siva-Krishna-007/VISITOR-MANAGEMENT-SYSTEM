const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: 'N/A'
  },
  purpose: {
    type: String,
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Host',
    required: true
  },
  photoPath: {
    type: String,
    required: true
  },
  idProof: {
    type: String,
    required: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  qrCode: {
    type: String,
    required: true
  },
  badgeNumber: {
    type: String,
    unique: true,
    required: true
  }
});

module.exports = mongoose.model('Visitor', visitorSchema);
