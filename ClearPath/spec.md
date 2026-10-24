# ClearPath 2.0 — Feature Addition Specification

**Document type:** Product and Technical Specification  
**Project:** ClearPath — AI-Powered Academic Backlog Management  
**Version:** 2.0  
**Status:** Proposed  
**Primary goal:** Extend the existing ClearPath application with AI-assisted planning, learning, assessment, and progress recovery.

---

## 1. Product Overview

ClearPath helps students organize academic backlogs and prepare for examinations with structured, achievable study plans. ClearPath 2.0 adds an AI-assisted academic recovery workflow so students can plan their work, learn difficult topics, practice questions, and adjust their plans when they fall behind.

### Product principles

- Plans must respect exam dates, available study time, and user priorities.
- Students should understand why a topic or task is prioritized.
- AI-generated material must be presented as assistance, not guaranteed academic advice or guaranteed exam predictions.
- Students must be able to edit, regenerate, pause, or dismiss generated plans.
- Existing ClearPath functionality must continue to work.
- Uploaded documents and student data must be handled securely.

## 2. Goals and Success Metrics

### Goals

1. Create personalized study plans from student and subject details.
2. Explain concepts and generate revision material through an AI tutor.
3. Extract syllabus topics and questions from uploaded documents.
4. Recover plans automatically when study sessions are missed.
5. Track topic mastery and identify areas that need more practice.
6. Provide transparent progress and risk indicators.
7. Deliver reminders without overwhelming students.

### Suggested success metrics

- Percentage of generated plans accepted or edited and used.
- Study sessions completed versus planned.
- Weekly active students and return rate.
- Quiz completion rate and change in topic-level scores.
- Percentage of document uploads successfully processed.
- AI response latency, failure rate, and estimated cost per active student.
- Reminder opt-out rate and user-reported usefulness.

Do not treat predicted pass probability as a guaranteed or validated outcome.

## 3. Target Users

### Student
- Adds semesters, subjects, backlogs, syllabus topics, and exam dates.
- Creates and follows a study plan.
- Uses the AI tutor, notes, quizzes, and revision tools.
- Tracks progress and receives reminders.

### Optional administrator
- Manages supported subjects and platform configuration.
- Reviews system-level operational metrics.
- Does not have default access to private student notes, chat histories, or documents.

## 4. Scope

### In scope for ClearPath 2.0

- Smart AI study planner
- AI tutor
- Syllabus, notes, and previous-question-paper PDF analysis
- Automatic plan rescheduling
- Topic mastery and weak-topic detection
- Practice quizzes and mock tests
- Backlog readiness and risk indicators
- Daily goals, streaks, and progress analytics
- Notifications and reminders
- Revision flashcards and notes
- Responsive dashboard and accessibility improvements
- Secure upload, error handling, and basic operational monitoring

### Later enhancements

- Study groups and peer accountability
- Voice-based study assistant
- Calendar synchronization
- Parent or mentor progress sharing with explicit student consent
- Additional language support
- Paid plans and subscription billing

These later enhancements should not delay delivery of the core workflow.

## 5. Existing Application and Compatibility

Start by auditing the existing repository, routes, components, authentication, database models, deployment settings, and current `/api/plan` functionality. Reuse working code wherever possible.

### Existing stack

- Frontend: React
- Backend: Node.js and Express
- Database: MongoDB / MongoDB Atlas
- AI: Provider-agnostic LLM API integration
- File processing: PDF text extraction and optional OCR
- Deployment: Existing frontend and backend hosting, including Render if still in use

### Compatibility requirements

- Preserve existing API contracts unless a versioned migration is required.
- Keep AI provider keys on the server only.
- Use environment variables for secrets and configuration.
- Validate and authorize all API requests.
- Do not store large PDF binaries directly in MongoDB by default. Use a controlled object-storage service or temporary processing storage, and retain only what is necessary.
- Make new features modular so a failure in one AI feature does not break backlog management.

## 6. Main User Flow

