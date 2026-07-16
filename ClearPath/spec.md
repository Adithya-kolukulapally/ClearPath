ClearPath — AI-Powered Backlog Clearing Planner

Full Project Blueprint (MERN Stack)


1. Project Overview

One-liner: A MERN stack web app where students submit their backlog data and instantly get an AI-generated plan covering clearing order, deadlines, and eligibility impact.

Stack: MongoDB, Express.js, React.js, Node.js + Claude API for the reasoning layer.


2. Problem Statement

Students with academic backlogs face three compounding issues that no existing system addresses together:


No clear clearing strategy — students don't know which backlog to clear first, since prerequisite chains, current-semester workload, and exam date clashes are never considered together. This often leads to poor sequencing, repeated failures, or unnecessary delays.
Missed deadlines — backlog exam forms, revaluation windows, and re-registration dates are scattered across notices and semesters. Students juggling multiple attempts lose track and miss entire exam cycles, adding another semester of delay.
Invisible consequences — students don't realize how their current backlogs are silently blocking placements, higher-study eligibility, or scholarships until the opportunity is already gone — by which point it's too late to act.


Individually these are planning failures. Together, they mean a student can be actively working toward clearing backlogs in the wrong order, missing the very deadlines needed to clear them, while unknowingly disqualifying themselves from opportunities they care about — all at once, with no single place showing them the full picture.


3. Solution

ClearPath gives every backlog student one dashboard that answers three questions: what should I clear first, when is it due, and what does clearing it unlock?


Smart Sequencing Engine — maps prerequisite chains + current semester exam calendar + workload to recommend the optimal order to clear backlogs, avoiding clashes and dead-end sequencing.
Deadline Tracker — pulls university exam/re-registration/revaluation schedules and sends timely reminders per backlog, per attempt, so no cycle is missed.
Impact Simulator — shows in real time which placements, higher-study programs, or scholarships are currently blocked by existing backlogs, and what clearing a specific paper unlocks.


At the core, a single AI call takes the student's full profile (backlogs, current courses, CGPA, attendance, target) along with prerequisite data, the exam calendar, and eligibility rules, and reasons across all of them together — returning a structured, explainable plan rather than three disconnected outputs. This turns an abstract, stressful problem into a concrete, motivating roadmap: from "I have backlogs and don't know where to start" to "here's my exact plan, deadlines, and what I'm working toward."


4. System Architecture

┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React (UI)     │ ───► │  Express/Node API │ ───► │   Claude API     │
│  - Student form  │      │  - Auth           │      │  (reasoning)     │
│  - Dashboard      │ ◄── │  - Data endpoints │ ◄──  │                  │
│  - Chat box       │      │  - AI orchestration│     └─────────────────┘
└─────────────────┘      └──────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │    MongoDB        │
                          │  - Students        │
                          │  - Courses          │
                          │  - ExamCalendar     │
                          │  - EligibilityRules │
                          │  - SavedPlans       │
                          └──────────────────┘

Flow: Student fills form → Express API fetches courses/calendar/rules from MongoDB → builds prompt → calls Claude API → parses JSON response → saves plan to MongoDB → returns to React → renders dashboard.


5. Database Schema (MongoDB / Mongoose)

Student

js{
  name: String,
  email: String,
  currentSemester: Number,
  currentCourses: [String],
  cgpa: Number,
  attendance: Number,
  target: String, // "placement" | "higher_studies" | "scholarship"
  createdAt: Date
}

Backlog

js{
  studentId: ObjectId,
  course: String,
  semester: Number,
  attempts: Number,
  status: String // "pending" | "cleared"
}

Course

js{
  name: String,
  semester: Number,
  prerequisites: [String] // course names
}

ExamCalendar

js{
  course: String,
  formDeadline: Date,
  examDate: Date,
  cycle: String // e.g. "2026-Odd"
}

EligibilityRule

js{
  name: String,        // "TCS Placement Drive"
  maxBacklogs: Number,
  minCgpa: Number,
  type: String          // "placement" | "scholarship" | "higher_studies"
}

SavedPlan

js{
  studentId: ObjectId,
  planJson: Object,     // the full AI-generated response
  generatedAt: Date
}


6. Backend Setup (Express + Node)

Folder structure

/server
  /models        → Student.js, Backlog.js, Course.js, ExamCalendar.js, EligibilityRule.js, SavedPlan.js
  /routes         → studentRoutes.js, planRoutes.js, adminRoutes.js
  /controllers   → planController.js
  /services       → aiService.js
  /config         → db.js
  server.js

