const express = require('express');
const elementFormController = require('./element-form.controller');
const protect = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');
const router = express.Router();

// Rutas para gestionar los campos de formulario de un elemento de proceso específico
router
  .route('/:elementId/form-fields')
  .post(protect, isAdmin, elementFormController.addFormField)
  .get(protect, isAdmin, elementFormController.getFormFields);

// Rutas para actualizar o eliminar un link específico (usando su propio ID)
router
  .route('/:elementId/form-fields/:linkId')
  .put(protect, isAdmin, elementFormController.updateFormField)
  .delete(protect, isAdmin, elementFormController.removeFormField);

module.exports = router;
