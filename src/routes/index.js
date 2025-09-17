const express = require('express');
const router = express.Router();

const roleRoutes = require('./role.routes.js');
const userRoutes = require('./user.routes.js');
const authRoutes = require('../auth/auth.routes');

// Rutas
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);

module.exports = router;
