const express = require('express');
const router = express.Router();
const authController = require('./auth.controller'); // Corregido

router.post('/login', authController.login);

module.exports = router;
