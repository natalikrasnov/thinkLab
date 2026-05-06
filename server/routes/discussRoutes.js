const express = require('express');
const router = express.Router();
const { discussHandler } = require('../controllers/discussController');

router.post('/', discussHandler);

module.exports = router;
