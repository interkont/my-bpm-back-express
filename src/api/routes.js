const router = require('express').Router();
const roleRoutes = require('./roles/role.routes');
const userRoutes = require('./users/user.routes');
const authRoutes = require('./auth/auth.routes');
const taskRoutes = require('./tasks/tasks.routes');
const processesRoutes = require('./processes/processes.routes');
const processInstancesRoutes = require('./process-instances/processInstances.routes.js');
const decisionRoutes = require('./engine/decision.routes.js'); // Importar nuevas rutas

// Rutas de la API
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/processes', processesRoutes);
router.use('/process-instances', processInstancesRoutes);
router.use('/engine', decisionRoutes); // Usar nuevas rutas

module.exports = router;
