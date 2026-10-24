const dayIndex = date => (date.getDay() + 6) % 7;

function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readinessCheck(profile, tasks = []) {
  const selectedDays = new Set(profile.studyDays || []);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const checks = (profile.backlogs || []).map(subject => {
    const date = parseDate(subject.examDate || profile.examDate);
    if (!date) return null;
    const related = tasks.filter(task => task.subject?.toLowerCase() === subject.course?.toLowerCase() && task.status !== "completed");
    const effort = related.length ? related.reduce((sum, task) => sum + task.durationMinutes, 0) : Math.round((Number(subject.estimatedHours) || 3) * 60);
    let availableDays = 0;
    for (const cursor = new Date(now); cursor <= date; cursor.setDate(cursor.getDate() + 1)) {
      if (selectedDays.has(dayIndex(cursor))) availableDays += 1;
    }
    const capacity = availableDays * Math.round((Number(profile.dailyStudyHours) || 2) * 60);
    return { subject: subject.course, effort, capacity, ratio: capacity ? effort / capacity : Infinity };
  }).filter(Boolean);
  if (!checks.length) return { level: "medium", reason: "No exam date is set. Add a confirmed subject date to compare remaining effort with available study time." };
  const worst = checks.reduce((current, item) => item.ratio > current.ratio ? item : current, checks[0]);
  const level = worst.ratio > 1 ? "high" : worst.ratio > .8 ? "medium" : "low";
  const label = level === "high" ? "High workload" : level === "medium" ? "Needs attention" : "On track";
  return { level, reason: `${label}: ${worst.subject} has about ${Math.ceil(worst.effort / 60)} study hours remaining and ${Math.floor(worst.capacity / 60)} hours of declared capacity before its date. This is a planning estimate based on your schedule and recorded tasks.` };
}
