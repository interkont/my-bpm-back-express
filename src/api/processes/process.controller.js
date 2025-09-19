const processService = require('./process.service'); // Corregido
const catchAsync = require('../../utils/catchAsync'); // Corregido

const createProcessDefinition = catchAsync(async (req, res) => {
  const processDefinition = await processService.createProcessDefinition(req.body);
  res.status(201).json(processDefinition);
});

const getAllProcessDefinitions = catchAsync(async (req, res) => {
  const processDefinitions = await processService.getAllProcessDefinitions();
  res.status(200).json(processDefinitions);
});

const getProcessDefinitionById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const processDefinition = await processService.getProcessDefinitionById(id);
  if (!processDefinition) {
    return res.status(404).json({ message: 'Process definition not found' });
  }
  res.status(200).json(processDefinition);
});

const updateProcessDefinition = catchAsync(async (req, res) => {
  const { id } = req.params;
  const processDefinition = await processService.updateProcessDefinition(id, req.body);
  res.status(200).json(processDefinition);
});

const deleteProcessDefinition = catchAsync(async (req, res) => {
  const { id } = req.params;
  await processService.deleteProcessDefinition(id);
  res.status(204).send();
});

module.exports = {
  createProcessDefinition,
  getAllProcessDefinitions,
  getProcessDefinitionById,
  updateProcessDefinition,
  deleteProcessDefinition,
};
