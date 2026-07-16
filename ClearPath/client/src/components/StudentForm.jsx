import { useState } from "react";

export default function StudentForm({ initialName, initialEmail, onSubmit }) {
  const [form, setForm] = useState({
    name: initialName || "",
    email: initialEmail || "",
    universityName: "Tech University",
    hallticketNum: "12345678",
    numberOfBacklogs: 1,
    currentSemester: 5,
    branch: "Computer Science",
    course: "B.Tech",
    cgpa: 6.8,
    attendance: 75,
    target: "placement",
    backlogs: [{ course: "DBMS", semester: 3, attempts: 1 }]
  });

  const handleBacklogChange = (i, field, value) => {
    const updated = [...form.backlogs];
    updated[i][field] = value;
    setForm({ ...form, backlogs: updated });
  };

  const addBacklog = () => {
    setForm({ 
      ...form, 
      numberOfBacklogs: form.numberOfBacklogs + 1,
      backlogs: [...form.backlogs, { course: "", semester: "", attempts: 1 }] 
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form });
  };

  return (
    <form className="student-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Name</label>
          <input placeholder="Name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>University Name</label>
          <input placeholder="University Name" value={form.universityName}
            onChange={e => setForm({ ...form, universityName: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Hall Ticket Number</label>
          <input placeholder="Hall Ticket Number" value={form.hallticketNum}
            onChange={e => setForm({ ...form, hallticketNum: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Number of Backlogs</label>
          <input placeholder="Number of Backlogs" type="number" value={form.numberOfBacklogs}
            onChange={e => setForm({ ...form, numberOfBacklogs: parseInt(e.target.value) })} required />
        </div>
        <div className="form-group">
          <label>Current Semester</label>
          <input placeholder="Current Semester" type="number" value={form.currentSemester}
            onChange={e => setForm({ ...form, currentSemester: parseInt(e.target.value) })} required />
        </div>
        <div className="form-group">
          <label>CGPA</label>
          <input placeholder="CGPA" type="number" step="0.1" value={form.cgpa}
            onChange={e => setForm({ ...form, cgpa: parseFloat(e.target.value) })} required />
        </div>
        <div className="form-group">
          <label>Attendance %</label>
          <input placeholder="Attendance %" type="number" value={form.attendance}
            onChange={e => setForm({ ...form, attendance: parseInt(e.target.value) })} required />
        </div>
        <div className="form-group">
          <label>Target Goal</label>
          <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}>
            <option value="placement">Placement</option>
            <option value="higher_studies">Higher Studies</option>
            <option value="scholarship">Scholarship</option>
          </select>
        </div>
        <div className="form-group">
          <label>Branch</label>
          <input placeholder="e.g. Computer Science" value={form.branch}
            onChange={e => setForm({ ...form, branch: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Course</label>
          <input placeholder="e.g. B.Tech, B.E, MCA" value={form.course}
            onChange={e => setForm({ ...form, course: e.target.value })} required />
        </div>
      </div>

      <div className="backlogs-section">
        <h4>Current Backlogs Details</h4>
        {form.backlogs.map((b, i) => (
          <div key={i} className="backlog-row">
            <input placeholder="Course Name" value={b.course}
              onChange={e => handleBacklogChange(i, "course", e.target.value)} required />
            <input placeholder="Semester" type="number" value={b.semester}
              onChange={e => handleBacklogChange(i, "semester", parseInt(e.target.value))} required />
            <input placeholder="Attempts" type="number" value={b.attempts}
              onChange={e => handleBacklogChange(i, "attempts", parseInt(e.target.value))} required />
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addBacklog}>+ Add Another Backlog</button>
      </div>
      <button type="submit" className="btn-primary">Generate Plan</button>
    </form>
  );
}
