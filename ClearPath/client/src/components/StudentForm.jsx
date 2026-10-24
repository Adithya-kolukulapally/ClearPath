import { useEffect, useState } from "react";

const initialBacklog = () => ({ course: "", semester: "", attempts: 1, topicsText: "", difficulty: "moderate", estimatedHours: "3", examDate: "" });
const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const draftKeyFor = email => `clearpath-profile-draft:${String(email || "guest").trim().toLowerCase()}`;
const readDraft = email => {
  try { return JSON.parse(sessionStorage.getItem(draftKeyFor(email)) || "null"); }
  catch { return null; }
};

export default function StudentForm({ initialName, initialEmail, initialData, onSubmit, isLoading }) {
  const [form, setForm] = useState(() => {
    const defaults = {
      name: initialName || "",
      email: initialEmail || "",
      universityName: "",
      hallticketNum: "",
      currentSemester: "",
      branch: "",
      course: "",
      cgpa: "",
      attendance: "",
      target: "placement",
      examDate: "",
      dailyStudyHours: 2,
      studyDays: [0, 1, 2, 3, 4, 5],
      backlogs: [initialBacklog()]
    };
    const profile = {
      ...defaults,
      ...initialData,
      currentSemester: initialData?.currentSemester ?? "",
      cgpa: initialData?.cgpa ?? "",
      attendance: initialData?.attendance ?? "",
      backlogs: initialData?.backlogs?.map(backlog => ({ ...initialBacklog(), ...backlog, semester: String(backlog.semester), topicsText: backlog.topicsText || (Array.isArray(backlog.topics) ? backlog.topics.join(", ") : "") })) || defaults.backlogs
    };
    const draft = initialData ? null : readDraft(initialEmail || initialName);
    return draft ? { ...profile, ...draft, backlogs: Array.isArray(draft.backlogs) && draft.backlogs.length ? draft.backlogs : profile.backlogs } : profile;
  });

  useEffect(() => {
    try { sessionStorage.setItem(draftKeyFor(form.email || initialEmail || initialName), JSON.stringify(form)); }
    catch { /* Draft saving is best-effort when browser storage is unavailable. */ }
  }, [form, initialEmail, initialName]);

  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const updateBacklog = (index, field, value) => setForm(current => ({
    ...current,
    backlogs: current.backlogs.map((backlog, i) => i === index ? { ...backlog, [field]: value } : backlog)
  }));
  const toggleStudyDay = (day) => setForm(current => ({
    ...current,
    studyDays: current.studyDays.includes(day)
      ? current.studyDays.filter(value => value !== day)
      : [...current.studyDays, day].sort((a, b) => a - b)
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const submitted = await onSubmit({
      ...form,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      numberOfBacklogs: form.backlogs.length,
      currentSemester: Number(form.currentSemester),
      cgpa: form.cgpa === "" ? undefined : Number(form.cgpa),
      attendance: form.attendance === "" ? undefined : Number(form.attendance),
      dailyStudyHours: Number(form.dailyStudyHours),
      backlogs: form.backlogs.map(backlog => ({
        ...backlog,
        topics: (backlog.topicsText || "").split(",").map(topic => topic.trim()).filter(Boolean).slice(0, 30),
        estimatedHours: Number(backlog.estimatedHours),
        semester: Number(backlog.semester),
        attempts: Number(backlog.attempts)
      }))
      });
      if (submitted !== false) {
        try { sessionStorage.removeItem(draftKeyFor(form.email || initialEmail || initialName)); }
        catch { /* Ignore unavailable browser storage. */ }
      }
    } catch {
      // Keep the draft so the student can retry without re-entering their details.
    }
  };

  return (
    <form className="student-form" onSubmit={handleSubmit}>
      <div className="form-intro">
        <span className="eyebrow">PERSONALIZED STUDY PLAN</span>
        <h2>Tell us where you are</h2>
        <p>Your schedule and exam date help us shape a plan around the time you actually have.</p>
      </div>

      <section className="form-section" aria-labelledby="profile-heading">
        <div className="section-heading"><span className="section-index">01</span><div><h3 id="profile-heading">Your profile</h3><p>Used to tailor recommendations to your goal.</p></div></div>
        <div className="form-grid">
          <div className="form-group"><label htmlFor="student-name">Full name</label><input id="student-name" autoComplete="name" value={form.name} onChange={e => update("name", e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="student-email">Email address</label><input id="student-email" type="email" autoComplete="email" value={form.email} onChange={e => update("email", e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="university">University <span className="optional-label">Optional</span></label><input id="university" value={form.universityName} onChange={e => update("universityName", e.target.value)} placeholder="Your university" /></div>
          <div className="form-group"><label htmlFor="program">Degree / program <span className="optional-label">Optional</span></label><input id="program" value={form.course} onChange={e => update("course", e.target.value)} placeholder="e.g. B.Tech" /></div>
          <div className="form-group"><label htmlFor="branch">Branch <span className="optional-label">Optional</span></label><input id="branch" value={form.branch} onChange={e => update("branch", e.target.value)} placeholder="e.g. Computer Science" /></div>
          <div className="form-group"><label htmlFor="semester">Current semester</label><input id="semester" type="number" min="1" max="20" value={form.currentSemester} onChange={e => update("currentSemester", e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="cgpa">CGPA <span className="optional-label">Optional</span></label><input id="cgpa" type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={e => update("cgpa", e.target.value)} placeholder="Out of 10" /></div>
          <div className="form-group"><label htmlFor="attendance">Attendance % <span className="optional-label">Optional</span></label><input id="attendance" type="number" min="0" max="100" value={form.attendance} onChange={e => update("attendance", e.target.value)} placeholder="0–100" /></div>
          <div className="form-group"><label htmlFor="target">Your next goal</label><select id="target" value={form.target} onChange={e => update("target", e.target.value)}><option value="placement">Campus placement</option><option value="higher_studies">Higher studies</option><option value="scholarship">Scholarship</option></select></div>
        </div>
      </section>

      <section className="form-section" aria-labelledby="backlogs-heading">
        <div className="section-heading"><span className="section-index">02</span><div><h3 id="backlogs-heading">Backlogs to clear</h3><p>Add each subject and a little context about your attempts.</p></div></div>
        <div className="backlog-fields-header" aria-hidden="true"><span>Subject</span><span>Semester</span><span>Attempts</span><span></span></div>
        <div className="backlog-list">
          {form.backlogs.map((backlog, index) => (
            <div className="backlog-entry" key={index}><div className="backlog-row">
              <div className="form-group"><label className="mobile-field-label" htmlFor={`backlog-course-${index}`}>Subject</label><input id={`backlog-course-${index}`} placeholder="e.g. Data Structures" value={backlog.course} onChange={e => updateBacklog(index, "course", e.target.value)} required /></div>
              <div className="form-group"><label className="mobile-field-label" htmlFor={`backlog-semester-${index}`}>Semester</label><input id={`backlog-semester-${index}`} type="number" min="1" max="20" placeholder="e.g. 3" value={backlog.semester} onChange={e => updateBacklog(index, "semester", e.target.value)} required /></div>
              <div className="form-group"><label className="mobile-field-label" htmlFor={`backlog-attempts-${index}`}>Attempts</label><input id={`backlog-attempts-${index}`} type="number" min="1" max="20" value={backlog.attempts} onChange={e => updateBacklog(index, "attempts", e.target.value)} required /></div>
              <button type="button" className="icon-button remove-backlog" aria-label={`Remove ${backlog.course || `backlog ${index + 1}`}`} disabled={form.backlogs.length === 1} onClick={() => setForm(current => ({ ...current, backlogs: current.backlogs.filter((_, i) => i !== index) }))}>×</button>
            </div><div className="backlog-context"><div className="form-group"><label htmlFor={`backlog-topics-${index}`}>Syllabus topics <span className="optional-label">Comma-separated</span></label><input id={`backlog-topics-${index}`} value={backlog.topicsText || ""} onChange={e => updateBacklog(index, "topicsText", e.target.value)} placeholder="Arrays, trees, complexity" /></div><div className="form-group"><label htmlFor={`backlog-difficulty-${index}`}>Difficulty</label><select id={`backlog-difficulty-${index}`} value={backlog.difficulty || "moderate"} onChange={e => updateBacklog(index, "difficulty", e.target.value)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></div><div className="form-group"><label htmlFor={`backlog-effort-${index}`}>Estimated effort</label><div className="input-with-suffix"><input id={`backlog-effort-${index}`} type="number" min="0.5" max="100" step="0.5" value={backlog.estimatedHours ?? 3} onChange={e => updateBacklog(index, "estimatedHours", e.target.value)} required /><span>hours</span></div></div><div className="form-group"><label htmlFor={`backlog-exam-${index}`}>Subject exam date <span className="optional-label">Optional</span></label><input id={`backlog-exam-${index}`} type="date" min={getLocalDate()} value={backlog.examDate || ""} onChange={e => updateBacklog(index, "examDate", e.target.value)} /></div></div></div>
          ))}
        </div>
        <button type="button" className="add-backlog" onClick={() => setForm(current => ({ ...current, backlogs: [...current.backlogs, initialBacklog()] }))}><span aria-hidden="true">+</span> Add another subject</button>
      </section>

      <section className="form-section" aria-labelledby="availability-heading">
        <div className="section-heading"><span className="section-index">03</span><div><h3 id="availability-heading">Your study availability</h3><p>Set a realistic limit. We’ll use it to keep the plan manageable.</p></div></div>
        <div className="availability-grid">
          <div className="form-group"><label htmlFor="exam-date">Next backlog exam date <span className="optional-label">If known</span></label><input id="exam-date" type="date" min={getLocalDate()} value={form.examDate} onChange={e => update("examDate", e.target.value)} /></div>
          <div className="form-group"><label htmlFor="daily-hours">Study time on an available day</label><div className="input-with-suffix"><input id="daily-hours" type="number" min="0.5" max="12" step="0.5" value={form.dailyStudyHours} onChange={e => update("dailyStudyHours", e.target.value)} required /><span>hours</span></div></div>
        </div>
        <fieldset className="study-days"><legend>Days you can study</legend><div className="day-options">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => <label className="day-option" key={label}><input type="checkbox" checked={form.studyDays.includes(index)} onChange={() => toggleStudyDay(index)} /><span>{label}</span></label>)}</div></fieldset>
        {form.studyDays.length === 0 && <p className="field-hint" role="alert">Choose at least one study day to generate a plan.</p>}
      </section>

      <div className="form-footer"><p>Your details are used to create this plan. Recommendations are guidance, not guaranteed exam outcomes.</p><button type="submit" className="btn-primary" disabled={isLoading || form.studyDays.length === 0}>{isLoading ? "Building your plan…" : "Build my study plan"}<span aria-hidden="true">→</span></button></div>
    </form>
  );
}
