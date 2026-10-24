const mongoose = require('mongoose');

const studyWorkspaceSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, unique: true, index: true },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  tasks: [{
    title: { type: String, required: true, maxlength: 180 },
    subject: { type: String, default: '', maxlength: 120 },
    topic: { type: String, default: '', maxlength: 180 },
    date: { type: String, default: '' },
    durationMinutes: { type: Number, default: 45, min: 5, max: 720 },
    status: { type: String, enum: ['planned', 'in_progress', 'completed', 'skipped'], default: 'planned' },
    completedAt: Date,
    rationale: { type: String, default: '', maxlength: 500 },
    source: { type: String, default: 'plan' }
  }],
  planHistory: [{
    reason: { type: String, required: true, maxlength: 180 },
    beforeSummary: { type: String, default: '', maxlength: 500 },
    afterSummary: { type: String, default: '', maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  tutorMessages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 6000 },
    subject: { type: String, default: '', maxlength: 120 },
    createdAt: { type: Date, default: Date.now }
  }],
  documents: [{
    name: { type: String, required: true, maxlength: 180 },
    subject: { type: String, default: '', maxlength: 120 },
    type: { type: String, enum: ['syllabus', 'notes', 'questionPaper', 'unknown'], default: 'unknown' },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    pageCount: { type: Number, default: 0 },
    approved: { type: Boolean, default: false },
    extractions: [{ page: Number, topics: [String], questions: [String], text: { type: String, maxlength: 3000 } }],
    createdAt: { type: Date, default: Date.now }
  }],
  quizzes: [{
    title: { type: String, required: true, maxlength: 180 },
    subject: { type: String, default: '', maxlength: 120 },
    topic: { type: String, default: '', maxlength: 180 },
    questions: [{
      prompt: { type: String, required: true, maxlength: 1200 },
      options: [{ type: String, maxlength: 400 }],
      correctIndex: { type: Number, min: 0, max: 5 },
      explanation: { type: String, maxlength: 1200 }
    }],
    attempts: [{ answers: [Number], score: Number, total: Number, submittedAt: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now }
  }],
  flashcards: [{
    subject: { type: String, default: '', maxlength: 120 },
    topic: { type: String, default: '', maxlength: 180 },
    front: { type: String, required: true, maxlength: 1200 },
    back: { type: String, required: true, maxlength: 3000 },
    starred: { type: Boolean, default: false },
    mastered: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  notes: [{
    subject: { type: String, default: '', maxlength: 120 },
    topic: { type: String, default: '', maxlength: 180 },
    title: { type: String, required: true, maxlength: 180 },
    content: { type: String, required: true, maxlength: 8000 },
    source: { type: String, enum: ['student', 'ai-assisted', 'document'], default: 'student' },
    starred: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  notifications: [{
    type: { type: String, enum: ['exam', 'session', 'recovery', 'summary'], required: true },
    title: { type: String, required: true, maxlength: 180 },
    body: { type: String, required: true, maxlength: 500 },
    readAt: Date,
    scheduledAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  preferences: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    dailyTargetMinutes: { type: Number, default: 120, min: 15, max: 720 },
    reminders: { type: mongoose.Schema.Types.Mixed, default: { exam: true, session: true, recovery: true, summary: false } },
    streaksEnabled: { type: Boolean, default: true }
  },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false, minimize: false });

studyWorkspaceSchema.index({ accountId: 1, updatedAt: -1 });
module.exports = mongoose.model('StudyWorkspace', studyWorkspaceSchema);
