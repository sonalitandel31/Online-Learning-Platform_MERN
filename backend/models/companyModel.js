const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  domain: {
    type: String, // e.g., 'tcs.com', 'infosys.com'
    unique: true,
    sparse: true // Allows nulls but keeps unique domains
  },
  branding: {
    logoUrl: { type: String, default: '' },
    themeColor: { type: String, default: '#000000' }
  },
  subscription: {
    plan: { type: String, enum: ['Basic', 'Pro', 'Enterprise'], default: 'Enterprise' },
    activeLicenses: { type: Number, required: true },
    usedLicenses: { type: Number, default: 0 },
    expiryDate: { type: Date }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);