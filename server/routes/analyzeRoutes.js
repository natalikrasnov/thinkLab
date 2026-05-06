const express = require('express');
const router = express.Router();
const { analyzeHandler } = require('../controllers/analyzeController');

router.post('/', analyzeHandler);

module.exports = router;
