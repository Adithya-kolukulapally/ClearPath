const mongoose = require('mongoose');
const { generateBacklogSolution } = require('../services/aiService');

exports.generatePlan = async (req, res) => {
  try {
    const studentData = req.body;

    let prerequisites = {};
    let examCalendar = {};
    let eligibilityRules = [];

    // Only query MongoDB if it's actually connected
    if (mongoose.connection.readyState === 1) {
      const Course = require('../models/Course');
      const ExamCalendar = require('../models/ExamCalendar');
      const EligibilityRule = require('../models/EligibilityRule');
      const SavedPlan = require('../models/SavedPlan');

      const courses = await Course.find({});
      courses.forEach(c => prerequisites[c.name] = c.prerequisites);

      const calendarDocs = await ExamCalendar.find({});
      calendarDocs.forEach(e => examCalendar[e.course] = { formDeadline: e.formDeadline, examDate: e.examDate });

      eligibilityRules = await EligibilityRule.find({});

      const solution = await generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules);

      if (req.body.studentId) {
        await SavedPlan.create({ studentId: req.body.studentId, planJson: solution, generatedAt: new Date() });
      }

      return res.json(solution);
    }

    // MongoDB not connected — use mock/AI with empty context
    console.log('MongoDB not connected, running without DB data.');
    const solution = await generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules);
    res.json(solution);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
