const { default: mongoose } = require("mongoose");

const courseRequestSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  topic: { type: String, required: true },
  category: { type: String }, // ID or 'other'
  customCategory: { type: String },
  targetAudience: { type: String },
  expectedEmployees: { type: Number },
  requirements: { type: String },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected', 'in-development'],
    default: 'pending'
  },
  assignedInstructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Points to the user who is an instructor
    default: null
  },
  adminNotes: { type: String, default: '' } // Admin feedback for HR
}, { timestamps: true });

module.exports = mongoose.model('CourseRequest', courseRequestSchema);