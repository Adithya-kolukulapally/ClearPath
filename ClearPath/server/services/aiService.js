const { GoogleGenerativeAI } = require('@google/generative-ai');

async function generateBacklogSolution(studentData, prerequisites, examCalendar, eligibilityRules) {
  const target = studentData.target || 'placement';
  const backlogs = studentData.backlogs || [];

  const targetLabels = {
    placement: 'Campus Placement / Job Recruitment',
    higher_studies: 'Higher Studies (M.Tech / MS / MBA)',
    scholarship: 'Scholarship Eligibility'
  };

  const prompt = `You are an expert academic advisor AI specializing in helping students clear backlogs and achieve their career goals.

The student's target goal is: **${targetLabels[target]}**

Analyze the student's profile and return ONLY valid JSON (no markdown, no extra text) in this EXACT structure:

{
  "clearing_order": [
    {"course": "", "reason": "", "priority_rank": 1, "weeks_to_clear": 2}
  ],
  "deadline_alerts": [
    {"course": "", "deadline": "", "days_left": 0, "urgency": "high/medium/low", "action": ""}
  ],
  "eligibility_impact": [
    {"opportunity": "", "currently_eligible": false, "blocking_courses": [], "advice": "", "after_clearing": ""}
  ],
  "strategies": [
    {
      "course": "",
      "study_strategy": "",
      "daily_hours": 2,
      "key_topics": ["", ""],
      "resources": ["", ""],
      "tips": ""
    }
  ],
  "learning_plan": {
    "total_weeks": 8,
    "weekly_breakdown": [
      {"week": 1, "focus": "", "tasks": ["", ""], "milestone": ""}
    ],
    "daily_schedule": {
      "morning": "",
      "afternoon": "",
      "evening": ""
    },
    "target_specific_advice": ""
  },
  "risk_assessment": {"level": "low/medium/high", "reason": "", "consequence_if_ignored": ""},
  "summary_message": ""
}

STUDENT PROFILE:
${JSON.stringify(studentData, null, 2)}

PREREQUISITES MAP: ${JSON.stringify(prerequisites)}
EXAM CALENDAR: ${JSON.stringify(examCalendar)}
ELIGIBILITY RULES: ${JSON.stringify(eligibilityRules)}
Today's date: ${new Date().toISOString().split('T')[0]}

STRICT INSTRUCTIONS:
- The student's goal is ${targetLabels[target]} — tailor ALL advice specifically for this goal.
- For PLACEMENT: focus on clearing backlogs quickly, highlight aptitude/coding relevance, mention company-specific backlog rules.
- For HIGHER STUDIES: focus on CGPA recovery, entrance exam timing (GATE/GRE), mention how backlogs affect admission chances.
- For SCHOLARSHIP: focus on CGPA requirements, attendance rules, which backlogs to clear to maximize CGPA impact.
- In "strategies", give a per-course study plan with specific resources (YouTube channels, books, websites).
- In "learning_plan", give a week-by-week breakdown tailored to clear all backlogs before the next exam cycle.
- Sequence backlogs respecting prerequisites AND exam dates.
- Be highly specific, actionable, and motivating — not generic.
- Return ONLY valid JSON. No markdown, no explanations outside the JSON.`;

  // Dynamic mock if no API key
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('Using dynamic mock AI response (GEMINI_API_KEY not provided)');
    const today = new Date();

    const targetAdvice = {
      placement: 'Companies like TCS, Infosys, and Wipro require 0 active backlogs at the time of joining. Clear all backlogs before your 7th semester to stay eligible.',
      higher_studies: 'GATE and GRE do not directly penalize backlogs, but IITs and NITs check your marksheet. A clean record by final year greatly improves your chances.',
      scholarship: 'Most merit scholarships require a minimum CGPA of 8.0 and 0 backlogs. Clearing backlogs will also help improve your CGPA in the revaluation cycle.'
    };

    const clearing_order = backlogs.map((b, i) => ({
      course: b.course,
      reason: i === 0
        ? `Clear first — highest impact on your ${target.replace('_', ' ')} goal.`
        : `Clear after ${backlogs[i - 1].course} based on exam schedule and prerequisites.`,
      priority_rank: i + 1,
      weeks_to_clear: 3 + i
    }));

    const deadline_alerts = backlogs.map((b, i) => {
      const daysLeft = 20 + i * 5;
      const deadline = new Date(today.getTime() + daysLeft * 24 * 60 * 60 * 1000);
      return {
        course: b.course,
        deadline: deadline.toISOString().split('T')[0],
        days_left: daysLeft,
        urgency: daysLeft < 15 ? 'high' : daysLeft < 25 ? 'medium' : 'low',
        action: `Submit backlog exam form immediately. Do not miss this — next chance is in 6 months.`
      };
    });

    const strategies = backlogs.map(b => ({
      course: b.course,
      study_strategy: `Focus on previous year question papers (last 5 years) and understand the core concepts. Spend 2 hours daily with active recall.`,
      daily_hours: 2,
      key_topics: [`Core fundamentals of ${b.course}`, `Frequently asked exam questions`, `Practical applications`],
      resources: [`YouTube: Gate Smashers`, `Book: Standard textbook for ${b.course}`, `Website: GeeksforGeeks`],
      tips: `Practice past papers under timed conditions. Form a study group for accountability.`
    }));

    const weeklyBreakdown = backlogs.map((b, i) => ({
      week: i + 1,
      focus: `${b.course} — Intensive Preparation`,
      tasks: [
        `Read and summarize all key chapters of ${b.course}`,
        `Solve 50 previous year questions`,
        `Take 2 mock tests and review mistakes`
      ],
      milestone: `Complete ${b.course} preparation — ready for exam`
    }));

    return {
      clearing_order,
      deadline_alerts,
      eligibility_impact: [
        {
          opportunity: target === 'placement' ? 'Campus Placement Drive' : target === 'scholarship' ? 'Merit Scholarship' : 'M.Tech / MS Admission',
          currently_eligible: backlogs.length === 0,
          blocking_courses: backlogs.map(b => b.course),
          advice: backlogs.length > 0
            ? `Clear all ${backlogs.length} backlog(s) to become eligible for your target.`
            : 'You are currently eligible! Maintain your CGPA.',
          after_clearing: `Once you clear ${backlogs.map(b => b.course).join(' and ')}, you will meet the eligibility criteria for ${targetLabels[target]}.`
        }
      ],
      strategies,
      learning_plan: {
        total_weeks: backlogs.length * 3 + 2,
        weekly_breakdown: weeklyBreakdown,
        daily_schedule: {
          morning: '7am–9am: Revise theory and key concepts (2 hrs)',
          afternoon: '2pm–4pm: Solve practice problems and past papers (2 hrs)',
          evening: '8pm–9pm: Review errors, watch concept videos (1 hr)'
        },
        target_specific_advice: targetAdvice[target]
      },
      risk_assessment: {
        level: backlogs.length > 2 ? 'high' : backlogs.length > 0 ? 'medium' : 'low',
        reason: backlogs.length > 0
          ? `${backlogs.length} pending backlog(s) are actively blocking your ${target.replace('_', ' ')} goal.`
          : 'No active backlogs — you are on track!',
        consequence_if_ignored: `Missing the next exam cycle adds 6 more months of delay and severely impacts ${targetLabels[target]} eligibility.`
      },
      summary_message: `You have ${backlogs.length} backlog(s): ${backlogs.map(b => b.course).join(', ')}. Follow this personalized plan to clear them and achieve your goal of ${targetLabels[target]}!`
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini response parse failed:', err, text);
    throw new Error('Failed to parse AI response from Gemini');
  }
}

module.exports = { generateBacklogSolution };
