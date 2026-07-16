const mongoose = require('mongoose');

const backlogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  course: String,
  semester: Number,
  attempts: Number,
  status: { type: String, default: 'pending' } // "pending" | "cleared"
});

module.exports = mongoose.model('Backlog', backlogSchema);
