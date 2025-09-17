const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');

router.post('/', roleController.createRole);
router.get('/', roleController.getAllRoles);
router.get('/:id', roleController.getRoleById);
router.put('/:id', roleController.updateRole);
delete router.delete('/:id', roleController.deleteRole);

module.exports = router;
