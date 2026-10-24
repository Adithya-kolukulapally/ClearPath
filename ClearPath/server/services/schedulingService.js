const dayIndex = date => (date.getDay() + 6) % 7;

function buildStudySchedule(profile, priorityOrder = []) {
  const days = [...new Set(Array.isArray(profile.studyDays) ? profile.studyDays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6) : [])];
  const dailyMinutes = Math.floor(Number(profile.dailyStudyHours || 2) * 60);
  const examDate = profile.examDate ? new Date(`${profile.examDate}T12:00:00`) : null;
  const preferred = new Map(priorityOrder.map((item, index) => [String(item.course || '').toLowerCase(), index]));
  const backlogs = [...(Array.isArray(profile.backlogs) ? profile.backlogs : [])].sort((a, b) => {
    const aOrder = preferred.get(String(a.course || '').toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = preferred.get(String(b.course || '').toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || Number(b.attempts || 1) - Number(a.attempts || 1);
  });
  const tasks = [];
  const warnings = [];
  const assumptions = [];
  const load = new Map();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (examDate && examDate < today) {
    warnings.push('The exam date is in the past; tasks are scheduled without using it as a deadline.');
  }
  const activeExamDate = examDate && examDate >= today ? examDate : null;

  if (!days.length) return { tasks: [], warnings: ['Choose at least one available study day to create dated tasks.'], assumptions, capacityMinutesPerDay: dailyMinutes };

  for (const backlog of backlogs) {
    const subjectExamDate = backlog.examDate ? new Date(`${backlog.examDate}T12:00:00`) : activeExamDate;
    const deadline = subjectExamDate && subjectExamDate >= today ? subjectExamDate : null;
    if (subjectExamDate && subjectExamDate < today) warnings.push(`${String(backlog.course || 'Subject')}: the exam date is in the past, so it is not used as a scheduling deadline.`);
    const subject = String(backlog.course || 'Subject').trim().slice(0, 120);
    const topics = Array.isArray(backlog.topics) && backlog.topics.length
      ? backlog.topics.slice(0, 30).map(topic => typeof topic === 'string' ? topic.trim() : String(topic?.title || '').trim()).filter(Boolean)
      : [`${subject} core concepts`, `${subject} guided practice`, `${subject} revision and recall`];
    if (!backlog.topics?.length) assumptions.push(`Three starter sessions were estimated for ${subject}; replace them with syllabus topics when available.`);
    const minutesPerSession = Math.max(15, Math.min(90, dailyMinutes, Math.round(Number(backlog.sessionMinutes) || 45)));
    const estimatedHours = Number(backlog.estimatedHours);
    const requiredSessions = Number.isFinite(estimatedHours) && estimatedHours > 0
      ? Math.min(60, Math.max(topics.length, Math.ceil(estimatedHours * 60 / minutesPerSession)))
      : topics.length;
    if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) assumptions.push(`Effort for ${subject} was estimated from its topic list and a ${minutesPerSession}-minute session length.`);
    for (let index = 0; index < requiredSessions; index += 1) {
      const topic = topics[index % topics.length];
      let scheduledDate = '';
      for (let offset = 0; offset < 180; offset += 1) {
        const candidate = new Date(today);
        candidate.setDate(today.getDate() + offset);
        if (!days.includes(dayIndex(candidate))) continue;
        if (deadline && candidate > deadline) break;
        const key = candidate.toISOString().slice(0, 10);
        if ((load.get(key) || 0) + minutesPerSession <= dailyMinutes) {
          scheduledDate = key;
          load.set(key, (load.get(key) || 0) + minutesPerSession);
          break;
        }
      }
      if (!scheduledDate) {
        warnings.push(`${subject}: ${requiredSessions - index} session${requiredSessions - index === 1 ? '' : 's'} could not fit before the exam date within the availability you provided.`);
        break;
      }
      const difficulty = String(backlog.difficulty || 'moderate').toLowerCase();
      const attemptCount = Number(backlog.attempts || 1);
      const rationale = `${difficulty[0].toUpperCase()}${difficulty.slice(1)} difficulty${attemptCount > 1 ? ` and ${attemptCount} attempts` : ''}; scheduled within your daily study limit.`;
      tasks.push({
        title: index >= topics.length ? `Practice: ${topic}` : topic,
        subject,
        topic,
        date: scheduledDate,
        durationMinutes: minutesPerSession,
        status: 'planned',
        rationale,
        source: 'study-plan'
      });
    }
  }
  return { tasks, warnings: [...new Set(warnings)], assumptions: [...new Set(assumptions)], capacityMinutesPerDay: dailyMinutes };
}

module.exports = { buildStudySchedule };
