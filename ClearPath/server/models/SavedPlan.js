const mongoose = require('mongoose');

const savedPlanSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  planJson: Object,     // the full AI-generated response
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SavedPlan', savedPlanSchema);
