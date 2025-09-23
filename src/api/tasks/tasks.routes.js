
const express = require('express');
const taskController = require('./task.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/my-tasks', taskController.getMyTasks);
router.get('/:id/form', taskController.getTaskForm);

// Nuevo endpoint para completar una tarea
router.post('/:id/complete', taskController.completeTask);

module.exports = router;