Key packages

bashnpm install express mongoose cors dotenv node-fetch

config/db.js

javascriptconst mongoose = require('mongoose');
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
};
module.exports = connectDB;

services/aiService.js — the core AI integration

javascriptasync function generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules) {
  const prompt = `You are an academic advisor AI. Analyze this student's backlog data 
and return ONLY valid JSON (no markdown, no extra text) in this exact structure:

{
  "clearing_order": [{"course": "", "reason": "", "priority_rank": 1}],
  "deadline_alerts": [{"course": "", "deadline": "", "days_left": 0, "urgency": "high/medium/low"}],
  "eligibility_impact": [{"opportunity": "", "currently_eligible": false, "blocking_courses": [], "advice": ""}],
  "risk_assessment": {"level": "low/medium/high", "reason": ""},
  "summary_message": ""
}

STUDENT DATA: ${JSON.stringify(studentData)}
PREREQUISITES: ${JSON.stringify(prerequisites)}
EXAM CALENDAR: ${JSON.stringify(examCalendar)}
ELIGIBILITY RULES: ${JSON.stringify(eligibilityRules)}
Today's date: ${new Date().toISOString().split('T')[0]}

Instructions:
- Sequence backlogs respecting prerequisites AND exam date proximity.
- Calculate days_left for each deadline from today.
- For eligibility_impact, name exactly which backlog(s) block each rule.
- Be specific and actionable, not generic.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("AI response parse failed:", err, text);
    throw new Error("Failed to parse AI response");
  }
}

module.exports = { generateBacklogSolution };

controllers/planController.js

javascriptconst Backlog = require('../models/Backlog');
const Course = require('../models/Course');
const ExamCalendar = require('../models/ExamCalendar');
const EligibilityRule = require('../models/EligibilityRule');
const SavedPlan = require('../models/SavedPlan');
const { generateBacklogSolution } = require('../services/aiService');

exports.generatePlan = async (req, res) => {
  try {
    const studentData = req.body; // { name, currentSemester, currentCourses, backlogs, cgpa, attendance, target }

    const courses = await Course.find({});
    const prerequisites = {};
    courses.forEach(c => prerequisites[c.name] = c.prerequisites);

    const examCalendar = {};
    const calendarDocs = await ExamCalendar.find({});
    calendarDocs.forEach(e => examCalendar[e.course] = { formDeadline: e.formDeadline, examDate: e.examDate });

    const eligibilityRules = await EligibilityRule.find({});

    const solution = await generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules);

    await SavedPlan.create({ studentId: req.body.studentId, planJson: solution, generatedAt: new Date() });

    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

routes/planRoutes.js

javascriptconst express = require('express');
const router = express.Router();
const { generatePlan } = require('../controllers/planController');

router.post('/generate', generatePlan);

module.exports = router;

server.js

javascriptrequire('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const planRoutes = require('./routes/planRoutes');

const app = express();
app.use(cors());
app.use(express.json());
connectDB();

app.use('/api/plan', planRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

.env

MONGO_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_api_key
PORT=5000


7. Frontend Setup (React.js)

Folder structure

/client
  /src
    /components   → StudentForm.jsx, Dashboard.jsx, ClearingOrder.jsx, DeadlineAlerts.jsx, EligibilityCards.jsx, RiskBadge.jsx
    /services      → api.js
    App.jsx
    index.js

services/api.js

javascriptconst API_BASE = "http://localhost:5000/api";

export async function fetchPlan(studentData) {
  const res = await fetch(`${API_BASE}/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData)
  });
  return res.json();
}

components/StudentForm.jsx

jsximport { useState } from "react";

