const express = require('express');
const mongoose = require('mongoose');
const StudyWorkspace = require('../models/StudyWorkspace');
const authenticate = require('../middleware/authenticate');
const { askTutor, createQuiz } = require('../services/learningService');
const { buildStudySchedule } = require('../services/schedulingService');
const { validateStudentData } = require('../controllers/planController');
const { PDFParse } = require('pdf-parse');

const router = express.Router();
router.use(authenticate);
const aiRequests = new Map();

async function getWorkspace(accountId) {
  return StudyWorkspace.findOneAndUpdate(
    { accountId },
    { $setOnInsert: { accountId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function databaseRequired(res) {
  if (mongoose.connection.readyState === 1) return false;
  res.status(503).json({ error: 'Study workspace is unavailable until the database connects. Please try again shortly.', code: 'WORKSPACE_UNAVAILABLE' });
  return true;
}

function rateLimitAI(req, res, next) {
  const now = Date.now();
  const key = String(req.account._id);
  const recent = (aiRequests.get(key) || []).filter(time => now - time < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'You have reached the study assistant limit for this minute. Try again shortly.', code: 'AI_RATE_LIMITED' });
  recent.push(now);
  aiRequests.set(key, recent);
  next();
}

router.get('/', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const safeWorkspace = workspace.toObject();
    safeWorkspace.quizzes = safeWorkspace.quizzes.map(quiz => ({
      ...quiz,
      questions: quiz.questions.map(({ correctIndex, ...question }) => question)
    }));
    const timezone = safeWorkspace.preferences?.timezone || 'Asia/Kolkata';
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const generatedNotifications = [];
    if (safeWorkspace.preferences?.reminders?.session !== false) {
      const dueTasks = safeWorkspace.tasks.filter(task => task.date === today && task.status !== 'completed');
      if (dueTasks.length) generatedNotifications.push({ type: 'session', title: `${dueTasks.length} study session${dueTasks.length === 1 ? '' : 's'} today`, body: dueTasks.slice(0, 3).map(task => task.title).join(', ') });
    }
    if (safeWorkspace.preferences?.reminders?.recovery !== false) {
      const overdueTasks = safeWorkspace.tasks.filter(task => task.date && task.date < today && task.status !== 'completed');
      if (overdueTasks.length) generatedNotifications.push({ type: 'recovery', title: 'A study session needs a new time', body: `${overdueTasks.length} incomplete session${overdueTasks.length === 1 ? '' : 's'} are past their planned date. Review your plan and reschedule when ready.` });
    }
    if (safeWorkspace.preferences?.reminders?.summary !== false) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekTasks = safeWorkspace.tasks.filter(task => task.completedAt && new Date(task.completedAt) >= weekAgo);
      const minutes = weekTasks.reduce((total, task) => total + (Number(task.durationMinutes) || 0), 0);
      generatedNotifications.push({ type: 'summary', title: 'Your study week at a glance', body: `You completed ${weekTasks.length} planned session${weekTasks.length === 1 ? '' : 's'} and ${minutes} minutes of study in the last 7 days. Progress is personal; use this summary to adjust your next week if helpful.` });
    }
    if (safeWorkspace.preferences?.reminders?.exam !== false) {
      const examDates = (safeWorkspace.profile?.backlogs || []).map(subject => ({ subject: subject.course, date: subject.examDate || safeWorkspace.profile.examDate })).filter(item => item.date);
      for (const exam of examDates) {
        const difference = Math.ceil((new Date(`${exam.date}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 86_400_000);
        if ([1, 3, 7].includes(difference)) generatedNotifications.push({ type: 'exam', title: `${exam.subject} exam in ${difference} days`, body: 'Review your official exam schedule and protect time for revision.' });
      }
    }
    safeWorkspace.notifications = [...safeWorkspace.notifications, ...generatedNotifications].slice(-30);
    res.json({ workspace: safeWorkspace });
  } catch (error) {
    console.error('Workspace load failed:', error.message);
    res.status(500).json({ error: 'We could not load your study workspace.', code: 'WORKSPACE_LOAD_FAILED' });
  }
});

router.put('/profile', async (req, res) => {
  if (databaseRequired(res)) return;
  const profile = req.body?.profile;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile) || JSON.stringify(profile).length > 30_000) return res.status(400).json({ error: 'Enter a valid study profile.', code: 'INVALID_PROFILE' });
  const validationError = validateStudentData(profile);
  if (validationError) return res.status(400).json({ error: validationError, code: 'INVALID_PROFILE' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const previousTaskCount = workspace.tasks.length;
    workspace.profile = profile;
    const schedule = buildStudySchedule(profile, Array.isArray(profile.studyPlan?.clearing_order) ? profile.studyPlan.clearing_order : []);
    const completedTasks = workspace.tasks.filter(task => task.status === 'completed');
    workspace.tasks = [...completedTasks, ...schedule.tasks];
    if (previousTaskCount) {
      workspace.planHistory.push({ reason: 'Study plan regenerated', beforeSummary: `${previousTaskCount} planned or completed tasks`, afterSummary: `${completedTasks.length} completed tasks preserved; ${schedule.tasks.length} new tasks scheduled.` });
      workspace.planHistory = workspace.planHistory.slice(-50);
    }
    profile.scheduleWarnings = schedule.warnings;
    profile.scheduleAssumptions = schedule.assumptions;
    workspace.updatedAt = new Date();
    await workspace.save();
    res.json({ profile: workspace.profile, schedule: { taskCount: schedule.tasks.length, warnings: schedule.warnings, assumptions: schedule.assumptions } });
  } catch (error) {
    console.error('Workspace profile update failed:', error.message);
    res.status(500).json({ error: 'We could not save your study profile.', code: 'PROFILE_SAVE_FAILED' });
  }
});

router.patch('/tasks/:taskId', async (req, res) => {
  if (databaseRequired(res)) return;
  const { status, date } = req.body || {};
  if (!['planned', 'in_progress', 'completed', 'skipped'].includes(status)) return res.status(400).json({ error: 'Choose a valid task status.', code: 'INVALID_TASK_STATUS' });
  if (date !== undefined && date !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) return res.status(400).json({ error: 'Enter a valid task date.', code: 'INVALID_TASK_DATE' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const task = workspace.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'That study task was not found.', code: 'TASK_NOT_FOUND' });
    if (date !== undefined && date !== task.date) {
      if (task.status === 'completed') return res.status(409).json({ error: 'Completed tasks stay on their original date.', code: 'COMPLETED_TASK_LOCKED' });
      const profile = workspace.profile || {};
      const selectedDays = profile.studyDays || [];
      const dateAtNoon = new Date(`${date}T12:00:00Z`);
      const todayKey = new Intl.DateTimeFormat('en', { timeZone: workspace.preferences.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
      const today = `${todayKey.year}-${todayKey.month}-${todayKey.day}`;
      if (date < today || !selectedDays.includes((dateAtNoon.getUTCDay() + 6) % 7)) return res.status(409).json({ error: 'Choose a future date on one of your selected study days.', code: 'TASK_DATE_UNAVAILABLE' });
      const subject = (profile.backlogs || []).find(backlog => backlog.course?.toLowerCase() === task.subject?.toLowerCase());
      const deadline = subject?.examDate || profile.examDate;
      if (deadline && date > deadline) return res.status(409).json({ error: 'That date falls after this subject’s exam date.', code: 'TASK_AFTER_DEADLINE' });
      const dailyCapacity = Math.round((Number(profile.dailyStudyHours) || 2) * 60);
      const otherLoad = workspace.tasks.filter(item => String(item._id) !== String(task._id) && item.date === date && item.status !== 'completed').reduce((sum, item) => sum + item.durationMinutes, 0);
      if (otherLoad + task.durationMinutes > dailyCapacity) return res.status(409).json({ error: 'That date would exceed your declared daily study limit.', code: 'DAILY_CAPACITY_EXCEEDED' });
    }
    task.status = status;
    task.completedAt = status === 'completed' ? new Date() : undefined;
    if (date !== undefined) task.date = date;
    workspace.updatedAt = new Date();
    await workspace.save();
    res.json({ task });
  } catch (error) {
    console.error('Task update failed:', error.message);
    res.status(500).json({ error: 'We could not update that task.', code: 'TASK_UPDATE_FAILED' });
  }
});

router.post('/tasks/recover', async (req, res) => {
  if (databaseRequired(res)) return;
  const { taskIds, studyDays, dailyStudyHours, confirm } = req.body || {};
  if (!Array.isArray(taskIds) || taskIds.length < 1 || taskIds.length > 100 || !Array.isArray(studyDays) || !studyDays.length || studyDays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || !Number.isFinite(dailyStudyHours) || dailyStudyHours < 0.5 || dailyStudyHours > 12) return res.status(400).json({ error: 'Provide missed task IDs and valid study availability.', code: 'INVALID_RECOVERY_INPUT' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const tasks = taskIds.map(id => workspace.tasks.id(id)).filter(task => task && task.status !== 'completed');
    if (!tasks.length) return res.status(404).json({ error: 'No incomplete study tasks were found to reschedule.', code: 'NO_RECOVERABLE_TASKS' });
    const profile = workspace.profile || {};
    const availableDays = new Set(studyDays);
    const minutesPerDay = Math.floor(dailyStudyHours * 60);
    const loadByDate = new Map();
    workspace.tasks.filter(task => task.status !== 'completed' && !taskIds.includes(String(task._id)) && task.date).forEach(task => loadByDate.set(task.date, (loadByDate.get(task.date) || 0) + task.durationMinutes));
    const dateParts = new Intl.DateTimeFormat('en', { timeZone: workspace.preferences.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    const todayKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const start = new Date(`${todayKey}T12:00:00Z`);
    const proposal = [];
    for (const task of tasks) {
      const subject = (profile.backlogs || []).find(item => item.course?.toLowerCase() === task.subject?.toLowerCase());
      const deadline = subject?.examDate || profile.examDate;
      let date = null;
      for (let offset = 0; offset < 90; offset += 1) {
        const candidate = new Date(start);
        candidate.setUTCDate(start.getUTCDate() + offset);
        const mondayIndex = (candidate.getUTCDay() + 6) % 7;
        const key = candidate.toISOString().slice(0, 10);
        if (deadline && key > deadline) break;
        if (availableDays.has(mondayIndex) && (loadByDate.get(key) || 0) + task.durationMinutes <= minutesPerDay) { date = key; loadByDate.set(key, (loadByDate.get(key) || 0) + task.durationMinutes); break; }
      }
      proposal.push({ taskId: String(task._id), title: task.title, previousDate: task.date, date, durationMinutes: task.durationMinutes });
    }
    const warnings = proposal.some(item => !item.date) ? ['Some tasks do not fit within the next 90 days at the availability provided. Increase study time or reduce optional work before applying.'] : [];
    if (confirm !== true) return res.json({ proposal, warnings, completedTasksPreserved: true, requiresConfirmation: true });
    if (warnings.length) return res.status(409).json({ error: warnings[0], code: 'RECOVERY_INFEASIBLE', proposal });
    for (const item of proposal) {
      const task = workspace.tasks.id(item.taskId);
      task.date = item.date;
      task.status = 'planned';
    }
    workspace.updatedAt = new Date();
    await workspace.save();
    workspace.notifications.push({ type: 'recovery', title: 'Study plan updated', body: `${proposal.length} incomplete task${proposal.length === 1 ? ' was' : 's were'} moved to available study days.` });
    workspace.planHistory.push({ reason: 'Missed sessions rescheduled', beforeSummary: `${proposal.length} incomplete tasks on their previous dates`, afterSummary: `${proposal.length} tasks moved to available study days.` });
    workspace.planHistory = workspace.planHistory.slice(-50);
    await workspace.save();
    res.json({ proposal, warnings, completedTasksPreserved: true, applied: true });
  } catch (error) {
    console.error('Task recovery failed:', error.message);
    res.status(500).json({ error: 'We could not prepare a recovery plan.', code: 'RECOVERY_FAILED' });
  }
});

router.post('/tutor', rateLimitAI, async (req, res) => {
  if (databaseRequired(res)) return;
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 120) : '';
  const context = typeof req.body?.context === 'string' ? req.body.context.slice(0, 8000) : '';
  if (!question || question.length > 2000) return res.status(400).json({ error: 'Ask a question up to 2,000 characters.', code: 'INVALID_TUTOR_QUESTION' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const answer = await askTutor({ question, subject, context });
    workspace.tutorMessages.push({ role: 'user', content: question, subject }, { role: 'assistant', content: answer, subject });
    workspace.tutorMessages = workspace.tutorMessages.slice(-200);
    workspace.updatedAt = new Date();
    await workspace.save();
    res.json({ answer, disclaimer: 'AI responses may contain errors. Generated guidance is not an official marking scheme.' });
  } catch (error) {
    console.error('Tutor request failed:', error.message);
    res.status(502).json({ error: 'The study tutor is unavailable right now. Please try again.', code: 'TUTOR_UNAVAILABLE' });
  }
});

router.delete('/tutor/history', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    workspace.tutorMessages = [];
    await workspace.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'We could not delete your tutor history.', code: 'TUTOR_DELETE_FAILED' });
  }
});

router.post('/quizzes/generate', rateLimitAI, async (req, res) => {
  if (databaseRequired(res)) return;
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 120) : '';
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 180) : '';
  const count = Number(req.body?.count || 5);
  if (!subject || !topic || !Number.isInteger(count) || count < 3 || count > 15) return res.status(400).json({ error: 'Choose a subject, topic, and between 3 and 15 questions.', code: 'INVALID_QUIZ_INPUT' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const questions = await createQuiz({ subject, topic, count });
    workspace.quizzes.push({ title: `${topic} practice`, subject, topic, questions });
    workspace.updatedAt = new Date();
    await workspace.save();
    const quiz = workspace.quizzes[workspace.quizzes.length - 1];
    res.status(201).json({ quiz: { id: String(quiz._id), title: quiz.title, subject, topic, sourceType: process.env.GEMINI_API_KEY ? 'ai-generated' : 'guided-practice', questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })) } });
  } catch (error) {
    console.error('Quiz generation failed:', error.message);
    res.status(502).json({ error: 'We could not create a valid quiz. Please try again.', code: 'QUIZ_GENERATION_FAILED' });
  }
});

router.post('/documents/upload', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res) => {
  if (databaseRequired(res)) return;
  const rawName = req.get('x-file-name') || '';
  let name = '';
  try { name = decodeURIComponent(rawName).replace(/[\\/\0-\x1f]/g, '').trim(); }
  catch { return res.status(400).json({ error: 'The PDF file name is invalid.', code: 'INVALID_DOCUMENT_NAME' }); }
  const type = req.get('x-document-type') || 'unknown';
  let subject = '';
  try { subject = decodeURIComponent(req.get('x-subject') || '').trim(); }
  catch { return res.status(400).json({ error: 'Choose a valid related subject.', code: 'INVALID_DOCUMENT_SUBJECT' }); }
  if (!Buffer.isBuffer(req.body) || req.body.length < 8 || !req.body.subarray(0, 5).equals(Buffer.from('%PDF-')) || !name || name.length > 180 || !['syllabus', 'notes', 'questionPaper', 'unknown'].includes(type) || subject.length > 120) return res.status(400).json({ error: 'Choose a valid, text-based PDF under 10 MB.', code: 'INVALID_DOCUMENT' });
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(req.body), isEvalSupported: false });
    const info = await parser.getInfo();
    if (info.total < 1 || info.total > 300) return res.status(400).json({ error: 'This PDF must contain between 1 and 300 pages.', code: 'DOCUMENT_PAGE_LIMIT' });
    const parsed = await parser.getText({ pageJoiner: '\n-- page_number --' });
    const extractions = (parsed.pages || []).map(page => {
      const text = String(page.text || '').replace(/\s+/g, ' ').trim();
      const topics = [...new Set(text.split(/[.!?;\n]/).map(part => part.trim()).filter(part => part.length >= 8 && part.length <= 180))].slice(0, 30);
      const questions = text.match(/[^.!?]{10,240}\?/g)?.slice(0, 30).map(question => question.trim()) || [];
      return { page: page.num, topics, questions, text: text.slice(0, 1800) };
    }).filter(page => page.text || page.questions.length || page.topics.length);
    if (!extractions.length || extractions.every(page => page.text.length < 20)) return res.status(422).json({ error: 'No readable text was found. Scanned pages need OCR, which is not enabled for this project.', code: 'DOCUMENT_NO_TEXT' });
    const workspace = await getWorkspace(req.account._id);
    workspace.documents.push({ name, type, subject, pageCount: info.total, status: 'completed', approved: false, extractions });
    await workspace.save();
    const document = workspace.documents[workspace.documents.length - 1];
    res.status(201).json({ document, reviewRequired: true, limitations: 'Review extracted text and topics before using them in a plan. Scanned PDFs require OCR, which is not enabled.' });
  } catch (error) {
    if (error?.name === 'PasswordException') return res.status(400).json({ error: 'Password-protected PDFs are not supported. Export an unlocked copy and try again.', code: 'DOCUMENT_ENCRYPTED' });
    console.error('Document processing failed:', error.message);
    res.status(500).json({ error: 'We could not process this PDF. Please try another text-based, unprotected file.', code: 'DOCUMENT_PROCESSING_FAILED' });
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
});

router.patch('/documents/:documentId', async (req, res) => {
  if (databaseRequired(res)) return;
  const { type, subject, approved, topics, topicsByPage } = req.body || {};
  if (type !== undefined && !['syllabus', 'notes', 'questionPaper', 'unknown'].includes(type)) return res.status(400).json({ error: 'Choose a valid document type.', code: 'INVALID_DOCUMENT_TYPE' });
  if (subject !== undefined && (typeof subject !== 'string' || subject.length > 120)) return res.status(400).json({ error: 'Choose a valid subject.', code: 'INVALID_DOCUMENT_SUBJECT' });
  if (approved !== undefined && typeof approved !== 'boolean') return res.status(400).json({ error: 'Document approval must be true or false.', code: 'INVALID_DOCUMENT_APPROVAL' });
  if (topics !== undefined && (!Array.isArray(topics) || topics.length > 100 || topics.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > 180))) return res.status(400).json({ error: 'Review the extracted topics and try again.', code: 'INVALID_EXTRACTED_TOPICS' });
  if (topicsByPage !== undefined && (!Array.isArray(topicsByPage) || topicsByPage.length > 300 || topicsByPage.some(page => !Number.isInteger(page.page) || !Array.isArray(page.topics) || page.topics.length > 100 || page.topics.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > 180)))) return res.status(400).json({ error: 'Review the extracted topics and try again.', code: 'INVALID_EXTRACTED_TOPICS' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const document = workspace.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ error: 'That document was not found.', code: 'DOCUMENT_NOT_FOUND' });
    if (type !== undefined) document.type = type;
    if (subject !== undefined) document.subject = subject;
    if (approved !== undefined) document.approved = approved;
    if (topicsByPage !== undefined) {
      for (const page of topicsByPage) {
        const extraction = document.extractions.find(item => item.page === page.page);
        if (!extraction) return res.status(400).json({ error: 'A reviewed page does not belong to this document.', code: 'INVALID_EXTRACTION_PAGE' });
        extraction.topics = page.topics.map(topic => topic.trim());
      }
    } else if (topics !== undefined && document.extractions[0]) {
      document.extractions[0].topics = topics.map(topic => topic.trim());
    }
    if (approved === true && document.type === 'syllabus' && document.subject && document.extractions.length) {
      const reviewedTopics = [...new Set(document.extractions.flatMap(page => page.topics))];
      const profile = workspace.profile?.toObject?.() || workspace.profile || {};
      profile.backlogs = (profile.backlogs || []).map(backlog => backlog.course === document.subject ? { ...backlog, topics: reviewedTopics } : backlog);
      workspace.profile = profile;
      const schedule = buildStudySchedule(profile, Array.isArray(profile.studyPlan?.clearing_order) ? profile.studyPlan.clearing_order : []);
      const completedTasks = workspace.tasks.filter(task => task.status === 'completed');
      workspace.tasks = [...completedTasks, ...schedule.tasks];
      profile.scheduleWarnings = schedule.warnings;
      profile.scheduleAssumptions = schedule.assumptions;
    }
    await workspace.save();
    res.json({ document, schedule: workspace.profile?.scheduleWarnings ? { warnings: workspace.profile.scheduleWarnings, assumptions: workspace.profile.scheduleAssumptions } : undefined });
  } catch (error) {
    res.status(500).json({ error: 'We could not update this document review.', code: 'DOCUMENT_UPDATE_FAILED' });
  }
});

router.delete('/documents/:documentId', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const document = workspace.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ error: 'That document was not found.', code: 'DOCUMENT_NOT_FOUND' });
    document.deleteOne();
    await workspace.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'We could not delete this document.', code: 'DOCUMENT_DELETE_FAILED' });
  }
});

router.post('/documents/paper-analysis', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const papers = workspace.documents.filter(document => document.type === 'questionPaper' && document.approved);
    if (papers.length < 2) return res.status(400).json({ error: 'Review and approve at least two question papers before comparing patterns.', code: 'NOT_ENOUGH_PAPERS' });
    const entries = papers.flatMap(paper => (paper.extractions || []).flatMap(page => (page.questions || []).map(question => ({ question, paper: paper.name, date: paper.createdAt }))));
    const groups = [];
    for (const entry of entries) {
      const words = meaningfulWords(entry.question);
      const group = groups.find(candidate => similarity(words, candidate.words) >= 0.6);
      if (group) {
        group.matches.push(entry);
        group.words = new Set([...group.words, ...words]);
      } else groups.push({ words, matches: [entry] });
    }
    const approvedTopics = (workspace.profile?.backlogs || []).flatMap(subject => (subject.topics || []).map(topic => ({ subject: subject.course, topic })));
    const mapped = groups.map(group => {
      const topic = approvedTopics.map(item => ({ ...item, score: similarity(meaningfulWords(item.topic), group.words) })).sort((a, b) => b.score - a.score)[0];
      const question = group.matches[0].question;
      const sourcePapers = [...new Set(group.matches.map(item => item.paper))];
      return { theme: question.length > 120 ? `${question.slice(0, 117)}…` : question, occurrences: group.matches.length, paperCount: sourcePapers.length, sourcePapers, linkedTopic: topic?.score >= 0.18 ? { subject: topic.subject, topic: topic.topic } : null };
    });
    const repeatedThemes = mapped.filter(item => item.paperCount >= 2).sort((a, b) => b.paperCount - a.paperCount || b.occurrences - a.occurrences);
    const coverage = new Map();
    for (const item of mapped) if (item.linkedTopic) {
      const key = `${item.linkedTopic.subject}::${item.linkedTopic.topic}`;
      coverage.set(key, (coverage.get(key) || 0) + item.occurrences);
    }
    const topicCoverage = approvedTopics.map(item => ({ ...item, questionCount: coverage.get(`${item.subject}::${item.topic}`) || 0 }));
    const dates = papers.map(paper => new Date(paper.createdAt)).filter(date => !Number.isNaN(date.getTime())).sort((a, b) => a - b);
    res.json({ paperCount: papers.length, dateRange: dates.length ? { from: dates[0].toISOString().slice(0, 10), to: dates[dates.length - 1].toISOString().slice(0, 10) } : null, repeatedThemes, topicCoverage, limitations: 'Patterns are limited to the papers you supplied. Extracted question grouping is approximate, page references are not available from this basic text extractor, and no future exam question is predicted.' });
  } catch (error) {
    console.error('Question paper analysis failed:', error.message);
    res.status(500).json({ error: 'We could not compare the supplied question papers.', code: 'PAPER_ANALYSIS_FAILED' });
  }
});

router.post('/quizzes/:quizId/attempts', async (req, res) => {
  if (databaseRequired(res)) return;
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length > 15 || answers.some(value => !Number.isInteger(value) || value < -1 || value > 3)) return res.status(400).json({ error: 'Submit one answer for each question.', code: 'INVALID_QUIZ_ATTEMPT' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const quiz = workspace.quizzes.id(req.params.quizId);
    if (!quiz) return res.status(404).json({ error: 'That quiz was not found.', code: 'QUIZ_NOT_FOUND' });
    if (answers.length !== quiz.questions.length) return res.status(400).json({ error: 'Submit an answer for every question before finishing.', code: 'INCOMPLETE_QUIZ' });
    const results = quiz.questions.map((question, index) => ({ correct: answers[index] === question.correctIndex, explanation: question.explanation }));
    const score = results.filter(item => item.correct).length;
    quiz.attempts.push({ answers, score, total: quiz.questions.length });
    workspace.updatedAt = new Date();
    await workspace.save();
    res.json({ score, total: quiz.questions.length, results, sourceType: 'practice' });
  } catch (error) {
    console.error('Quiz submission failed:', error.message);
    res.status(500).json({ error: 'We could not save your quiz result.', code: 'QUIZ_SUBMIT_FAILED' });
  }
});

router.post('/flashcards', async (req, res) => {
  if (databaseRequired(res)) return;
  const { subject = '', topic = '', front, back } = req.body || {};
  if (typeof front !== 'string' || !front.trim() || front.length > 1200 || typeof back !== 'string' || !back.trim() || back.length > 3000) return res.status(400).json({ error: 'Add a question and an answer for the flashcard.', code: 'INVALID_FLASHCARD' });
  try {
    const workspace = await getWorkspace(req.account._id);
    workspace.flashcards.push({ subject: String(subject).slice(0, 120), topic: String(topic).slice(0, 180), front: front.trim(), back: back.trim() });
    await workspace.save();
    res.status(201).json({ card: workspace.flashcards[workspace.flashcards.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'We could not save that flashcard.', code: 'FLASHCARD_SAVE_FAILED' });
  }
});

router.patch('/flashcards/:cardId', async (req, res) => {
  if (databaseRequired(res)) return;
  const { starred, mastered, front, back, topic, subject } = req.body || {};
  if (typeof starred !== 'boolean' && typeof mastered !== 'boolean' && front === undefined && back === undefined && topic === undefined && subject === undefined) return res.status(400).json({ error: 'Choose a flashcard action.', code: 'INVALID_FLASHCARD_UPDATE' });
  if ((front !== undefined && (typeof front !== 'string' || !front.trim() || front.length > 1200)) || (back !== undefined && (typeof back !== 'string' || !back.trim() || back.length > 3000))) return res.status(400).json({ error: 'Enter a valid flashcard question and answer.', code: 'INVALID_FLASHCARD_CONTENT' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const card = workspace.flashcards.id(req.params.cardId);
    if (!card) return res.status(404).json({ error: 'That flashcard was not found.', code: 'FLASHCARD_NOT_FOUND' });
    if (typeof starred === 'boolean') card.starred = starred;
    if (typeof mastered === 'boolean') card.mastered = mastered;
    if (front !== undefined) card.front = front.trim();
    if (back !== undefined) card.back = back.trim();
    if (topic !== undefined) card.topic = String(topic).slice(0, 180);
    if (subject !== undefined) card.subject = String(subject).slice(0, 120);
    await workspace.save();
    res.json({ card });
  } catch (error) {
    res.status(500).json({ error: 'We could not update that flashcard.', code: 'FLASHCARD_UPDATE_FAILED' });
  }
});

router.post('/notes', async (req, res) => {
  if (databaseRequired(res)) return;
  const { subject = '', topic = '', title, content, source = 'student' } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 180 || typeof content !== 'string' || !content.trim() || content.length > 8000 || !['student', 'ai-assisted', 'document'].includes(source)) return res.status(400).json({ error: 'Add a title and note content up to 8,000 characters.', code: 'INVALID_NOTE' });
  try {
    const workspace = await getWorkspace(req.account._id);
    workspace.notes.push({ subject: String(subject).slice(0, 120), topic: String(topic).slice(0, 180), title: title.trim(), content: content.trim(), source });
    await workspace.save();
    res.status(201).json({ note: workspace.notes[workspace.notes.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'We could not save that note.', code: 'NOTE_SAVE_FAILED' });
  }
});

router.patch('/notes/:noteId', async (req, res) => {
  if (databaseRequired(res)) return;
  const { title, content, subject, topic, starred } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 180)) return res.status(400).json({ error: 'Enter a valid note title.', code: 'INVALID_NOTE_TITLE' });
  if (content !== undefined && (typeof content !== 'string' || !content.trim() || content.length > 8000)) return res.status(400).json({ error: 'Enter valid note content.', code: 'INVALID_NOTE_CONTENT' });
  if (starred !== undefined && typeof starred !== 'boolean') return res.status(400).json({ error: 'Choose whether the note is starred.', code: 'INVALID_NOTE_STAR' });
  try {
    const workspace = await getWorkspace(req.account._id);
    const note = workspace.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ error: 'That note was not found.', code: 'NOTE_NOT_FOUND' });
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (subject !== undefined) note.subject = String(subject).slice(0, 120);
    if (topic !== undefined) note.topic = String(topic).slice(0, 180);
    if (starred !== undefined) note.starred = starred;
    note.updatedAt = new Date();
    await workspace.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: 'We could not update that note.', code: 'NOTE_UPDATE_FAILED' });
  }
});

router.delete('/notes/:noteId', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const note = workspace.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ error: 'That note was not found.', code: 'NOTE_NOT_FOUND' });
    note.deleteOne();
    await workspace.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'We could not delete that note.', code: 'NOTE_DELETE_FAILED' });
  }
});

router.delete('/flashcards/:cardId', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const card = workspace.flashcards.id(req.params.cardId);
    if (!card) return res.status(404).json({ error: 'That flashcard was not found.', code: 'FLASHCARD_NOT_FOUND' });
    card.deleteOne();
    await workspace.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'We could not delete that flashcard.', code: 'FLASHCARD_DELETE_FAILED' });
  }
});

router.patch('/preferences', async (req, res) => {
  if (databaseRequired(res)) return;
  const { timezone, dailyTargetMinutes, reminders, streaksEnabled } = req.body || {};
  if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length > 100 || !isValidTimezone(timezone))) return res.status(400).json({ error: 'Choose a valid time zone.', code: 'INVALID_TIMEZONE' });
  if (dailyTargetMinutes !== undefined && (!Number.isInteger(dailyTargetMinutes) || dailyTargetMinutes < 15 || dailyTargetMinutes > 720)) return res.status(400).json({ error: 'Daily target must be between 15 and 720 minutes.', code: 'INVALID_DAILY_TARGET' });
  if (streaksEnabled !== undefined && typeof streaksEnabled !== 'boolean') return res.status(400).json({ error: 'Choose whether streaks are enabled.', code: 'INVALID_PREFERENCE' });
  if (reminders !== undefined && (!reminders || typeof reminders !== 'object' || Object.values(reminders).some(value => typeof value !== 'boolean'))) return res.status(400).json({ error: 'Reminder settings must be on or off.', code: 'INVALID_REMINDERS' });
  try {
    const workspace = await getWorkspace(req.account._id);
    if (timezone !== undefined) workspace.preferences.timezone = timezone;
    if (dailyTargetMinutes !== undefined) workspace.preferences.dailyTargetMinutes = dailyTargetMinutes;
    if (streaksEnabled !== undefined) workspace.preferences.streaksEnabled = streaksEnabled;
    if (reminders !== undefined) workspace.preferences.reminders = { ...(workspace.preferences.reminders?.toObject?.() || workspace.preferences.reminders || {}), ...reminders };
    await workspace.save();
    res.json({ preferences: workspace.preferences });
  } catch (error) {
    res.status(500).json({ error: 'We could not save your preferences.', code: 'PREFERENCES_SAVE_FAILED' });
  }
});

router.delete('/data', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const SavedPlan = require('../models/SavedPlan');
    await Promise.all([StudyWorkspace.deleteOne({ accountId: req.account._id }), SavedPlan.deleteMany({ accountId: req.account._id })]);
    res.json({ deleted: true, message: 'Your ClearPath study workspace data has been deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'We could not delete your workspace data.', code: 'DATA_DELETE_FAILED' });
  }
});

router.get('/data/export', async (req, res) => {
  if (databaseRequired(res)) return;
  try {
    const workspace = await getWorkspace(req.account._id);
    const exported = workspace.toObject();
    exported.quizzes = exported.quizzes.map(quiz => ({ ...quiz, questions: quiz.questions.map(({ correctIndex, ...question }) => question) }));
    const SavedPlan = require('../models/SavedPlan');
    const plans = await SavedPlan.find({ accountId: req.account._id }).select('planJson studentData generatedAt').sort({ generatedAt: -1 }).limit(50).lean();
    res.json({ exportedAt: new Date().toISOString(), workspace: exported, savedPlans: plans });
  } catch (error) {
    res.status(500).json({ error: 'We could not export your study workspace.', code: 'DATA_EXPORT_FAILED' });
  }
});

function isValidTimezone(timezone) {
  try { Intl.DateTimeFormat('en', { timeZone: timezone }).format(); return true; }
  catch { return false; }
}

const ignoredTerms = new Set(['about', 'after', 'again', 'also', 'among', 'could', 'define', 'describe', 'discuss', 'explain', 'from', 'have', 'into', 'list', 'what', 'when', 'where', 'which', 'with', 'your', 'question', 'following', 'state', 'write', 'show', 'give', 'using']);
function meaningfulWords(text) {
  return new Set(String(text).toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(word => !ignoredTerms.has(word)) || []);
}
function similarity(first, second) {
  if (!first.size || !second.size) return 0;
  let shared = 0;
  for (const word of first) if (second.has(word)) shared += 1;
  return shared / (first.size + second.size - shared);
}

module.exports = router;
