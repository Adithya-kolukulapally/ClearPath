import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeQuestionPapers, askStudyTutor, clearTutorHistory, createFlashcard, createPracticeQuiz, createStudyNote,
  deleteFlashcard, deleteStudyDocument, deleteStudyNote, deleteWorkspaceData, exportWorkspaceData, fetchWorkspace, recoverStudyTasks,
  submitQuizAttempt, updateFlashcard, updatePreferences, updateStudyDocument, updateStudyNote, updateStudyTask, uploadStudyPdf
} from "../services/api";
import { readinessCheck } from "../services/readiness";

function AppMessage({ error, message }) {
  if (!error && !message) return null;
  return <p className={`study-message${error ? " is-error" : " is-success"}`} role={error ? "alert" : "status"}>{error || message}</p>;
}

function dateInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function topicsForReview(document) {
  return Object.fromEntries((document?.extractions || []).map(page => [String(page.page), (page.topics || []).join("\n")]));
}

function StudyCalendar({ tasks, profile, token, run, reload }) {
  const [mode, setMode] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayKey, setDayKey] = useState("");
  const todayKey = dateInTimezone(new Date(), profile.timeZone || "Asia/Kolkata");
  const today = new Date(`${todayKey}T12:00:00Z`);
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7) + weekOffset * 7);
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const selectedDay = weekKeys.includes(dayKey) ? dayKey : weekKeys[weekOffset === 0 ? Math.max(0, weekKeys.indexOf(todayKey)) : 0];
  const visibleTasks = tasks.filter(task => mode === "day" ? task.date === selectedDay : weekKeys.includes(task.date));
  const formatDate = dateKey => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00Z`));

  return <div className="study-calendar">
    <div className="calendar-toolbar"><div className="calendar-view-switch"><button type="button" aria-pressed={mode === "day"} onClick={() => setMode("day")}>Day</button><button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>Week</button></div><div className="calendar-navigation"><button type="button" aria-label="Previous week" onClick={() => { setWeekOffset(value => value - 1); setDayKey(""); }}>‹</button><strong>{weekKeys[0] && formatDate(weekKeys[0])} – {weekKeys[6] && formatDate(weekKeys[6])}</strong><button type="button" aria-label="Next week" onClick={() => { setWeekOffset(value => value + 1); setDayKey(""); }}>›</button><button type="button" onClick={() => { setWeekOffset(0); setDayKey(todayKey); }}>Today</button></div></div>
    {mode === "week" && <div className="calendar-week-grid">{weekKeys.map((key, index) => { const count = tasks.filter(task => task.date === key && task.status !== "completed").length; return <button type="button" key={key} className={`calendar-day${key === selectedDay ? " selected" : ""}${key === todayKey ? " today" : ""}`} aria-pressed={key === selectedDay} onClick={() => { setDayKey(key); setMode("day"); }}><span>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span><strong>{key.slice(-2)}</strong><small>{count ? `${count} task${count === 1 ? "" : "s"}` : "—"}</small></button>; })}</div>}
    {mode === "day" && <p className="calendar-selected-date">{formatDate(selectedDay)} · {visibleTasks.length} scheduled task{visibleTasks.length === 1 ? "" : "s"}</p>}
    {visibleTasks.length ? <div className="calendar-task-list">{visibleTasks.map(task => <article className="calendar-task" key={task._id}><div><strong>{task.title}</strong><span>{task.subject} · {task.durationMinutes} min</span></div><label className="calendar-date-field">Date<input type="date" value={task.date} min={todayKey} disabled={task.status === "completed"} onChange={event => run(async () => { await updateStudyTask(token, String(task._id), { status: task.status, date: event.target.value }); await reload(); })} /></label><label className="calendar-status-field">Status<select value={task.status} onChange={event => run(async () => { await updateStudyTask(token, String(task._id), { status: event.target.value }); await reload(); })}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="skipped">Skipped</option></select></label></article>)}</div> : <p className="workspace-empty">No tasks are scheduled {mode === "day" ? "for this day" : "this week"}. Select another date or adjust your plan.</p>}
  </div>;
}

export default function StudyTools({ token, studentData, activeSection }) {
  const [workspace, setWorkspace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [subject, setSubject] = useState(studentData.backlogs?.[0]?.course || "");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizCount, setQuizCount] = useState(5);
  const [quizDurationMinutes, setQuizDurationMinutes] = useState(0);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState(null);
  const [cardForm, setCardForm] = useState({ front: "", back: "", subject: studentData.backlogs?.[0]?.course || "", topic: "" });
  const [editingCardId, setEditingCardId] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", subject: studentData.backlogs?.[0]?.course || "", topic: "" });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [lastTutorAnswer, setLastTutorAnswer] = useState("");
  const [revealedCard, setRevealedCard] = useState(null);
  const [pdfType, setPdfType] = useState("unknown");
  const [pdfSubject, setPdfSubject] = useState(studentData.backlogs?.[0]?.course || "");
  const [reviewDoc, setReviewDoc] = useState(null);
  const [reviewTopics, setReviewTopics] = useState("");
  const [preferences, setPreferences] = useState(null);
  const [recoveryPreview, setRecoveryPreview] = useState(null);
  const [paperAnalysis, setPaperAnalysis] = useState(null);
  const [settingsTimeZone, setSettingsTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
  const tutorMessagesRef = useRef(null);

  const reload = async () => {
    const result = await fetchWorkspace(token);
    setWorkspace(result.workspace);
    setPreferences(result.workspace.preferences);
    setSettingsTimeZone(result.workspace.preferences?.timezone || settingsTimeZone);
    return result.workspace;
  };

  useEffect(() => {
    let active = true;
    fetchWorkspace(token).then(result => {
      if (!active) return;
      setWorkspace(result.workspace);
      setPreferences(result.workspace.preferences);
      setSettingsTimeZone(result.workspace.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!quiz || quizSecondsLeft === null || quizSecondsLeft <= 0 || quizResult) return undefined;
    const timer = window.setInterval(() => setQuizSecondsLeft(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [quiz, quizSecondsLeft, quizResult]);

  const run = async action => {
    setBusy(true); setError(""); setMessage("");
    try { return await action(); }
    catch (err) { setError(err.message || "Something went wrong. Please try again."); return null; }
    finally { setBusy(false); }
  };

  const messages = workspace?.tutorMessages || [];
  useEffect(() => {
    const panel = tutorMessagesRef.current;
    if (activeSection === "ai-tutor" && panel) panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
  }, [activeSection, messages.length]);
  const docs = workspace?.documents || [];
  const cards = workspace?.flashcards || [];
  const notes = workspace?.notes || [];
  const tasks = workspace?.tasks || [];
  const allAttempts = (workspace?.quizzes || []).flatMap(item => item.attempts || []);
  const totalAnswered = allAttempts.reduce((total, attempt) => total + (attempt.total || 0), 0);
  const totalCorrect = allAttempts.reduce((total, attempt) => total + (attempt.score || 0), 0);
  const quizAccuracy = totalAnswered ? Math.round(totalCorrect / totalAnswered * 100) : null;
  const readiness = readinessCheck(studentData, tasks);
  const completedDates = new Set(tasks.filter(task => task.status === "completed" && task.completedAt).map(task => dateInTimezone(new Date(task.completedAt), preferences?.timezone)));
  const todayKey = dateInTimezone(new Date(), preferences?.timezone);
  const minutesToday = tasks.filter(task => task.status === "completed" && task.completedAt && dateInTimezone(new Date(task.completedAt), preferences?.timezone) === todayKey).reduce((sum, task) => sum + task.durationMinutes, 0);
  let streak = 0;
  if (preferences?.streaksEnabled) {
    let dateKey = completedDates.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
    while (completedDates.has(dateKey) && streak < 365) { streak += 1; dateKey = shiftDateKey(dateKey, -1); }
  }
  const topicMastery = useMemo(() => {
    const values = new Map();
    for (const item of workspace?.quizzes || []) {
      const attempts = item.attempts || [];
      if (!attempts.length) continue;
      const score = attempts[attempts.length - 1].score / Math.max(1, attempts[attempts.length - 1].total) * 100;
      values.set(item.topic, { score, tries: attempts.length, subject: item.subject });
    }
    return [...values.entries()].map(([topic, data]) => ({ topic, ...data, status: data.score >= 80 ? "Strong" : data.score >= 50 ? "In progress" : "Needs practice" }));
  }, [workspace]);

  const uploadDocument = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    run(async () => {
      const result = await uploadStudyPdf(token, file, { type: pdfType, subject: pdfSubject });
      await reload();
      setMessage(`Extracted content from ${file.name}. Review topics before approving them for your study plan.`);
      setReviewDoc(result.document._id);
      setReviewTopics(topicsForReview(result.document));
    });
  };

  const requestRecovery = () => run(async () => {
    const incomplete = tasks.filter(task => task.status !== "completed");
    if (!incomplete.length) { setMessage("All scheduled tasks are already complete."); return; }
    const result = await recoverStudyTasks(token, { taskIds: incomplete.map(task => String(task._id)), studyDays: studentData.studyDays || [], dailyStudyHours: Number(studentData.dailyStudyHours) || 2 });
    setRecoveryPreview(result);
  });

  return (
    <section className="study-tools" aria-label="ClearPath study tools" hidden={activeSection === "dashboard" || activeSection === "backlogs"}>
      <div className={`study-tools-heading${activeSection === "ai-tutor" ? " clario-hero" : ""}`} hidden={activeSection === "dashboard" || activeSection === "backlogs"}><div><span className="eyebrow">{activeSection === "ai-tutor" ? "✦ CLARIO · YOUR STUDY PARTNER" : "CLEARPATH STUDY TOOLS"}</span><h2>{({ planner: "Build a steady study rhythm", "ai-tutor": "Learn one idea at a time", documents: "Make your study material useful", practice: "Check what you know", notes: "Keep revision close", "study-analytics": "See your progress clearly", settings: "Make ClearPath work for you" })[activeSection]}</h2><p>{({ planner: "Review your schedule and recover missed sessions without losing completed work.", "ai-tutor": "Ask a question, explore an example, and save useful explanations.", documents: "Review extracted content page by page before it shapes your plan.", practice: "Make a focused practice set and review your answers after submitting.", notes: "Edit your notes and keep a personal set of revision cards.", "study-analytics": "Use completed sessions and practice results to choose what to review next.", settings: "Update reminders and privacy controls for your workspace." })[activeSection]}</p></div>{activeSection === "ai-tutor" ? <div className="clario-hero-context"><span className="clario-progress-mark">✦</span><span><small>LEARNING WITH</small><strong>{subject || "Your subjects"}</strong></span></div> : <span className="study-tool-count">{tasks.filter(task => task.status === "completed").length}/{tasks.length} tasks complete</span>}</div>
      <div hidden={activeSection === "dashboard" || activeSection === "backlogs"}><AppMessage error={error} message={message} /></div>

      <section className="workspace-card tool-section" id="planner-tools" hidden={activeSection !== "planner"}>
        <div className="card-heading-row"><div><span className="eyebrow">PLAN RECOVERY</span><h2>Tasks and schedule</h2></div><button type="button" className="tool-secondary-button" onClick={requestRecovery} disabled={busy || !tasks.length}>Reschedule incomplete tasks</button></div>
        {studentData.scheduleWarnings?.length ? <ul className="tool-warning-list">{studentData.scheduleWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}
        {studentData.scheduleAssumptions?.length ? <details className="schedule-assumptions"><summary>How this schedule was estimated</summary><ul>{studentData.scheduleAssumptions.map(item => <li key={item}>{item}</li>)}</ul></details> : null}
        {tasks.length ? <StudyCalendar tasks={tasks} profile={studentData} token={token} run={run} reload={reload} /> : <p className="workspace-empty">No dated tasks yet. Build a plan after selecting your available study days.</p>}
        {recoveryPreview && <div className="recovery-preview"><div><strong>Recovery preview</strong><p>Completed sessions stay unchanged. Review these proposed dates before applying.</p></div>{recoveryPreview.warnings?.length ? <ul className="tool-warning-list">{recoveryPreview.warnings.map(item => <li key={item}>{item}</li>)}</ul> : <ul>{recoveryPreview.proposal?.map(item => <li key={item.taskId}><strong>{item.title}</strong>: {item.previousDate || "Unscheduled"} → {item.date || "No available slot"}</li>)}</ul>}{!recoveryPreview.warnings?.length && <div className="tool-action-row"><button type="button" onClick={() => setRecoveryPreview(null)} className="tool-secondary-button">Keep current plan</button><button type="button" className="tool-primary-button" disabled={busy} onClick={() => run(async () => { await recoverStudyTasks(token, { taskIds: recoveryPreview.proposal.map(item => item.taskId), studyDays: studentData.studyDays || [], dailyStudyHours: Number(studentData.dailyStudyHours) || 2, confirm: true }); await reload(); setRecoveryPreview(null); setMessage("Your incomplete tasks have been rescheduled."); })}>Apply recovery plan</button></div>}</div>}
      </section>

      <section className="tool-section clario-page" id="ai-tutor" hidden={activeSection !== "ai-tutor"}>
        <div className="clario-workspace-grid">
          <section className="clario-conversation workspace-card" aria-label="Clario conversation">
            <div className="clario-chat-header"><span className="clario-avatar" aria-hidden="true">✦</span><div><strong>Clario <small>(AI Tutor)</small></strong><span><i /> Your study partner is ready</span></div><button type="button" className="tool-text-button" disabled={busy || !messages.length} onClick={() => run(async () => { await clearTutorHistory(token); await reload(); setMessage("Your tutor history has been deleted."); })}>Clear history</button></div>
            <div ref={tutorMessagesRef} className="tutor-messages" aria-live="polite">{messages.length ? <>{messages.map((entry, index) => <article className={`tutor-message ${entry.role}`} key={`${entry._id || index}`}><span>{entry.role === "user" ? "You" : `Clario${entry.subject ? ` · ${entry.subject}` : ""}`}</span><p>{entry.content}</p></article>)}{lastTutorAnswer && <div className="clario-inline-save"><span>Want to keep that explanation?</span><button type="button" className="tool-text-button save-tutor-note" disabled={busy} onClick={() => { setNoteForm({ title: `${subject} tutor notes`, content: lastTutorAnswer, subject, topic: "", source: "ai-assisted" }); setEditingNoteId(null); document.getElementById("notes")?.scrollIntoView({ behavior: "smooth" }); }}>Save as a note ↗</button></div>}</> : <div className="tutor-welcome"><span className="tutor-welcome-icon" aria-hidden="true">✦</span><strong>Hi{studentData.name ? ` ${studentData.name.split(" ")[0]}` : ""}! What would you like to learn?</strong><p>I can break down difficult concepts, walk through examples, and help you practice at your pace.</p><div className="tutor-prompt-list" aria-label="Suggested questions">{["Explain a concept simply", "Show me a worked example", "Help me prepare for an exam"].map(prompt => <button type="button" key={prompt} onClick={() => { setTutorQuestion(`${prompt} for ${subject}`); document.querySelector("#ai-tutor textarea")?.focus(); }}>{prompt}<span aria-hidden="true">↗</span></button>)}</div></div>}</div>
            {messages.length > 0 && <div className="clario-followups" aria-label="Quick follow-up prompts">{["Explain simply", "Give an example", "Quiz me"].map((prompt, index) => <button type="button" key={prompt} onClick={() => setTutorQuestion(`${prompt} about ${subject}`)}><span aria-hidden="true">{["✦", "⌘", "▤"][index]}</span>{prompt}</button>)}</div>}
            <form className="tool-form tutor-form" onSubmit={event => { event.preventDefault(); run(async () => { const result = await askStudyTutor(token, { question: tutorQuestion, subject }); setTutorQuestion(""); setLastTutorAnswer(result.answer); await reload(); setMessage(result.disclaimer); }); }}>
              <label className="clario-subject-label"><span>Subject</span><select value={subject} onChange={event => setSubject(event.target.value)}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label>
              <label className="grow-label"><span className="sr-only">Your question</span><textarea maxLength={2000} rows={2} value={tutorQuestion} onChange={event => setTutorQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Ask anything about ${subject || "your subject"}, or type / for quick actions…`} required /><small className="tutor-input-hint">Enter to send · Shift + Enter for a new line</small></label>
              <button className="tool-primary-button tutor-submit-button" type="submit" disabled={busy || !tutorQuestion.trim()}><span aria-hidden="true">{busy ? "◌" : "✦"}</span>{busy ? "Thinking…" : "Ask Clario"}</button>
            </form>
          </section>

          <aside className="clario-learning-panel" aria-label="Clario learning tools and history">
            <section className="clario-panel-section clario-quick-tools"><div className="clario-panel-heading"><h3><span aria-hidden="true">✦</span> Learning tools</h3><span>QUICK ACTIONS</span></div><div className="clario-tool-grid">{[{ title: "Explain a concept", detail: "Get a simple explanation", prompt: "Explain the key concept simply", icon: "✺", tone: "violet" }, { title: "Worked example", detail: "Follow each step", prompt: "Show me a step-by-step worked example", icon: "⌘", tone: "blue" }, { title: "Practice quiz", detail: "Check what you know", prompt: "Quiz me with one practice question at a time", icon: "▣", tone: "green" }, { title: "Summarize notes", detail: "Review the key points", prompt: "Give me concise revision notes on", icon: "▤", tone: "orange" }].map(tool => <button type="button" className={`clario-tool-card tone-${tool.tone}`} key={tool.title} onClick={() => { setTutorQuestion(`${tool.prompt} ${subject}`); document.querySelector("#ai-tutor textarea")?.focus(); }}><span className="clario-tool-icon" aria-hidden="true">{tool.icon}</span><strong>{tool.title}</strong><small>{tool.detail}</small><span className="clario-tool-arrow" aria-hidden="true">↗</span></button>)}</div></section>
            <section className="clario-panel-section clario-trail"><div className="clario-panel-heading"><h3><span aria-hidden="true">◷</span> Your learning trail</h3><span>{messages.filter(entry => entry.role === "user").length} asked</span></div><p className="clario-list-label">RECENT QUESTIONS</p>{messages.filter(entry => entry.role === "user").slice(-3).reverse().map((entry, index) => <button type="button" className="clario-history-row" key={entry._id || index} onClick={() => { setTutorQuestion(entry.content); document.querySelector("#ai-tutor textarea")?.focus(); }}><span>▣</span><strong>{entry.content}</strong><small>{entry.subject || subject}</small></button>)}{!messages.some(entry => entry.role === "user") && <p className="clario-empty-trail">Your recent questions will appear here.</p>}</section>
            <section className="clario-panel-section clario-saved"><div className="clario-panel-heading"><h3><span aria-hidden="true">♧</span> Saved explanations</h3><span>{notes.filter(note => note.source === "ai-assisted").length} saved</span></div>{notes.filter(note => note.source === "ai-assisted").slice(-2).reverse().map(note => <button type="button" className="clario-history-row" key={note._id} onClick={() => { setTutorQuestion(`Can you help me review this saved explanation: ${note.title}? ${note.content}`); document.querySelector("#ai-tutor textarea")?.focus(); }}><span>▤</span><strong>{note.title}</strong><small>{note.subject}</small></button>)}{!notes.some(note => note.source === "ai-assisted") && <p className="clario-empty-trail">Save useful replies to find them here.</p>}</section>
            <div className="clario-panel-art" aria-hidden="true"><span>Better learning,<br />one question at a time.</span><i>✧</i></div>
          </aside>
        </div>
      </section>

      <section className="workspace-card tool-section" id="documents" hidden={activeSection !== "documents"}>
        <div className="card-heading-row"><div><span className="eyebrow">DOCUMENT CENTER</span><h2>Analyze a syllabus or paper</h2></div><span className="small-count">PDF · up to 10 MB / 300 pages</span></div>
        <p className="tool-disclaimer">Text-based, unprotected PDFs only. Scanned pages and complex font encoding require OCR. Extracted content is untrusted and needs your review before it can guide a plan.</p>
        <div className="tool-upload-row"><label>Document type<select value={pdfType} onChange={event => setPdfType(event.target.value)}><option value="unknown">Let me review the type</option><option value="syllabus">Syllabus</option><option value="notes">Study notes</option><option value="questionPaper">Previous question paper</option></select></label><label>Related subject<select value={pdfSubject} onChange={event => setPdfSubject(event.target.value)}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label><label className="tool-file-button">Choose PDF<input type="file" accept="application/pdf,.pdf" onChange={uploadDocument} disabled={busy} /></label></div>
        <div className="paper-analysis-action"><button type="button" className="tool-secondary-button" disabled={busy || docs.filter(document => document.type === "questionPaper" && document.approved).length < 2} onClick={() => run(async () => { setPaperAnalysis(await analyzeQuestionPapers(token)); })}>Compare reviewed question papers</button><span>Patterns use only approved papers; ClearPath does not predict future exam questions.</span></div>
        {paperAnalysis && <div className="paper-analysis-results"><strong>{paperAnalysis.paperCount} supplied papers analyzed{paperAnalysis.dateRange ? ` · ${paperAnalysis.dateRange.from} to ${paperAnalysis.dateRange.to}` : ""}</strong><p>{paperAnalysis.limitations}</p><h3>Repeated themes</h3>{paperAnalysis.repeatedThemes.length ? <ul>{paperAnalysis.repeatedThemes.map((item, index) => <li key={index}><strong>{item.theme}</strong><span>{item.occurrences} occurrences across {item.paperCount} papers{item.linkedTopic ? ` · ${item.linkedTopic.subject}: ${item.linkedTopic.topic}` : ""}</span><small>Sources: {item.sourcePapers.join(", ")}</small></li>)}</ul> : <p className="workspace-empty">No similar question wording was found across these papers.</p>}<h3>Approved topic coverage</h3>{paperAnalysis.topicCoverage.length ? <ul>{paperAnalysis.topicCoverage.map(item => <li key={`${item.subject}-${item.topic}`}><span>{item.subject}: {item.topic}</span><strong>{item.questionCount ? `${item.questionCount} mapped questions` : "No mapped question found"}</strong></li>)}</ul> : <p className="workspace-empty">Approve syllabus topics to see coverage and gaps.</p>}</div>}
        {docs.length ? <div className="document-list">{docs.map(document => <article className="document-item" key={document._id}><div className="document-topline"><div><strong>{document.name}</strong><small>{document.type} · {document.subject || "No subject"} · {document.pageCount} page{document.pageCount === 1 ? "" : "s"} · {document.approved ? "approved" : "review required"}</small></div><div className="tool-action-row"><button type="button" className="tool-text-button" disabled={busy} onClick={() => run(async () => { await deleteStudyDocument(token, String(document._id)); if (reviewDoc === document._id) setReviewDoc(null); await reload(); })}>Delete</button><button type="button" className="tool-secondary-button" onClick={() => { setReviewDoc(reviewDoc === document._id ? null : document._id); setReviewTopics(topicsForReview(document)); }}>{reviewDoc === document._id ? "Close review" : "Review extraction"}</button></div></div>
          {reviewDoc === document._id && <div className="document-review"><label>Document type<select value={document.type} onChange={event => run(async () => { await updateStudyDocument(token, String(document._id), { type: event.target.value }); await reload(); })}><option value="syllabus">Syllabus</option><option value="notes">Study notes</option><option value="questionPaper">Previous question paper</option><option value="unknown">Unknown</option></select></label><label>Related subject<select value={document.subject || ""} onChange={event => run(async () => { await updateStudyDocument(token, String(document._id), { subject: event.target.value }); await reload(); })}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label><div className="document-page-review">{(document.extractions || []).map(page => <details key={page.page}><summary>Page {page.page}: review {page.topics?.length || 0} topics and {page.questions?.length || 0} possible questions</summary><label>Topics from page {page.page}, one per line<textarea rows={4} value={reviewTopics[String(page.page)] ?? ""} onChange={event => setReviewTopics(current => ({ ...current, [String(page.page)]: event.target.value }))} /></label>{page.questions?.length > 0 && <ul>{page.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>}</details>)}</div><div className="tool-action-row"><button type="button" className="tool-primary-button" onClick={() => run(async () => { const topicsByPage = Object.entries(reviewTopics).map(([page, text]) => ({ page: Number(page), topics: text.split("\n").map(item => item.trim()).filter(Boolean) })); const topics = [...new Set(topicsByPage.flatMap(page => page.topics))]; await updateStudyDocument(token, String(document._id), { approved: true, topics, topicsByPage }); await reload(); setReviewDoc(null); setMessage("Reviewed topics saved. For a syllabus, approved topics are added to the selected subject's plan."); })}>Approve reviewed topics</button></div></div>}</article>)}</div> : <p className="workspace-empty">No documents uploaded yet. PDFs are processed for this account and the extracted text is not retained as an original file.</p>}
      </section>

      <section className="workspace-card tool-section" id="practice" hidden={activeSection !== "practice"}>
        <div className="card-heading-row"><div><span className="eyebrow">PRACTICE & MOCK TESTS</span><h2>Check your understanding</h2></div><span className="small-count">Practice only · not an exam prediction</span></div>
        <form className="tool-form quiz-builder" onSubmit={event => { event.preventDefault(); const topic = event.currentTarget.elements.topic.value; run(async () => { const result = await createPracticeQuiz(token, { subject, topic, count: quizCount }); setQuiz({ ...result.quiz, timeLimitMinutes: quizDurationMinutes }); setAnswers(Array(result.quiz.questions.length).fill(-1)); setQuizResult(null); setQuizSecondsLeft(quizDurationMinutes ? quizDurationMinutes * 60 : null); await reload(); }); }}><label>Subject<select value={subject} onChange={event => setSubject(event.target.value)}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label><label>Topic<input name="topic" maxLength={180} placeholder="e.g. linked lists" required /></label><label>Questions<select value={quizCount} onChange={event => setQuizCount(Number(event.target.value))}><option value={3}>3 questions</option><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option></select></label><label>Time limit<select value={quizDurationMinutes} onChange={event => setQuizDurationMinutes(Number(event.target.value))}><option value={0}>Untimed</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={20}>20 minutes</option></select></label><button type="submit" className="tool-primary-button" disabled={busy || !subject}>{busy ? "Creating…" : "Create practice test"}</button></form>
        {quiz && <form className="quiz-attempt" onSubmit={event => { event.preventDefault(); run(async () => { const result = await submitQuizAttempt(token, quiz.id, answers); setQuizResult(result); await reload(); }); }}><h3>{quiz.title}</h3><p className="tool-disclaimer">{quiz.sourceType === "ai-generated" ? "AI-generated practice questions" : "Guided practice questions"}. Answers stay hidden until you submit.{quiz.timeLimitMinutes ? ` Time remaining: ${Math.floor((quizSecondsLeft || 0) / 60)}:${String((quizSecondsLeft || 0) % 60).padStart(2, "0")}${quizSecondsLeft === 0 ? " · Time is up; submit to see your result." : ""}` : " Untimed practice."}</p>{quiz.questions.map((question, questionIndex) => <fieldset className="quiz-question" key={questionIndex} disabled={quizSecondsLeft === 0}><legend>{questionIndex + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers(current => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} />{option}</label>)}</fieldset>)}<button type="submit" className="tool-primary-button" disabled={busy || (quizSecondsLeft !== 0 && answers.some(answer => answer < 0))}>Submit practice attempt</button></form>}
        {quizResult && <div className="quiz-results"><h3>{quizResult.score} / {quizResult.total} correct</h3><p>Your score is a revision signal. It is not a prediction of exam results.</p>{quizResult.results.map((result, index) => <p key={index}><strong>Question {index + 1}: {result.correct ? "Correct" : "Needs review"}.</strong> {result.explanation}</p>)}</div>}
      </section>

      <section className="workspace-card tool-section" id="notes" hidden={activeSection !== "notes"}>
        <div className="card-heading-row"><div><span className="eyebrow">NOTES & FLASHCARDS</span><h2>Keep useful ideas close</h2></div><span className="small-count">{cards.length} saved</span></div>
        <h3 className="subsection-title">Revision notes</h3>
        <form className="tool-form note-form" onSubmit={event => { event.preventDefault(); run(async () => { const note = { ...noteForm, source: noteForm.source || "student" }; if (editingNoteId) await updateStudyNote(token, editingNoteId, note); else await createStudyNote(token, note); setNoteForm({ title: "", content: "", subject, topic: "" }); setEditingNoteId(null); await reload(); setMessage(editingNoteId ? "Note updated." : "Note saved."); }); }}>
          <label>Subject<select value={noteForm.subject} onChange={event => setNoteForm(current => ({ ...current, subject: event.target.value }))}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label>
          <label>Topic<input maxLength={180} value={noteForm.topic} onChange={event => setNoteForm(current => ({ ...current, topic: event.target.value }))} placeholder="Optional topic" /></label>
          <label className="note-form-wide">Note title<input maxLength={180} value={noteForm.title} onChange={event => setNoteForm(current => ({ ...current, title: event.target.value }))} required /></label>
          <label className="note-form-wide">Revision note<textarea rows={4} maxLength={8000} value={noteForm.content} onChange={event => setNoteForm(current => ({ ...current, content: event.target.value }))} required /></label>
          <div className="tool-action-row"><button type="submit" className="tool-primary-button" disabled={busy}>{editingNoteId ? "Update note" : "Save note"}</button>{editingNoteId && <button type="button" className="tool-secondary-button" onClick={() => { setEditingNoteId(null); setNoteForm({ title: "", content: "", subject, topic: "" }); }}>Cancel edit</button>}</div>
        </form>
        {notes.length ? <div className="saved-note-list">{notes.map(note => <article className="saved-note-item" key={note._id}><div><span>{note.subject}{note.topic ? ` · ${note.topic}` : ""} · {note.source === "ai-assisted" ? "AI-assisted" : "student note"}</span><strong>{note.title}</strong><p>{note.content}</p></div><div className="tool-action-row"><button type="button" className="tool-text-button" onClick={() => run(async () => { await updateStudyNote(token, String(note._id), { starred: !note.starred }); await reload(); })}>{note.starred ? "★ Starred" : "☆ Star"}</button><button type="button" className="tool-text-button" onClick={() => { setEditingNoteId(String(note._id)); setNoteForm({ title: note.title, content: note.content, subject: note.subject, topic: note.topic, source: note.source }); }}>Edit</button><button type="button" className="tool-text-button" onClick={() => run(async () => { await deleteStudyNote(token, String(note._id)); await reload(); })}>Delete</button></div></article>)}</div> : <p className="workspace-empty">Save your own notes or turn an AI tutor reply into an editable revision note.</p>}
        <h3 className="subsection-title">Flashcards</h3>
        <form className="tool-form flashcard-form" onSubmit={event => { event.preventDefault(); run(async () => { if (editingCardId) await updateFlashcard(token, editingCardId, cardForm); else await createFlashcard(token, cardForm); setCardForm(current => ({ ...current, front: "", back: "", topic: "" })); setEditingCardId(null); await reload(); setMessage(editingCardId ? "Flashcard updated." : "Flashcard saved."); }); }}><label>Subject<select value={cardForm.subject} onChange={event => setCardForm(current => ({ ...current, subject: event.target.value }))}>{(studentData.backlogs || []).map(backlog => <option key={backlog.course} value={backlog.course}>{backlog.course}</option>)}</select></label><label>Topic<input maxLength={180} value={cardForm.topic} onChange={event => setCardForm(current => ({ ...current, topic: event.target.value }))} placeholder="Optional topic" /></label><label>Question / front<textarea rows={2} maxLength={1200} value={cardForm.front} onChange={event => setCardForm(current => ({ ...current, front: event.target.value }))} required /></label><label>Answer / back<textarea rows={2} maxLength={3000} value={cardForm.back} onChange={event => setCardForm(current => ({ ...current, back: event.target.value }))} required /></label><div className="tool-action-row"><button type="submit" className="tool-primary-button" disabled={busy}>{editingCardId ? "Update flashcard" : "Save flashcard"}</button>{editingCardId && <button type="button" className="tool-secondary-button" onClick={() => { setEditingCardId(null); setCardForm({ front: "", back: "", subject, topic: "" }); }}>Cancel edit</button>}</div></form>
        {cards.length ? <div className="flashcard-list">{cards.map(card => <article className="flashcard-item" key={card._id}><div className="flashcard-copy"><span>{card.subject}{card.topic ? ` · ${card.topic}` : ""}</span><strong>{card.front}</strong>{revealedCard === card._id && <p>{card.back}</p>}<button type="button" className="tool-text-button" onClick={() => setRevealedCard(revealedCard === card._id ? null : card._id)}>{revealedCard === card._id ? "Hide answer" : "Show answer"}</button></div><div className="flashcard-actions"><button type="button" aria-label={card.starred ? "Unstar flashcard" : "Star flashcard"} onClick={() => run(async () => { await updateFlashcard(token, String(card._id), { starred: !card.starred }); await reload(); })}>{card.starred ? "★" : "☆"}</button><label><input type="checkbox" checked={card.mastered} onChange={event => run(async () => { await updateFlashcard(token, String(card._id), { mastered: event.target.checked }); await reload(); })} />Mastered</label><button type="button" className="tool-text-button" onClick={() => { setEditingCardId(String(card._id)); setCardForm({ front: card.front, back: card.back, subject: card.subject, topic: card.topic }); document.querySelector(".flashcard-form")?.scrollIntoView({ behavior: "smooth" }); }}>Edit</button><button type="button" className="tool-text-button" onClick={() => run(async () => { await deleteFlashcard(token, String(card._id)); await reload(); })}>Delete</button></div></article>)}</div> : <p className="workspace-empty">Create your first flashcard. Generated notes can be added here as editable cards.</p>}
      </section>

      <section className="workspace-card tool-section" id="study-analytics" hidden={activeSection !== "study-analytics"}>
        <div className="card-heading-row"><div><span className="eyebrow">PROGRESS & ANALYTICS</span><h2>Progress you can act on</h2></div><span className="small-count">Based on your recorded activity</span></div>
        <div className="analytics-summary"><article><span>Study tasks completed</span><strong>{tasks.filter(task => task.status === "completed").length} / {tasks.length}</strong></article><article><span>Today’s study goal</span><strong>{minutesToday} / {preferences?.dailyTargetMinutes || 120} min</strong><small>Completed planned sessions</small></article><article><span>Practice accuracy</span><strong>{quizAccuracy === null ? "No attempts yet" : `${quizAccuracy}%`}</strong><small>{totalCorrect} correct out of {totalAnswered} questions</small></article><article><span>Flashcards mastered</span><strong>{cards.filter(card => card.mastered).length} / {cards.length}</strong></article><article><span>Current backlog readiness</span><strong>{readiness.level === "low" ? "On track" : readiness.level === "medium" ? "Needs attention" : "High workload"}</strong><small>{readiness.reason}</small></article></div>
        {preferences?.streaksEnabled && <p className="streak-summary">{streak ? `${streak}-day study streak, based on completed study sessions in your time zone.` : "Complete a planned study session to begin your study streak."}</p>}
        <h3 className="subsection-title">Topic mastery</h3><p className="tool-disclaimer">Status uses your latest quiz result: strong ≥80%, in progress 50–79%, needs practice below 50%. Time spent alone does not count as mastery.</p>
        {topicMastery.length ? <div className="mastery-list">{topicMastery.map(item => <article key={item.topic}><div><strong>{item.topic}</strong><small>{item.subject} · latest of {item.tries} attempt{item.tries === 1 ? "" : "s"}</small></div><span className={`mastery-status mastery-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status} · {Math.round(item.score)}%</span></article>)}</div> : <p className="workspace-empty">Complete a practice quiz to see topic-level mastery and weak areas.</p>}
      </section>

      <section className="workspace-card tool-section" id="settings" hidden={activeSection !== "settings"}>
        <div className="settings-hero"><div className="settings-hero-mark" aria-hidden="true">✦</div><div className="settings-hero-copy"><span className="eyebrow">YOUR CLEARPATH CONTROL ROOM</span><h2>Make your study space yours</h2><p>Fine-tune your rhythm, reminders, and data controls in one place.</p></div><span className="settings-status"><i /> Workspace preferences</span><div className="settings-orbit settings-orbit-one" /><div className="settings-orbit settings-orbit-two" /></div>
        <div className="settings-section-title"><div><span className="eyebrow">STUDY RHYTHM</span><h3>Build a routine that works for you</h3></div><span>Changes apply to this workspace</span></div>
        {preferences && <form className="tool-form settings-form" onSubmit={event => { event.preventDefault(); run(async () => { const result = await updatePreferences(token, { timezone: settingsTimeZone, dailyTargetMinutes: Number(preferences.dailyTargetMinutes), reminders: preferences.reminders, streaksEnabled: preferences.streaksEnabled }); setPreferences(result.preferences); setMessage("Your preferences were saved."); }); }}><label>Time zone<input maxLength={100} value={settingsTimeZone} onChange={event => setSettingsTimeZone(event.target.value)} /></label><label>Daily goal<select value={preferences.dailyTargetMinutes} onChange={event => setPreferences(current => ({ ...current, dailyTargetMinutes: Number(event.target.value) }))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option><option value={240}>4 hours</option></select></label><label className="setting-toggle"><input type="checkbox" checked={preferences.streaksEnabled} onChange={event => setPreferences(current => ({ ...current, streaksEnabled: event.target.checked }))} />Enable study streaks</label><div className="reminder-options">{Object.entries({ exam: "Upcoming exams", session: "Study sessions", recovery: "Missed session recovery", summary: "Weekly summary" }).map(([key, label]) => <label key={key}><input type="checkbox" checked={preferences.reminders?.[key] !== false} onChange={event => setPreferences(current => ({ ...current, reminders: { ...current.reminders, [key]: event.target.checked } }))} />{label}</label>)}</div><button className="tool-primary-button" type="submit" disabled={busy}>Save preferences</button></form>}
        <div className="settings-section-title settings-updates-title"><div><span className="eyebrow">ACCOUNT ACTIVITY</span><h3>Updates & data</h3></div><span>Private to your account</span></div>
        <div className="notification-list"><h3>Recent in-app updates</h3>{(workspace?.notifications || []).length ? workspace.notifications.slice().reverse().slice(0, 8).map((item, index) => <p key={item._id || index}><strong>{item.title}</strong><span>{item.body}</span></p>) : <p className="workspace-empty">Recovery and account updates will appear here. You can turn reminder types off above.</p>}</div>
        <details className="data-controls"><summary>Export or delete my study data</summary><p>Your profile, plans, tutor history, extracted document text, quizzes, and flashcards are associated with your ClearPath account. Exports exclude hidden quiz answer keys.</p><div className="tool-action-row"><button type="button" className="tool-secondary-button" disabled={busy} onClick={() => run(async () => { const exported = await exportWorkspaceData(token); const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `clearpath-study-data-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); setMessage("Your workspace export has been downloaded."); })}>Download my data</button><button type="button" className="tool-danger-button" disabled={busy} onClick={() => { if (window.confirm("Delete your saved ClearPath study workspace, including tutor history, extracted documents, quizzes, and flashcards? This cannot be undone.")) run(async () => { await deleteWorkspaceData(token); await reload(); setMessage("Your study workspace data was deleted."); }); }}>Delete study workspace data</button></div></details>
      </section>
    </section>
  );
}
