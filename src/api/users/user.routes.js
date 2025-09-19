const express = require('express');
const router = express.Router();
const userController = require('./user.controller'); // Corregido
const authMiddleware = require('../middlewares/auth.middleware'); // Corregido

router.post('/', userController.createUser);
router.get('/', authMiddleware, userController.getAllUsers);
router.get('/:id', authMiddleware, userController.getUserById);
router.put('/:id', authMiddleware, userController.updateUser);
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;
