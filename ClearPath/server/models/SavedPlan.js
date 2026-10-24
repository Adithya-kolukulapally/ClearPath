const mongoose = require('mongoose');

const savedPlanSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentData: { type: mongoose.Schema.Types.Mixed, default: {} },
  planJson: Object,     // the full AI-generated response
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SavedPlan', savedPlanSchema);
