const mongoose = require('mongoose');

const examCalendarSchema = new mongoose.Schema({
  course: String,
  formDeadline: Date,
  examDate: Date,
  cycle: String // e.g. "2026-Odd"
});

module.exports = mongoose.model('ExamCalendar', examCalendarSchema);
