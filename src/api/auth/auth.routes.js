const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/login', authController.login);
router.put('/profile', protect, authController.updateProfile);

module.exports = router;
