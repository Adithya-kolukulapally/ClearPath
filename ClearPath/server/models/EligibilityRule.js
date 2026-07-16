const mongoose = require('mongoose');

const eligibilityRuleSchema = new mongoose.Schema({
  name: String,        // "TCS Placement Drive"
  maxBacklogs: Number,
  minCgpa: Number,
  type: String          // "placement" | "scholarship" | "higher_studies"
});

module.exports = mongoose.model('EligibilityRule', eligibilityRuleSchema);