export default function StudentForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    currentSemester: 5,
    currentCourses: "",
    cgpa: "",
    attendance: "",
    target: "placement",
    backlogs: [{ course: "", semester: "", attempts: 1 }]
  });

  const handleBacklogChange = (i, field, value) => {
    const updated = [...form.backlogs];
    updated[i][field] = value;
    setForm({ ...form, backlogs: updated });
  };

  const addBacklog = () =>
    setForm({ ...form, backlogs: [...form.backlogs, { course: "", semester: "", attempts: 1 }] });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      currentCourses: form.currentCourses.split(",").map(c => c.trim())
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Name" value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Current Semester" type="number" value={form.currentSemester}
        onChange={e => setForm({ ...form, currentSemester: e.target.value })} />
      <input placeholder="Current Courses (comma separated)" value={form.currentCourses}
        onChange={e => setForm({ ...form, currentCourses: e.target.value })} />
      <input placeholder="CGPA" type="number" step="0.1" value={form.cgpa}
        onChange={e => setForm({ ...form, cgpa: e.target.value })} />
      <input placeholder="Attendance %" type="number" value={form.attendance}
        onChange={e => setForm({ ...form, attendance: e.target.value })} />

      <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}>
        <option value="placement">Placement</option>
        <option value="higher_studies">Higher Studies</option>
        <option value="scholarship">Scholarship</option>
      </select>

      <h4>Backlogs</h4>
      {form.backlogs.map((b, i) => (
        <div key={i}>
          <input placeholder="Course" value={b.course}
            onChange={e => handleBacklogChange(i, "course", e.target.value)} />
          <input placeholder="Semester" type="number" value={b.semester}
            onChange={e => handleBacklogChange(i, "semester", e.target.value)} />
          <input placeholder="Attempts" type="number" value={b.attempts}
            onChange={e => handleBacklogChange(i, "attempts", e.target.value)} />
        </div>
      ))}
      <button type="button" onClick={addBacklog}>+ Add Backlog</button>
      <button type="submit">Generate Plan</button>
    </form>
  );
}

components/Dashboard.jsx

jsxexport default function Dashboard({ solution }) {
  if (!solution) return null;

  return (
    <div>
      <div className="summary-banner">{solution.summary_message}</div>

      <h3>Clearing Order</h3>
      <ol>
        {solution.clearing_order.map((item, i) => (
          <li key={i}><strong>{item.course}</strong> — {item.reason}</li>
        ))}
      </ol>

      <h3>Deadline Alerts</h3>
      {solution.deadline_alerts.map((d, i) => (
        <div key={i} className={`alert-${d.urgency}`}>
          {d.course}: {d.deadline} ({d.days_left} days left)
        </div>
      ))}

      <h3>Eligibility Impact</h3>
      {solution.eligibility_impact.map((e, i) => (
        <div key={i}>
          <strong>{e.opportunity}</strong> — {e.currently_eligible ? "Eligible" : "Not Eligible"}
          <p>{e.advice}</p>
        </div>
      ))}

      <h3>Risk Assessment</h3>
      <p>Level: {solution.risk_assessment.level} — {solution.risk_assessment.reason}</p>
    </div>
  );
}

App.jsx

jsximport { useState } from "react";
import StudentForm from "./components/StudentForm";
import Dashboard from "./components/Dashboard";
import { fetchPlan } from "./services/api";

export default function App() {
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    setLoading(true);
    const result = await fetchPlan(data);
    setSolution(result);
    setLoading(false);
  };

  return (
    <div className="app">
      <h1>Backlog Clearing Planner</h1>
      <StudentForm onSubmit={handleSubmit} />
      {loading && <p>Generating your plan...</p>}
      <Dashboard solution={solution} />
    </div>
  );
}


8. Seed Data (for demo)

Create a seed.js script to populate MongoDB with sample courses, exam calendar, and eligibility rules (same mock data used in the earlier example — DBMS, OS, DSA, prerequisites, deadlines, TCS drive rule etc.) so the demo works out of the box.


9. Build Timeline (24–36 hr hackathon)

TimeTask0–2 hrsFinalize schema, write seed data (courses, calendar, rules)2–5 hrsBackend: models, DB connection, seed script5–9 hrsBackend: aiService.js + planController + test with Postman9–14 hrsFrontend: StudentForm component14–19 hrsFrontend: Dashboard component + styling19–22 hrsConnect frontend ↔ backend, test full flow22–26 hrsPolish UI, add loading states, error handling26–30 hrsPrepare demo persona + walkthrough scriptRemainingBuffer for bugs, deployment (optional: Vercel for React, Render for Express)


10. Stretch Features (if time remains)


Chat box for "ask about your eligibility" using the same Claude API with student data as context.
Deadline email reminders via Nodemailer (cron job checking ExamCalendar daily).
Login/auth with JWT so students can save and revisit their plan.
Admin panel to let colleges upload their own course/prerequisite/calendar data instead of hardcoded seed data.



11. Demo Script (for judges)


Show the problem in 2 sentences (backlog students don't know order, deadlines, or consequences).
Fill the form live with a sample student (3 backlogs, mixed attempts).
Hit submit → show the AI-generated plan rendering in real time.
Walk through each section: clearing order → deadlines → eligibility impact → risk.
Close with: "One AI call reasoning across prerequisites, deadlines, and eligibility rules together — output is structured, explainable, and instantly actionable."