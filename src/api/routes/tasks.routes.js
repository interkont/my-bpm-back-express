
const express = require('express');
const taskController = require('../controllers/task.controller');
const protect = require('../middlewares/auth.middleware'); // Corregido

const router = express.Router();

// Todas las rutas de tareas a partir de aquí requieren autenticación
router.use(protect); // Corregido

/**
 * @swagger
 * /tasks/my-tasks:
 *   get:
 *     summary: Obtiene la bandeja de entrada del usuario autenticado
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Una lista de las tareas pendientes del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   taskId:
 *                     type: integer
 *                   taskName:
 *                     type: string
 *                   processInstanceId:
 *                     type: integer
 *                   processName:
 *                     type: string
 *                   processStartedBy:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: No autorizado (token no válido o no proporcionado)
 */
router.get('/my-tasks', taskController.getMyTasks);

module.exports = router;
