
const express = require('express');
const taskController = require('./task.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas de tareas a partir de aquí requieren autenticación
router.use(protect);

router.get('/my-tasks', taskController.getMyTasks);

// Nueva ruta para obtener el formulario de una tarea específica
router.get('/:id/form', taskController.getTaskForm);

module.exports = router;
