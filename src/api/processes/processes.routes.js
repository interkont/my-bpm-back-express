const express = require('express');
const router = express.Router();
const processController = require('./process.controller'); // Corregido
const protect = require('../middlewares/auth.middleware'); // Corregido

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(processController.createProcessDefinition)
  .get(processController.getAllProcessDefinitions);

router
  .route('/:id')
  .get(processController.getProcessDefinitionById)
  .put(processController.updateProcessDefinition)
  .delete(processController.deleteProcessDefinition);

module.exports = router;