1. Student signs in and opens the dashboard.
2. Student adds or imports semester, subject, backlog, exam date, available hours, and topic difficulty details.
3. ClearPath validates the information and identifies missing inputs.
4. Study Planner proposes a schedule with tasks, estimated duration, priorities, and revision sessions.
5. Student reviews and confirms the schedule.
6. Student completes tasks, records progress, and takes quizzes.
7. The app updates topic mastery and readiness indicators.
8. If a task is missed or an exam date changes, the student can request plan recovery.
9. ClearPath reschedules remaining tasks within available time and highlights any workload that cannot realistically fit.
10. The dashboard displays progress, upcoming deadlines, and recommended next actions.

## 7. Functional Requirements

### 7.1 Smart AI Study Planner

**Purpose:** Generate a practical, editable study plan for the student's remaining workload.

**Inputs**
- Subjects and topics
- Exam dates and exam order
- Current preparation or mastery level
- Topic difficulty and estimated effort
- Available study hours by day
- Preferred study windows, if supplied
- Existing tasks and completed topics
- Revision and practice requirements

**Behavior**
- Validate that exam dates are in the future or clearly flag past dates.
- Prioritize topics using deadline, effort, difficulty, and student-reported weakness.
- Split large topics into manageable sessions.
- Include breaks and revision/practice sessions where possible.
- Avoid overlapping tasks and exceeding the user's declared daily capacity.
- Explain why the plan was generated.
- Allow the student to edit, regenerate, accept, or discard the proposed plan.
- Flag infeasible plans instead of silently overloading the schedule.

**Acceptance criteria**
- The student can generate and save a plan from valid backlog details.
- The schedule respects configured availability and exam dates where feasible.
- The student can mark tasks complete, skipped, or partially complete.
- Regeneration preserves completed tasks unless the student explicitly chooses otherwise.

### 7.2 AI Tutor

**Purpose:** Explain academic topics at the student's level and support revision.

**Capabilities**
- Explain a concept in simple language.
- Provide examples and step-by-step explanations.
- Generate short revision notes.
- Generate practice questions and flashcards.
- Support requested answer lengths such as 2-mark, 5-mark, and 10-mark formats.
- Use the student's selected subject and uploaded reference material when available.
- Identify when the supplied context is insufficient and ask a clarifying question.

**Requirements**
- Show that AI responses may contain errors.
- Do not claim that generated answers exactly match an official marking scheme unless a verified scheme was provided.
- Keep chat history private and provide a clear delete option.
- Apply rate limits and usage limits to control cost.
- Do not allow document contents or chat input to override system security instructions.

**Acceptance criteria**
- A student can ask a question in a selected subject and receive a relevant response.
- The student can request a shorter explanation, example, or practice question.
- If retrieval from uploaded material is used, show the relevant document/page reference where available.

### 7.3 Syllabus and PDF Analyzer

**Purpose:** Turn syllabus documents, notes, and previous question papers into usable study resources.

**Supported inputs**
- PDF files in the first release
- Text-based PDFs initially
- Scanned PDFs through OCR if enabled
- Configurable file size, page count, and processing limits

**Processing pipeline**
1. Validate file type, size, and page count.
2. Store the file in private temporary or object storage.
3. Extract text and page boundaries; run OCR only when required.
4. Classify the document as syllabus, notes, or question paper, allowing user correction.
5. Extract candidate subjects, units, topics, and questions.
6. Show the extracted content for student review.
7. Save approved topics and references to the student's workspace.
8. Delete temporary files according to the retention policy.

**Requirements**
- Treat document text as untrusted input.
- Reject unsupported or encrypted files with a useful error message.
- Avoid duplicate topic creation where possible.
- Preserve page references for traceability.
- Do not silently invent missing syllabus details.

**Acceptance criteria**
- A student can upload a valid PDF and see processing status.
- Extracted topics can be reviewed, edited, and approved before they affect a plan.
- Failed processing gives a retry option and does not corrupt existing data.

### 7.4 Previous Question Paper Intelligence

**Purpose:** Help students understand patterns in papers they provide.

**Capabilities**
- Extract questions and map them to approved syllabus topics.
- Group similar questions and identify repeated themes across uploaded papers.
- Show the number of supplied papers analyzed and the date range when known.
- Highlight topic coverage and gaps.
- Generate practice questions inspired by topic coverage, clearly labeled as AI-generated.

