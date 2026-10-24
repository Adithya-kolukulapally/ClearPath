import { useEffect, useState } from "react";
import StudyTools from "./StudyTools";
import { readinessCheck } from "../services/readiness";

const targetLabels = { placement: "Campus placement", higher_studies: "Higher studies", scholarship: "Scholarship" };
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const workspacePages = [
  { id: "dashboard", label: "Dashboard" },
  { id: "backlogs", label: "My backlogs" },
  { id: "planner", label: "Study planner" },
  { id: "ai-tutor", label: "Clario" },
  { id: "documents", label: "Documents" },
  { id: "practice", label: "Practice tests" },
  { id: "notes", label: "Notes & cards" },
  { id: "study-analytics", label: "Progress" },
  { id: "settings", label: "Settings" }
];
const initials = (name = "Student") => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "S";

function WorkspaceIcon({ name }) {
  const shared = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const drawings = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    backlogs: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 6h13M8 10h8m-8 4h7"/></>,
    planner: <><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4m8-4v4M4 9.5h16M8 13h3m-3 4h6"/></>,
    "ai-tutor": <><path d="M12 20.5c-4.8 0-8.5-3.4-8.5-7.7 0-4 3.7-7.3 8.5-7.3s8.5 3.3 8.5 7.3c0 2.1-1 3.8-2.7 5.1L19 21l-4.1-1a10 10 0 0 1-2.9.5Z"/><path d="M12 8v.1m-3 3.4h.1m5.8 0h.1m-3 3.5h.1"/></>,
    documents: <><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 4v4h4M8 12h8m-8 4h8"/></>,
    practice: <><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.3 2.3 4.8-5"/></>,
    notes: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 5h11m-8 4h8m-8 4h6"/></>,
    "study-analytics": <><path d="M4 19.5V5m0 14.5h16"/><path d="m7 15 3.3-3.5 3 2.1L19 7"/><path d="M15.5 7H19v3.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3.1Z"/></>
  };
  return <svg {...shared}>{drawings[name]}</svg>;
}

