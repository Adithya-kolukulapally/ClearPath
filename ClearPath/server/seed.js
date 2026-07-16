require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const ExamCalendar = require('./models/ExamCalendar');
const EligibilityRule = require('./models/EligibilityRule');

async function seedDB() {
  if (!process.env.MONGO_URI) {
    console.error('No MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Course.deleteMany({});
  await ExamCalendar.deleteMany({});
  await EligibilityRule.deleteMany({});

  const courses = [
    { name: 'DBMS', semester: 3, prerequisites: [] },
    { name: 'OS', semester: 4, prerequisites: [] },
    { name: 'DSA', semester: 3, prerequisites: [] },
    { name: 'Advanced DBMS', semester: 5, prerequisites: ['DBMS'] }
  ];

  await Course.insertMany(courses);

  const calendars = [
    { course: 'DBMS', formDeadline: new Date('2026-08-10'), examDate: new Date('2026-09-01'), cycle: '2026-Odd' },
    { course: 'OS', formDeadline: new Date('2026-08-15'), examDate: new Date('2026-09-05'), cycle: '2026-Odd' },
    { course: 'DSA', formDeadline: new Date('2026-08-05'), examDate: new Date('2026-08-25'), cycle: '2026-Odd' }
  ];

  await ExamCalendar.insertMany(calendars);

  const rules = [
    { name: 'TCS Placement Drive', maxBacklogs: 0, minCgpa: 7.0, type: 'placement' },
    { name: 'Higher Studies Scholarship', maxBacklogs: 1, minCgpa: 8.0, type: 'scholarship' }
  ];

  await EligibilityRule.insertMany(rules);

  console.log('Seed data inserted successfully');
  process.exit();
}

seedDB();