**Guardrails**
- Never claim a question will appear in a future examination.
- Show the source paper and page when possible.
- Distinguish extracted questions from AI-generated practice questions.
- Explain that pattern analysis is limited by the documents supplied.

### 7.5 Automatic Plan Rescheduling

**Purpose:** Recover from missed sessions or changed exam dates.

**Triggers**
- Student marks a session missed.
- Student changes an exam date or daily availability.
- Student requests a plan refresh.
- A task remains incomplete after its scheduled time.

**Behavior**
- Keep completed tasks unchanged by default.
- Recalculate remaining effort and available study slots.
- Prioritize deadlines and high-importance topics.
- Preserve breaks and daily capacity.
- Offer options when the remaining workload does not fit.
- Show a before/after summary and ask for confirmation before applying significant changes.

**Acceptance criteria**
- Missed tasks can be rescheduled without duplicating tasks.
- Completed tasks remain completed.
- Infeasible workload is clearly flagged with options such as increasing availability, reducing optional revision, or seeking help.
- Changes are recorded in a plan history.

### 7.6 Topic Mastery and Weak-Topic Detection

**Purpose:** Recommend revision based on evidence of student performance.

**Signals**
- Quiz accuracy
- Number of attempts
- Time since last revision
- Student confidence rating
- Task completion history

**Behavior**
- Calculate a transparent topic-level mastery indicator.
- Mark topics as “needs practice,” “in progress,” or “strong” using configurable thresholds.
- Recommend extra questions or revision for weak topics.
- Explain which evidence led to a recommendation.
- Allow students to correct inaccurate topic status.

Do not infer mastery from time spent alone.

### 7.7 Practice Quizzes and Mock Tests

**Capabilities**
- Generate topic-specific MCQs and short-answer questions.
- Support timed and untimed attempts.
- Score objective questions automatically.
- Provide explanations after submission.
- Record attempts and topic-level results.
- Allow students to retry missed questions.
- Generate a mock test from selected subjects and topics.

**Requirements**
- Label AI-generated questions.
- Validate that a quiz has enough questions before starting.
- Avoid exposing correct answers before submission in test mode.
- Treat AI scoring of free-text answers as indicative unless checked against a defined rubric.

### 7.8 Readiness and Backlog Risk Indicators

**Purpose:** Show where preparation may be falling behind.

**Inputs**
- Days remaining until exam
- Estimated effort remaining
- Available study time
- Completed versus planned sessions
- Recent quiz performance
- Topic coverage

**Output**
- On track, needs attention, or high risk
- Main contributing factors
- Recommended next actions
- Last updated timestamp and confidence/limitations note

**Requirements**
- Start with a transparent rules-based score.
- Do not present the score as a validated probability of passing.
- Explain the factors behind each status.
- Update the status as progress changes.
- Do not shame or penalize students for low progress.

### 7.9 Daily Goals, Streaks, and Analytics

**Dashboard widgets**
- Backlogs remaining
- Upcoming exams
- Today's study plan
- Completed versus planned study time
- Subject and topic progress
- Quiz performance trend
- Topics needing attention
- Current study streak and weekly activity
- Suggested next action

**Behavior**
- Let students set a realistic daily target.
- Count a streak only according to a documented rule.
- Allow students to pause or disable streak features.
- Provide weekly summaries without presenting activity as a measure of personal worth.

### 7.10 Notifications and Reminders

**Channels**
- In-app notifications first
- Email or web push as optional later channels

**Notification types**
- Upcoming exam
- Scheduled study session
- Missed session and recovery suggestion
- Daily or weekly progress summary

**Requirements**
- Respect user time zone and notification preferences.
- Provide opt-in/opt-out controls by notification type.
- Avoid repeated or excessive reminders.
- Do not send sensitive academic details in email subject lines.
- Use a reliable job scheduler or queue if scheduled delivery is added.

### 7.11 Notes and Flashcards

- Generate revision notes from approved topics or supplied documents.
- Create question/answer flashcards.
- Allow editing, starring, and marking a card as mastered.
- Link cards to a subject and topic.
- Keep generated content distinguishable from source material.

## 8. User Interface Requirements

