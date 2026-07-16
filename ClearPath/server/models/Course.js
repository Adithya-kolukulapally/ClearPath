const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: String,
  semester: Number,
  prerequisites: [String] // course names
});

module.exports = mongoose.model('Course', courseSchema);
