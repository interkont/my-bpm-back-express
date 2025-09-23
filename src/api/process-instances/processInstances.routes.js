const express = require('express');
const router = express.Router();
const instanceController = require('./processInstance.controller');
const protect = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(instanceController.createProcessInstance) // Ruta principal que usa el motor
  .get(instanceController.getAllProcessInstances);

// Nueva ruta administrativa para crear un registro directamente
router.post('/record', instanceController.createProcessInstanceRecord);

router
  .route('/:id')
  .get(instanceController.getProcessInstanceById)
  .put(instanceController.updateProcessInstance)
  .delete(instanceController.deleteProcessInstance);

module.exports = router;
