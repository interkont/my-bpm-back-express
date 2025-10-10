const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const protect = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');

router.post('/', protect, isAdmin, userController.createUser);
router.get('/', protect, isAdmin, userController.getAllUsers);
router.get('/:id', protect, isAdmin, userController.getUserById);
router.put('/:id', protect, isAdmin, userController.updateUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;
