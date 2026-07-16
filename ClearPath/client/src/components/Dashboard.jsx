const targetLabels = {
  placement: '🎯 Campus Placement',
  higher_studies: '🎓 Higher Studies',
  scholarship: '🏆 Scholarship'
};

export default function Dashboard({ solution, target }) {
  if (!solution) return null;

  const getRiskClass = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  };

  return (
    <div className="dashboard-container fade-in">
      {/* Summary Banner */}
      <div className="summary-banner">
        <div className="summary-left">
          <span className="target-badge">{targetLabels[target] || '🎯 Your Goal'}</span>
          <h3>AI Advisor Summary</h3>
          <p>{solution.summary_message}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Clearing Order */}
        <div className="dashboard-card">
          <h3>📋 Clearing Order</h3>
          <ol className="clearing-list">
            {solution.clearing_order?.map((item, i) => (
              <li key={i}>
                <div className="clearing-item">
                  <span className="rank-badge">#{item.priority_rank}</span>
                  <div>
                    <strong>{item.course}</strong>
                    {item.weeks_to_clear && (
                      <span className="weeks-tag">~{item.weeks_to_clear} weeks</span>
                    )}
                    <p>{item.reason}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Deadline Alerts */}
        <div className="dashboard-card">
          <h3>⏰ Deadline Alerts</h3>
          <div className="deadlines-list">
            {solution.deadline_alerts?.map((d, i) => (
              <div key={i} className={`alert-card alert-${d.urgency?.toLowerCase()}`}>
                <div className="alert-header">
                  <strong>{d.course}</strong>
                  <span className="days-left">{d.days_left} days left</span>
                </div>
                <p>Deadline: <strong>{d.deadline}</strong></p>
                {d.action && <p className="alert-action">👉 {d.action}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility Impact */}
        <div className="dashboard-card">
          <h3>🔓 Eligibility Impact</h3>
          <div className="eligibility-list">
            {solution.eligibility_impact?.map((e, i) => (
              <div key={i} className="eligibility-item">
                <div className="eligibility-header">
                  <strong>{e.opportunity}</strong>
                  <span className={`status-badge ${e.currently_eligible ? 'status-ok' : 'status-blocked'}`}>
                    {e.currently_eligible ? '✅ Eligible' : '🚫 Blocked'}
                  </span>
                </div>
                <p>{e.advice}</p>
                {!e.currently_eligible && e.after_clearing && (
                  <p className="after-clearing">✨ After clearing: {e.after_clearing}</p>
                )}
                {!e.currently_eligible && e.blocking_courses?.length > 0 && (
                  <p className="blocking">Blocking: {e.blocking_courses.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="dashboard-card">
          <h3>⚠️ Risk Assessment</h3>
          <div className={`risk-indicator ${getRiskClass(solution.risk_assessment?.level)}`}>
            <strong>Level: {solution.risk_assessment?.level?.toUpperCase()}</strong>
            <p>{solution.risk_assessment?.reason}</p>
            {solution.risk_assessment?.consequence_if_ignored && (
              <p className="consequence">⚡ {solution.risk_assessment.consequence_if_ignored}</p>
            )}
          </div>
        </div>
      </div>

      {/* Study Strategies — full width */}
      {solution.strategies?.length > 0 && (
        <div className="dashboard-card full-card">
          <h3>📚 Study Strategies per Course</h3>
          <div className="strategies-grid">
            {solution.strategies.map((s, i) => (
              <div key={i} className="strategy-card">
                <div className="strategy-header">
                  <h4>{s.course}</h4>
                  <span className="hours-badge">{s.daily_hours} hrs/day</span>
                </div>
                <p className="strategy-desc">{s.study_strategy}</p>
                {s.key_topics?.length > 0 && (
                  <div className="strategy-section">
                    <p className="section-label">🔑 Key Topics</p>
                    <ul>
                      {s.key_topics.map((t, j) => <li key={j}>{t}</li>)}
                    </ul>
                  </div>
                )}
                {s.resources?.length > 0 && (
                  <div className="strategy-section">
                    <p className="section-label">📖 Resources</p>
                    <ul>
                      {s.resources.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {s.tips && <p className="strategy-tip">💡 {s.tips}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Plan — full width */}
      {solution.learning_plan && (
        <div className="dashboard-card full-card">
          <h3>🗓️ Personalized Learning Plan</h3>
          <div className="learning-plan">
            {solution.learning_plan.target_specific_advice && (
              <div className="target-advice">
                <strong>Goal-Specific Advice:</strong>
                <p>{solution.learning_plan.target_specific_advice}</p>
              </div>
            )}

            {solution.learning_plan.daily_schedule && (
              <div className="daily-schedule">
                <h4>📅 Daily Schedule</h4>
                <div className="schedule-grid">
                  <div className="schedule-slot">
                    <span className="slot-label">🌅 Morning</span>
                    <p>{solution.learning_plan.daily_schedule.morning}</p>
                  </div>
                  <div className="schedule-slot">
                    <span className="slot-label">☀️ Afternoon</span>
                    <p>{solution.learning_plan.daily_schedule.afternoon}</p>
                  </div>
                  <div className="schedule-slot">
                    <span className="slot-label">🌙 Evening</span>
                    <p>{solution.learning_plan.daily_schedule.evening}</p>
                  </div>
                </div>
              </div>
            )}

            {solution.learning_plan.weekly_breakdown?.length > 0 && (
              <div className="weekly-plan">
                <h4>📆 Week-by-Week Breakdown ({solution.learning_plan.total_weeks} weeks total)</h4>
                <div className="weeks-list">
                  {solution.learning_plan.weekly_breakdown.map((w, i) => (
                    <div key={i} className="week-item">
                      <div className="week-header">
                        <span className="week-num">Week {w.week}</span>
                        <span className="week-focus">{w.focus}</span>
                      </div>
                      <ul className="week-tasks">
                        {w.tasks?.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                      {w.milestone && (
                        <p className="week-milestone">🏁 Milestone: {w.milestone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
