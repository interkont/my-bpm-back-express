const express = require('express');
const router = express.Router();
const processController = require('./process.controller');
const protect = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(processController.saveProcessDefinition)
  .get(processController.getAllProcessDefinitions);

// Nueva ruta de administrador para obtener TODOS los procesos
router.get('/all', isAdmin, processController.getAllProcessDefinitionsAdmin);

router.get('/:id/start-form', processController.getStartForm);

router
  .route('/:id')
  .get(processController.getProcessDefinitionById)
  .put(processController.saveProcessDefinition)
  .patch(processController.updateProcessDefinitionMetadata)
  .delete(processController.deleteProcessDefinition);

module.exports = router;
