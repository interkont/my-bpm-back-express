const router = require('express').Router();
const roleRoutes = require('./role.routes.js');
const userRoutes = require('./user.routes.js');
const authRoutes = require('../auth/auth.routes');
const taskRoutes = require('../api/routes/tasks.routes');
// const adminRoutes = require('../api/routes/admin.routes'); // Comentado hasta que se implemente
// const processesRoutes = require('../api/routes/processes.routes'); // Comentado hasta que se implemente


// Rutas existentes
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);

// Nuevas rutas de la API
router.use('/tasks', taskRoutes);
// router.use('/admin', adminRoutes); // Comentado hasta que se implemente
// router.use('/processes', processesRoutes); // Comentado hasta que se implemente


module.exports = router;