### Main navigation
- Dashboard
- My Backlogs
- Study Planner
- AI Tutor
- Documents
- Practice & Mock Tests
- Notes & Flashcards
- Progress & Analytics
- Settings

### Required screens

1. **Dashboard:** summary cards, today's plan, exam countdowns, weak topics, and next action.
2. **Backlog management:** semester, subject, topic, exam date, difficulty, and status.
3. **Plan builder:** inputs, availability editor, plan preview, conflict warnings, and confirmation.
4. **Study calendar:** day/week views, task status, and reschedule controls.
5. **AI Tutor:** subject selector, chat, reference context, and response actions.
6. **Document center:** upload, processing status, extracted topics/questions, review, and delete.
7. **Quiz interface:** instructions, timer where applicable, question navigation, submission, and results.
8. **Analytics:** progress trends, mastery, completion, and readiness explanations.
9. **Settings:** profile, time zone, notifications, data export/delete, and privacy choices.

### UI principles
- Professional, clean, student-friendly design.
- Responsive on mobile, tablet, and desktop.
- Clear loading, empty, success, and error states.
- Accessible labels, keyboard navigation, and sufficient contrast.
- Do not rely on color alone to communicate risk or progress.
- Confirm destructive actions and major schedule changes.

## 9. Suggested Technical Architecture

```text
React Frontend
    |
    | HTTPS / JSON
    v
Node.js + Express API
    |
    +-- Authentication and Authorization
    +-- Backlog and Subject Service
    +-- Study Planning Service
    +-- Plan Recovery Service
    +-- AI Tutor Service
    +-- Document Processing Service
    +-- Quiz and Analytics Service
    +-- Notification Service
    |
    +-- MongoDB
    +-- Private Object Storage (uploaded files)
    +-- LLM Provider API
    +-- Optional OCR / background job queue
```

### Architectural guidance
- Keep deterministic scheduling, validation, and risk rules in normal application code.
- Use the LLM for explanations, topic extraction, question generation, and personalized language.
- Validate AI output against a schema before storing or displaying it.
- Use background jobs for long PDF/OCR tasks.
- Add request IDs, structured logs, timeouts, retries, and provider error handling.
- Use a provider adapter so the LLM provider can be changed without rewriting feature logic.

## 10. Suggested API Endpoints

Use the existing API conventions and authentication strategy. These routes are proposals and should be adapted after repository review.

### Backlogs and plans
- `GET /api/backlogs` — list the student's backlogs
- `POST /api/backlogs` — create a backlog
- `PATCH /api/backlogs/:id` — update a backlog
- `DELETE /api/backlogs/:id` — delete a backlog
- `POST /api/plans/generate` — generate a plan proposal
- `GET /api/plans/:id` — retrieve a plan
- `PATCH /api/plans/:id` — update plan settings or task status
- `POST /api/plans/:id/reschedule` — generate a recovery proposal
- `POST /api/plans/:id/apply-reschedule` — confirm and apply recovery

### AI and documents
- `POST /api/ai/tutor` — ask the tutor a question
- `POST /api/documents` — request a secure upload or create an upload session
- `GET /api/documents/:id/status` — check processing status
- `GET /api/documents/:id/extractions` — retrieve extracted content
- `PATCH /api/documents/:id/extractions` — edit or approve extracted topics
- `DELETE /api/documents/:id` — delete a document and related derived data as appropriate
- `POST /api/documents/:id/analyze-papers` — analyze uploaded question papers

### Practice and analytics
- `POST /api/quizzes/generate` — generate a quiz
- `POST /api/quizzes/:id/attempts` — submit an attempt
- `GET /api/progress/summary` — retrieve dashboard analytics
- `GET /api/progress/topics` — retrieve topic mastery indicators
- `GET /api/notifications` — list notifications
- `PATCH /api/notifications/preferences` — update preferences

### API requirements
- Return consistent JSON error objects with stable error codes.
- Validate request bodies, query parameters, and path IDs.
- Authenticate every private endpoint and enforce ownership at the database query level.
- Apply rate limits to expensive AI and upload endpoints.
- Never trust a student ID supplied by the client as proof of ownership.

## 11. Suggested MongoDB Data Models

Adapt field names to existing models; do not create duplicate collections if equivalent structures already exist.

