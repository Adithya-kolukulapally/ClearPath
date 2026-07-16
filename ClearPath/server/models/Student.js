const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  universityName: String,
  hallticketNum: String,
  numberOfBacklogs: Number,
  currentSemester: Number,
  branch: String,
  course: String,
  cgpa: Number,
  attendance: Number,
  target: String, // "placement" | "higher_studies" | "scholarship"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
