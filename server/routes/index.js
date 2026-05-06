const express = require('express');
const router = express.Router();
const analyzeRoutes = require('./analyzeRoutes');
const discussRoutes = require('./discussRoutes');
const sceneRoutes = require('./sceneRoutes');

// Routes
router.get('/health', (req, res) => {
  res.send('ok');
});

// API Routes
router.use('/api/analyze', analyzeRoutes);
router.use('/api/discuss', discussRoutes);
router.use('/api/scene', sceneRoutes);

module.exports = router;
