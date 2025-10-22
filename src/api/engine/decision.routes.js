const express = require('express');
const router = express.Router();
const decisionController = require('./decision.controller');
const protect = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo
router.use(protect);

router.post('/decide-next-task', decisionController.decideNextTask);

module.exports = router;