function StudyTimer() {
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setSeconds(value => {
      if (value <= 1) { setRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [running]);
  const time = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  const toggle = () => { if (seconds === 0) setSeconds(1500); setRunning(value => !value); };
  return (
    <section className="workspace-card timer-card">
      <div className="card-heading-row"><div><span className="eyebrow">FOCUS SESSION</span><h2>Study timer</h2></div><span className="timer-mode">25 min</span></div>
      <div className="timer-display" role="timer" aria-live="off">{time}</div>
      <p className="timer-caption">{seconds === 0 ? "Nice work. Take a short break." : running ? "One thing at a time. You’ve got this." : "A focused session, at your pace."}</p>
      <div className="timer-actions">
        <button type="button" className="timer-start" onClick={toggle}>{running ? "Pause session" : seconds === 0 ? "Start again" : "Start focus session"}</button>
        <button type="button" className="timer-reset" onClick={() => { setRunning(false); setSeconds(1500); }}>Reset</button>
      </div>
    </section>
  );
}

function RiskCard({ risk }) {
  if (!risk) return <p className="workspace-empty">A preparation check-in will appear as you make progress.</p>;
  const level = ["low", "medium", "high"].includes(risk.level?.toLowerCase()) ? risk.level.toLowerCase() : "medium";
  const label = level === "low" ? "On track" : level === "medium" ? "Needs attention" : "High workload";
  return <div className={"workspace-risk risk-" + level}><span className="risk-dot" /><div><strong>{label}</strong><p>{risk.reason}</p></div></div>;
}

export default function Dashboard({ solution, target, studentData, token, onEdit, onLogout }) {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const tasks = (solution?.clearing_order || []).map((item, index) => ({
    id: item.course + "-" + index,
    title: "Review " + item.course + " fundamentals",
    detail: "Subject " + (index + 1) + " of " + solution.clearing_order.length + (item.weeks_to_clear ? " · about " + item.weeks_to_clear + " weeks" : " · Start with a focused review")
  }));
  const today = new Date();
  const name = studentData.name?.trim() || "there";
  const subjects = studentData.backlogs || [];
  const availableDays = (studentData.studyDays || []).map(day => dayLabels[day]).filter(Boolean);
  const weeklyHours = (Number(studentData.dailyStudyHours) || 2) * (studentData.studyDays?.length || 0);
  const dateToday = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const examDate = studentData.examDate ? new Date(studentData.examDate + "T00:00:00") : null;
  const daysUntilExam = examDate && !Number.isNaN(examDate.getTime()) ? Math.max(0, Math.ceil((examDate - new Date(dateToday + "T00:00:00")) / 86400000)) : null;
  const nextTask = tasks.find(task => !completedTasks.includes(task.id));
  const progress = tasks.length ? Math.round(completedTasks.length / tasks.length * 100) : 0;
  const recommendations = (solution.strategies || []).slice(0, 3);
  const weeklyPlan = solution.learning_plan?.weekly_breakdown || [];
  const readiness = readinessCheck(studentData);
  const activeTitle = workspacePages.find(page => page.id === activePage)?.label || "Dashboard";
  const toggleTask = id => setCompletedTasks(current => current.includes(id) ? current.filter(taskId => taskId !== id) : [...current, id]);
  const mobilePrimaryPages = workspacePages.slice(0, 4);
  const mobileSecondaryPages = workspacePages.slice(4);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = event => { if (event.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  if (!solution) return null;

  return (
    <div className={`student-workspace app-layout fade-in${sidebarOpen ? " sidebar-is-open" : ""}${activePage === "ai-tutor" ? " ai-tutor-active" : ""}${chatInputFocused ? " chat-input-focused" : ""}`}>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className="workspace-sidebar" aria-label="Study workspace sidebar">
        <a href="#dashboard" className="workspace-brand" onClick={event => { event.preventDefault(); setActivePage("dashboard"); setSidebarOpen(false); }}><span className="brand-mark">C</span><span>ClearPath</span></a>
        <span className="sidebar-section-label">WORKSPACE</span>
        <nav className="workspace-nav" aria-label="Main navigation">
          {workspacePages.map(page => <button key={page.id} type="button" className={activePage === page.id ? "active" : ""} aria-current={activePage === page.id ? "page" : undefined} onClick={() => { setActivePage(page.id); setSidebarOpen(false); setMoreOpen(false); }}><span className="sidebar-nav-icon"><WorkspaceIcon name={page.id} /></span><span>{page.label}</span>{activePage === page.id && <span className="sidebar-nav-indicator" />}</button>)}
        </nav>
        <div className="sidebar-account"><span className="workspace-avatar" aria-hidden="true">{initials(studentData.name)}</span><div><strong>{studentData.name || "Student"}</strong><span>Study workspace</span></div><button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Log out">↗</button></div>
      </aside>
      <div className="workspace-content-shell" onFocusCapture={event => { if (event.target.matches("textarea") && event.target.closest(".tutor-form")) setChatInputFocused(true); }} onBlurCapture={event => { if (event.target.matches("textarea") && event.target.closest(".tutor-form")) setChatInputFocused(false); }}>
      <header className="workspace-topbar">
        <div className="workspace-topbar-title"><button type="button" className="sidebar-toggle" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><span /><span /><span /></button><div><span>YOUR STUDY SPACE</span><h1>{activeTitle}</h1></div></div>
        <label className="workspace-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg><input aria-label="Search workspace pages" value={workspaceSearch} onChange={event => setWorkspaceSearch(event.target.value)} onKeyDown={event => { if (event.key !== "Enter") return; const query = workspaceSearch.trim().toLowerCase(); if (!query) return; const match = workspacePages.find(page => page.label.toLowerCase().includes(query) || page.id.includes(query) || (query.includes("plan") && page.id === "planner") || (query.includes("note") && page.id === "notes") || (query.includes("file") && page.id === "documents")); if (match) { setActivePage(match.id); setSidebarOpen(false); } }} placeholder="Search pages… (try planner, notes, tutor)" /></label>
        <div className="workspace-user"><span className="workspace-avatar" aria-hidden="true">{initials(studentData.name)}</span><span className="workspace-user-name">{studentData.name || "Student"}</span><button type="button" onClick={onEdit} className="profile-menu">Edit plan</button><button type="button" onClick={onLogout} className="profile-menu">Log out</button></div>
      </header>

      <main className="workspace-content">
        <div className="dashboard-page" hidden={activePage !== "dashboard"}>
        <section className="workspace-welcome">
          <div><span className="welcome-date">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(today)}</span><h1>Hi, {name}. <span>Let’s make your next step clear.</span></h1><p>A plan shaped around your study time and your goal of {(targetLabels[target] || "making progress").toLowerCase()}.</p></div>
          <button type="button" className="edit-plan-button" onClick={onEdit}>Edit plan details <span aria-hidden="true">↗</span></button>
        </section>

        <section className="workspace-stats" aria-label="Study overview">
          <article className="stat-card"><span className="stat-icon stat-icon-blue">01</span><div><span className="stat-label">Active backlogs</span><strong>{subjects.length}</strong><small>{subjects.length === 1 ? "subject to work through" : "subjects to work through"}</small></div></article>
          <article className="stat-card"><span className="stat-icon stat-icon-green">◷</span><div><span className="stat-label">Study time this week</span><strong>{weeklyHours}<small className="stat-unit"> hrs</small></strong><small>{studentData.dailyStudyHours} hours × {studentData.studyDays?.length || 0} days</small></div></article>
          <article className="stat-card"><span className="stat-icon stat-icon-amber">⌁</span><div><span className="stat-label">Next exam</span><strong>{daysUntilExam === null ? "—" : daysUntilExam}</strong><small>{daysUntilExam === null ? "Add a date when you know it" : daysUntilExam === 1 ? "day remaining" : "days remaining"}</small></div></article>
          <article className="stat-card stat-progress" id="progress"><span className="stat-icon stat-icon-violet">↗</span><div className="progress-stat-copy"><span className="stat-label">Plan checklist</span><strong>{progress}%</strong><small>{completedTasks.length} of {tasks.length} first steps checked off</small><div className="progress-track"><span style={{ width: progress + "%" }} /></div></div></article>
        </section>

        <div className="workspace-columns">
          <div className="workspace-main-column">
            <section className="workspace-card deadline-card">
              <div className="card-heading-row"><div><span className="eyebrow">KEEP AN EYE ON</span><h2>Upcoming deadlines</h2></div><span className="today-pill">Today · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(today)}</span></div>
              {solution.deadline_alerts?.length ? <div className="deadline-list">{solution.deadline_alerts.slice(0, 3).map((alert, index) => <article className="deadline-item" key={alert.course + "-" + index}>
                <span className={"deadline-status deadline-" + (alert.urgency?.toLowerCase() || "medium")} aria-hidden="true">{index + 1}</span><div className="deadline-copy"><strong>{alert.course}</strong><span>{alert.action || "Review your exam schedule and plan your revision."}</span></div><div className="deadline-date"><strong>{alert.days_left} days</strong><span>{alert.deadline}</span></div>
              </article>)}</div> : <div className="deadline-empty"><span className="empty-calendar-icon">□</span><div><strong>No exam date added yet</strong><p>Add a date whenever it’s confirmed to see a countdown here.</p></div><button type="button" onClick={onEdit}>Add date</button></div>}
            </section>

            <div className="workspace-card-pair">
              <section className="workspace-card tasks-card">
                <div className="card-heading-row"><div><span className="eyebrow">A GOOD PLACE TO BEGIN</span><h2>Next steps</h2></div><span className="small-count">{completedTasks.length}/{tasks.length}</span></div>
                {nextTask && <div className="next-action"><span className="next-action-label">Suggested next action</span><strong>{nextTask.title}</strong><p>{nextTask.detail}</p></div>}
                {tasks.length ? <div className="checklist">{tasks.map(task => { const done = completedTasks.includes(task.id); return <label className={"checklist-item" + (done ? " is-complete" : "")} key={task.id}><input type="checkbox" checked={done} onChange={() => toggleTask(task.id)} /><span className="custom-check" aria-hidden="true">{done ? "✓" : ""}</span><span>{task.title}</span></label>; })}</div> : <p className="workspace-empty">Your first steps will appear here.</p>}
              </section>

              <section className="workspace-card notes-card">
                <div className="card-heading-row"><div><span className="eyebrow">A NOTE FOR YOUR GOAL</span><h2>Keep in mind</h2></div><span className="note-mark">✳</span></div>
                <div className="note-preview"><strong>{targetLabels[target] || "Your goal"}</strong><p>{solution.learning_plan?.target_specific_advice || "Build a steady routine around your available study days. Small, regular sessions are easier to sustain."}</p></div>
                <div className="note-footer"><span>Plan guidance</span><span>From your study plan</span></div>
              </section>
            </div>

            <section className="workspace-card scheduled-card" id="study-plan">
              <div className="card-heading-row"><div><span className="eyebrow">YOUR WEEKLY RHYTHM</span><h2>Study plan</h2></div><span className="availability-chip">{availableDays.length ? availableDays.join(" · ") : "Set your study days"}</span></div>
              <div className="weekly-focus-list">{weeklyPlan.length ? weeklyPlan.slice(0, 4).map((week, index) => <article className="weekly-focus-item" key={week.week + "-" + index}>
                <span className="week-badge">W{week.week || index + 1}</span><div><strong>{week.focus}</strong><p>{week.tasks?.slice(0, 2).join(" · ") || week.milestone}</p></div><span className="weekly-focus-arrow" aria-hidden="true">›</span>
              </article>) : <p className="workspace-empty">Your weekly focus will appear here.</p>}</div>
              <div className="schedule-footer"><span>Capacity</span><strong>{studentData.dailyStudyHours} hours per available day</strong><button type="button" onClick={onEdit}>Adjust availability</button></div>
            </section>

            <section className="workspace-card subjects-card" id="subjects">
              <div className="card-heading-row"><div><span className="eyebrow">YOUR COURSEWORK</span><h2>Subjects in this plan</h2></div><span className="small-count">{subjects.length} total</span></div>
              <div className="subject-list">{subjects.map((subject, index) => {
                const planned = solution.clearing_order?.find(item => item.course?.toLowerCase() === subject.course?.toLowerCase());
                return <article className="subject-row" key={subject.course + "-" + index}><span className="subject-number">{String(index + 1).padStart(2, "0")}</span><div className="subject-name"><strong>{subject.course}</strong><span>Semester {subject.semester} · {subject.attempts} {subject.attempts === 1 ? "attempt" : "attempts"}</span></div><span className="subject-priority">{planned ? "Priority " + planned.priority_rank : "In your plan"}</span></article>;
              })}</div>
            </section>
          </div>

          <aside className="workspace-side-column" aria-label="Study tools and recommendations">
            <StudyTimer />
            <section className="workspace-card recommendations-card">
              <div className="card-heading-row"><div><span className="eyebrow">PICK UP A HELPFUL IDEA</span><h2>For your subjects</h2></div></div>
              <div className="recommendation-list">{recommendations.length ? recommendations.map((item, index) => <article className="recommendation-item" key={item.course + "-" + index}>
                <span className={"recommendation-icon recommendation-icon-" + (index + 1)}>{String.fromCharCode(65 + index)}</span><div><span className="recommendation-category">{item.course}</span><strong>{item.key_topics?.[0] || "Study strategy for " + item.course}</strong><p>{item.tips || item.study_strategy}</p></div>
              </article>) : <p className="workspace-empty">Recommendations will appear here when available.</p>}</div>
            </section>

            <section className="workspace-card week-card">
              <div className="card-heading-row"><div><span className="eyebrow">STAY IN A STEADY RHYTHM</span><h2>This week</h2></div><span className="week-calendar-icon">▦</span></div>
              <div className="week-days">{dayLabels.map((day, index) => {
                const active = studentData.studyDays?.includes(index);
                const isToday = (today.getDay() + 6) % 7 === index;
                return <div className={"week-day" + (active ? " is-study-day" : "") + (isToday ? " is-today" : "")} key={day}><span>{day}</span><strong>{isToday ? today.getDate() : "·"}</strong></div>;
              })}</div>
              <div className="week-summary"><span className="availability-dot" />{availableDays.length} study days planned <span>·</span> {weeklyHours} hrs available</div>
            </section>

            <section className="workspace-card readiness-card"><div className="card-heading-row"><div><span className="eyebrow">A GENTLE CHECK-IN</span><h2>Preparation</h2></div></div><RiskCard risk={readiness} /><p className="readiness-disclaimer">A rules-based planning estimate based on reported effort and available time, not a prediction of exam results.</p></section>
          </aside>
        </div>
        </div>
        <section className="workspace-card backlog-page" hidden={activePage !== "backlogs"}>
          <div className="backlog-page-heading"><div><span className="eyebrow">YOUR COURSEWORK</span><h2>Backlog overview</h2><p>Keep your subjects, deadlines, and available study time in one place.</p></div><div className="tool-action-row"><button type="button" className="tool-secondary-button" onClick={onEdit}>Edit subjects</button><button type="button" className="tool-primary-button" onClick={() => setActivePage("planner")}>Open study planner</button></div></div>
          <div className="backlog-overview-stats"><article><span>Active subjects</span><strong>{subjects.length}</strong><small>{subjects.length === 1 ? "subject in your plan" : "subjects in your plan"}</small></article><article><span>Weekly study capacity</span><strong>{weeklyHours}<small> hrs</small></strong><small>{availableDays.length} study days each week</small></article><article><span>Next exam</span><strong>{daysUntilExam === null ? "—" : daysUntilExam === 0 ? "Today" : daysUntilExam}</strong><small>{daysUntilExam === null ? "No exam date added" : daysUntilExam === 1 ? "day remaining" : "days remaining"}</small></article></div>
          <div className="backlog-subjects-heading"><div><h3>Subjects in your plan</h3><p>Dates and workload are based on the details you provided.</p></div><span>{subjects.length} total</span></div>
          {subjects.length ? <div className="subject-list backlog-subject-list">{subjects.map((subject, index) => {
            const planned = solution.clearing_order?.find(item => item.course?.toLowerCase() === subject.course?.toLowerCase());
            const exam = subject.examDate || studentData.examDate;
            const examLabel = exam ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${exam}T12:00:00`)) : "Date not set";
            return <article className="subject-row backlog-subject-row" key={subject.course + "-" + index}><span className="subject-number">{String(index + 1).padStart(2, "0")}</span><div className="subject-name"><strong>{subject.course}</strong><span>Semester {subject.semester} · {subject.attempts} {subject.attempts === 1 ? "attempt" : "attempts"}</span></div><div className="backlog-subject-details"><span>Exam date</span><strong>{examLabel}</strong></div><div className="backlog-subject-details"><span>Estimated effort</span><strong>{Number(subject.estimatedHours) || 3} hours</strong></div><span className="subject-priority">{planned ? `Priority ${planned.priority_rank}` : "In your plan"}</span></article>;
          })}</div> : <p className="workspace-empty">Add your first subject to start a focused study plan.</p>}
        </section>
        <StudyTools token={token} studentData={studentData} activeSection={activePage} />
        <footer className="workspace-footer"><span>ClearPath · Your progress, at your pace.</span><span>AI guidance can be incomplete. Confirm dates and eligibility with your institution.</span></footer>
      </main>
      </div>
      {moreOpen && <button type="button" className="mobile-more-backdrop" aria-label="Close More menu" onClick={() => setMoreOpen(false)} />}
      {moreOpen && <div className="mobile-more-menu" id="mobile-more-menu" aria-label="More workspace pages">
        <span className="mobile-more-heading">MORE IN YOUR WORKSPACE</span>
        {mobileSecondaryPages.map(page => <button key={page.id} type="button" className={activePage === page.id ? "active" : ""} aria-current={activePage === page.id ? "page" : undefined} onClick={() => { setActivePage(page.id); setMoreOpen(false); }}><span className="mobile-more-icon"><WorkspaceIcon name={page.id} /></span><span>{page.label}</span><span className="mobile-more-arrow" aria-hidden="true">›</span></button>)}
        <div className="mobile-more-account"><span className="workspace-avatar" aria-hidden="true">{initials(studentData.name)}</span><span>{studentData.name || "Student"}</span><button type="button" onClick={() => { setMoreOpen(false); onEdit(); }}>Edit plan</button><button type="button" onClick={() => { setMoreOpen(false); onLogout(); }}>Log out</button></div>
      </div>}
      <nav className="mobile-bottom-nav" aria-label="Mobile workspace navigation">
        {mobilePrimaryPages.map(page => <button key={page.id} type="button" className={activePage === page.id ? "active" : ""} aria-current={activePage === page.id ? "page" : undefined} onClick={() => { setActivePage(page.id); setMoreOpen(false); }}><span className="mobile-nav-icon"><WorkspaceIcon name={page.id} /></span><span>{page.id === "backlogs" ? "Backlogs" : page.id === "planner" ? "Planner" : page.id === "ai-tutor" ? "Clario" : "Home"}</span></button>)}
        <button type="button" className={moreOpen || mobileSecondaryPages.some(page => page.id === activePage) ? "active" : ""} aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}><span className="mobile-nav-more-icon" aria-hidden="true">•••</span><span>More</span></button>
      </nav>
    </div>
  );
}
