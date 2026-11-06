const express = require('express');
const fieldController = require('./field.controller');
const protect = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');
const router = express.Router();

router.route('/types').get(protect, isAdmin, fieldController.getFieldTypes);

router
  .route('/')
  .post(protect, isAdmin, fieldController.createField)
  .get(protect, isAdmin, fieldController.getFields);

router
  .route('/:id')
  .get(protect, isAdmin, fieldController.getField)
  .put(protect, isAdmin, fieldController.updateField)
  .delete(protect, isAdmin, fieldController.deleteField);

module.exports = router;
