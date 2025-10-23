const express = require('express');
const router = express.Router();
const decisionController = require('./decision.controller');
const protect = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware'); // Necesitamos el middleware de admin

// Proteger todas las rutas de este módulo
router.use(protect);

router.post('/decide-next-task', decisionController.decideNextTask);

// Nueva ruta para consultar los logs, solo para administradores
router.get('/decision-logs', isAdmin, decisionController.getDecisionLogs);

module.exports = router;
