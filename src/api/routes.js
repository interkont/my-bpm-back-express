const router = require('express').Router();
const roleRoutes = require('./roles/role.routes');
const userRoutes = require('./users/user.routes');
const authRoutes = require('./auth/auth.routes');
const taskRoutes = require('./tasks/tasks.routes');
// const adminRoutes = require('./admin.routes'); // Corregido: Comentado porque el archivo no ha sido refactorizado aún
const processesRoutes = require('./processes/processes.routes');
const processInstancesRoutes = require('./process-instances/processInstances.routes.js');

// Rutas de la API
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/processes', processesRoutes);
router.use('/process-instances', processInstancesRoutes);
// router.use('/admin', adminRoutes);

module.exports = router;