### User
- `_id`
- `name`
- `email`
- `timezone`
- `preferences`: language, reminders, daily target
- `createdAt`, `updatedAt`

### Subject / Backlog
- `_id`
- `userId`
- `semester`
- `subjectName`
- `examDate`
- `topics[]`: title, estimatedMinutes, difficulty, status, mastery
- `priority`
- `createdAt`, `updatedAt`

### StudyPlan
- `_id`
- `userId`
- `status`: draft, active, completed, archived
- `startDate`
- `examDates[]`
- `dailyAvailability[]`
- `tasks[]`: topicId, title, date, startTime, durationMinutes, taskType, status
- `version`
- `createdAt`, `updatedAt`

### PlanChange
- `_id`
- `userId`
- `planId`
- `reason`
- `beforeSummary`
- `afterSummary`
- `createdAt`

### Document
- `_id`
- `userId`
- `type`: syllabus, notes, questionPaper, unknown
- `storageKey`
- `status`: uploaded, processing, completed, failed, deleted
- `pageCount`
- `extractions[]`: page, text, topics, questions
- `retentionExpiresAt`
- `createdAt`, `updatedAt`

### Quiz / Attempt
- Quiz: `_id`, `userId`, `subjectId`, `topicIds[]`, `questions[]`, `sourceType`, `createdAt`
- Attempt: `_id`, `userId`, `quizId`, `answers[]`, `score`, `topicResults[]`, `startedAt`, `submittedAt`

### TutorConversation
- `_id`
- `userId`
- `subjectId`
- `messages[]` or a separate message collection for larger histories
- `createdAt`, `updatedAt`

### Notification
- `_id`
- `userId`
- `type`
- `title`
- `body`
- `readAt`
- `scheduledAt`
- `sentAt`
- `createdAt`

### Data and indexing guidance
- Index records by `userId` and commonly filtered dates/status.
- Use pagination for histories and notifications.
- Consider separating large message arrays into individual documents to avoid MongoDB document-size limits.
- Store timestamps consistently and display them in the user's time zone.
- Avoid storing secrets, unnecessary personal data, or raw uploaded documents indefinitely.

## 12. AI Output Contracts

AI responses that drive application behavior must be structured and validated. For example, a plan proposal should include:
- `summary`
- `assumptions[]`
- `tasks[]`
- `warnings[]`
- `unallocatedTopics[]`

Each task should include a topic reference or validated title, date, estimated duration, task type, and rationale.

The server must:
1. Validate the output schema.
2. Check dates, durations, workload capacity, and topic references.
3. Reject or repair invalid output safely.
4. Show warnings where the plan cannot satisfy every constraint.
5. Require user confirmation before applying a significant new schedule.

Do not execute code, database queries, or arbitrary tools based on raw model output.

## 13. Security, Privacy, and Reliability

- Use secure authentication and password handling appropriate to the current auth provider.
- Enforce per-user authorization on all student records and files.
- Keep API keys and storage credentials in environment variables or a secrets manager.
- Validate file MIME type, extension, actual content, size, and page count.
- Use private storage, expiring upload/download links, and malware scanning where available.
- Limit file-processing time, extracted text length, and AI token usage.
- Protect against prompt injection inside uploaded documents.
- Apply rate limits and abuse monitoring.
- Provide data export and deletion controls where feasible.
- Define a retention policy for source files, extracted text, and AI conversation history.
- Log errors and performance metadata, not full private documents or sensitive chat content by default.
- Provide graceful fallback messages when AI or OCR providers are unavailable.
- Add automated backups and verify restoration procedures for production data.

## 14. Performance and Reliability Targets

Initial targets to validate in testing:
- Normal CRUD API requests: p95 under 500 ms, excluding external services.
- Dashboard summary: p95 under 1 second under expected initial load.
- AI tutor: show loading state immediately and apply a configurable timeout.
- PDF analysis: run asynchronously for long jobs and show progress/status.
- No duplicate plan tasks after retries.
- Use idempotency or duplicate-job prevention for uploads and scheduled notifications where appropriate.

These are initial engineering targets, not measured guarantees.

## 15. Testing Strategy

