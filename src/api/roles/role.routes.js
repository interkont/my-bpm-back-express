const express = require('express');
const router = express.Router();
const roleController = require('./role.controller');
const protect = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas de roles
router.use(protect);

router.post('/', roleController.createRole);
router.get('/', roleController.getAllRoles);
router.get('/:id', roleController.getRoleById);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

module.exports = router;
