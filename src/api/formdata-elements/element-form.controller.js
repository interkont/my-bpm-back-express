const elementFormService = require('./element-form.service');
const catchAsync = require('../../utils/catchAsync');

const addFormField = catchAsync(async (req, res) => {
  const { elementId } = req.params;
  const link = await elementFormService.addFormFieldToElement(elementId, req.body);
  res.status(201).json(link);
});

const getFormFields = catchAsync(async (req, res) => {
  const { elementId } = req.params;
  const fields = await elementFormService.getFormFieldsForElement(elementId);
  res.status(200).json(fields);
});

const updateFormField = catchAsync(async (req, res) => {
  const { linkId } = req.params;
  // El elementId se podría usar para validar que el linkId pertenece al elemento correcto si fuera necesario
  const link = await elementFormService.updateFormField(linkId, req.body);
  res.status(200).json(link);
});

const removeFormField = catchAsync(async (req, res) => {
  const { linkId } = req.params;
  await elementFormService.removeFormField(linkId);
  res.status(204).send();
});

module.exports = {
  addFormField,
  getFormFields,
  updateFormField,
  removeFormField,
};
