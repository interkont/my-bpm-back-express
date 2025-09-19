const router = require('express').Router();
const roleRoutes = require('./role.routes.js');
const userRoutes = require('./user.routes.js');
const authRoutes = require('../auth/auth.routes');
const taskRoutes = require('../api/routes/tasks.routes');
const adminRoutes = require('../api/routes/admin.routes'); // Mantenido
const processesRoutes = require('../api/routes/processes.routes');
const processInstancesRoutes = require('../api/routes/processInstances.routes'); // Añadido

// Rutas existentes
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);

// Rutas de procesos y sus instancias
router.use('/processes', processesRoutes);
router.use('/process-instances', processInstancesRoutes); // Activado
// router.use('/admin', adminRoutes); // Mantenido y comentado

module.exports = router;
