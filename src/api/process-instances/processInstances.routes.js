const express = require('express');
const router = express.Router();
const instanceController = require('./processInstance.controller'); // Corregido
const protect = require('../middlewares/auth.middleware'); // Corregido

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(instanceController.createProcessInstance)
  .get(instanceController.getAllProcessInstances);

router
  .route('/:id')
  .get(instanceController.getProcessInstanceById)
  .put(instanceController.updateProcessInstance)
  .delete(instanceController.deleteProcessInstance);

module.exports = router;