### Unit tests
- Study-priority calculations
- Daily capacity and scheduling constraints
- Plan rescheduling and completed-task preservation
- Risk indicator explanations
- AI output schema validation
- PDF validation and extraction normalization

### Integration tests
- Backlog creation to plan generation
- Plan task completion to analytics updates
- PDF upload to extraction review
- Quiz attempt to mastery update
- Missed task to reschedule proposal and confirmation
- Authorization checks across users

### End-to-end tests
- New student creates a backlog and study plan.
- Student asks the tutor a question.
- Student uploads a syllabus and approves extracted topics.
- Student completes a quiz and sees updated analytics.
- Student misses a session and applies a revised plan.
- Student changes notification preferences and deletes an uploaded document.

### Security tests
- Cross-user data access attempts
- Invalid and oversized uploads
- Rate-limit behavior
- Malformed AI output
- Prompt injection in uploaded files
- Expired or unauthorized file URLs

## 16. Environment Variables

Use names compatible with the existing repository; never commit actual secret values.

```env
MONGO_URI=
JWT_SECRET=
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
FILE_STORAGE_PROVIDER=
FILE_STORAGE_BUCKET=
FILE_STORAGE_ACCESS_KEY=
FILE_STORAGE_SECRET_KEY=
FRONTEND_URL=
APP_TIMEZONE=Asia/Kolkata
```

Only configure storage credentials if external object storage is used. Add separate OCR and email variables only when those services are implemented. Keep `.env` out of version control and provide a `.env.example` containing empty placeholders.

## 17. Implementation Milestones

### Milestone 0 — Repository audit
- Review existing routes, data models, auth, deployment, and current plan generator.
- Document existing API contracts and create a backup before schema changes.
- Identify reusable UI and backend modules.

### Milestone 1 — Core planning
- Improve backlog and topic models.
- Add plan preview, daily capacity, task completion, and progress dashboard.
- Add deterministic rescheduling with confirmation and plan history.

### Milestone 2 — AI Tutor and quizzes
- Add secure LLM adapter and response validation.
- Build tutor interface and topic-based quiz workflow.
- Track attempts and topic performance.

### Milestone 3 — PDF analysis
- Add private upload and asynchronous processing.
- Extract text and page references.
- Add review/approval flow for topics and questions.

### Milestone 4 — Readiness and reminders
- Add transparent readiness rules, weak-topic recommendations, daily goals, and notification preferences.
- Test time zones, duplicate jobs, and opt-out behavior.

### Milestone 5 — Hardening and release
- Add tests, logging, rate limits, privacy controls, and deployment configuration.
- Verify responsive layouts, error states, backup/restore, and production monitoring.
- Release behind feature flags if practical.

## 18. MVP Acceptance Checklist

The addition is ready for an initial release when:
- [ ] Existing ClearPath backlog functionality still works.
- [ ] Students can create, preview, save, and edit a study plan.
- [ ] Study tasks respect availability and show conflicts when the workload is infeasible.
- [ ] Missed tasks can be rescheduled without losing completed work.
- [ ] AI Tutor answers selected-subject questions with error handling.
- [ ] Students can upload and review extracted PDF topics.
- [ ] Students can complete quizzes and see topic-level results.
- [ ] Readiness indicators explain their contributing factors and limitations.
- [ ] Notifications can be configured and disabled.
- [ ] All private APIs and files enforce user ownership.
- [ ] Automated tests cover core flows and failure cases.
- [ ] Deployment secrets are not committed to the repository.

## 19. Out of Scope for the First Release

- Guaranteed exam predictions or guaranteed pass outcomes
- Fully autonomous changes to a student's confirmed plan without review
- Public sharing of private academic records
- Unmoderated public study chat
- Voice assistant and real-time group collaboration
- Payments, subscriptions, and complex institutional administration

## 20. Definition of Done

A feature is complete when its frontend and backend are integrated, input and output validation is implemented, ownership checks are in place, loading/empty/error states are handled, tests pass, configuration is documented, and the feature is verified in the deployed environment.

**Implementation note:** Treat this document as the target specification. First inspect the current ClearPath repository and adapt route names, schemas, authentication, and deployment settings to the actual codebase before implementing changes.

