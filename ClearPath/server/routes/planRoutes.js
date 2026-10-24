const express = require('express');
const router = express.Router();
const { generatePlan } = require('../controllers/planController');
const authenticate = require('../middleware/authenticate');

router.post('/generate', authenticate, generatePlan);

module.exports = router;
