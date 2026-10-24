const mongoose = require('mongoose');
const { generateBacklogSolution } = require('../services/aiService');
const { buildStudySchedule } = require('../services/schedulingService');

exports.generatePlan = async (req, res) => {
  try {
    const studentData = {
      ...req.body,
      target: req.body?.target ?? 'placement',
      dailyStudyHours: req.body?.dailyStudyHours ?? 2,
      studyDays: req.body?.studyDays ?? [0, 1, 2, 3, 4, 5, 6]
    };

    const validationError = validateStudentData(studentData);
    if (validationError) {
      return res.status(400).json({ error: validationError, code: 'INVALID_PLAN_INPUT' });
    }

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
      const outputError = validatePlanOutput(solution, studentData);
      if (outputError) return res.status(502).json({ error: outputError, code: 'INVALID_PLAN_OUTPUT' });
      const schedule = buildStudySchedule(studentData, solution.clearing_order);
      solution.schedule = schedule;
      solution.assumptions = schedule.assumptions;
      solution.warnings = schedule.warnings;

      await SavedPlan.create({ accountId: req.account._id, studentData, planJson: solution, generatedAt: new Date() });

      return res.json(solution);
    }

    // MongoDB not connected — use mock/AI with empty context
    console.log('MongoDB not connected, running without DB data.');
    const solution = await generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules);
    const outputError = validatePlanOutput(solution, studentData);
    if (outputError) return res.status(502).json({ error: outputError, code: 'INVALID_PLAN_OUTPUT' });
    const schedule = buildStudySchedule(studentData, solution.clearing_order);
    solution.schedule = schedule;
    solution.assumptions = schedule.assumptions;
    solution.warnings = schedule.warnings;
    res.json(solution);

  } catch (err) {
    console.error('Plan generation failed:', err);
    res.status(500).json({ error: 'We could not generate your plan. Please try again.', code: 'PLAN_GENERATION_FAILED' });
  }
};

function validateStudentData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Submit your student details to build a plan.';
  if (!['placement', 'higher_studies', 'scholarship'].includes(data.target)) return 'Choose a valid goal.';
  if (!Array.isArray(data.backlogs) || data.backlogs.length === 0 || data.backlogs.length > 20) {
    return 'Add between 1 and 20 backlog subjects.';
  }
  if (!Number.isInteger(Number(data.currentSemester)) || Number(data.currentSemester) < 1 || Number(data.currentSemester) > 20) {
    return 'Enter a valid current semester.';
  }
  if (!Number.isFinite(Number(data.dailyStudyHours)) || Number(data.dailyStudyHours) < 0.5 || Number(data.dailyStudyHours) > 12) {
    return 'Daily study time must be between 0.5 and 12 hours.';
  }
  if (!Array.isArray(data.studyDays) || data.studyDays.length === 0 || data.studyDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    return 'Choose at least one valid study day.';
  }
  if (new Set(data.studyDays).size !== data.studyDays.length) return 'Study days cannot contain duplicates.';
  const parsedExamDate = data.examDate && new Date(`${data.examDate}T00:00:00Z`);
  if (data.examDate && (!/^\d{4}-\d{2}-\d{2}$/.test(data.examDate) || Number.isNaN(parsedExamDate?.getTime()) || parsedExamDate.toISOString().slice(0, 10) !== data.examDate)) {
    return 'Enter a valid exam date.';
  }
  if (data.examDate && data.examDate < getTodayInTimeZone(data.timeZone)) return 'The exam date must be today or later.';
  if (data.cgpa !== undefined && data.cgpa !== '' && (!Number.isFinite(Number(data.cgpa)) || Number(data.cgpa) < 0 || Number(data.cgpa) > 10)) {
    return 'CGPA must be between 0 and 10.';
  }
  if (data.attendance !== undefined && data.attendance !== '' && (!Number.isFinite(Number(data.attendance)) || Number(data.attendance) < 0 || Number(data.attendance) > 100)) {
    return 'Attendance must be between 0 and 100.';
  }
  for (const backlog of data.backlogs) {
    if (!backlog || typeof backlog.course !== 'string' || !backlog.course.trim() || backlog.course.trim().length > 120) return 'Each backlog needs a subject name (up to 120 characters).';
    if (!Number.isInteger(Number(backlog.semester)) || Number(backlog.semester) < 1 || Number(backlog.semester) > 20) return 'Enter a valid semester for each backlog.';
    if (!Number.isInteger(Number(backlog.attempts)) || Number(backlog.attempts) < 1 || Number(backlog.attempts) > 20) return 'Attempts must be between 1 and 20.';
    if (backlog.topics !== undefined && (!Array.isArray(backlog.topics) || backlog.topics.length > 30 || backlog.topics.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > 180))) return 'Enter up to 30 valid syllabus topics for each subject.';
    if (backlog.difficulty !== undefined && !['easy', 'moderate', 'hard'].includes(backlog.difficulty)) return 'Choose a valid difficulty for each subject.';
    if (backlog.estimatedHours !== undefined && (!Number.isFinite(Number(backlog.estimatedHours)) || Number(backlog.estimatedHours) < 0.5 || Number(backlog.estimatedHours) > 100)) return 'Estimated subject effort must be between 0.5 and 100 hours.';
    if (backlog.examDate && (!/^\d{4}-\d{2}-\d{2}$/.test(backlog.examDate) || Number.isNaN(new Date(`${backlog.examDate}T00:00:00Z`).getTime()) || new Date(`${backlog.examDate}T00:00:00Z`).toISOString().slice(0, 10) !== backlog.examDate)) return 'Enter a valid exam date for each subject.';
    if (backlog.examDate && backlog.examDate < getTodayInTimeZone(data.timeZone)) return 'Subject exam dates must be today or later.';
  }
  if (new Set(data.backlogs.map(backlog => backlog.course.trim().toLowerCase())).size !== data.backlogs.length) return 'Each backlog subject should appear only once.';
  return null;
}

function validatePlanOutput(solution, studentData) {
  if (!solution || typeof solution !== 'object' || Array.isArray(solution)) return 'The generated plan was not in a usable format. Please try again.';
  const expected = new Set(studentData.backlogs.map(item => item.course.trim().toLowerCase()));
  const order = solution.clearing_order;
  if (!Array.isArray(order) || order.length !== expected.size || order.some(item => !item || typeof item.course !== 'string' || !expected.has(item.course.trim().toLowerCase()))) return 'The generated plan did not include each submitted subject exactly once. Please try again.';
  if (!Array.isArray(solution.strategies) || solution.strategies.length > 20 || !solution.learning_plan || !Array.isArray(solution.learning_plan.weekly_breakdown) || solution.learning_plan.weekly_breakdown.length > 52) return 'The generated study details did not pass validation. Please try again.';
  if (!solution.risk_assessment || !['low', 'medium', 'high'].includes(String(solution.risk_assessment.level).toLowerCase()) || typeof solution.risk_assessment.reason !== 'string') return 'The readiness details did not pass validation. Please try again.';
  const returnedCourses = order.map(item => item.course.trim().toLowerCase());
  if (new Set(returnedCourses).size !== returnedCourses.length) return 'The generated plan contained duplicate subjects. Please try again.';
  for (const alert of solution.deadline_alerts || []) {
    if (!alert || !expected.has(String(alert.course || '').trim().toLowerCase()) || !Number.isFinite(Number(alert.days_left)) || Number(alert.days_left) < 0) return 'The generated deadlines did not pass validation. Please try again.';
  }
  return null;
}

exports.validateStudentData = validateStudentData;

function getTodayInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: typeof timeZone === 'string' ? timeZone : 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
