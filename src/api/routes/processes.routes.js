const express = require('express');
const router = express.Router();
const processController = require('../controllers/process.controller');
const protect = require('../middlewares/auth.middleware');

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
