const processService = require('./process.service');
const catchAsync = require('../../utils/catchAsync');

const getSaveAnalysis = catchAsync(async (req, res) => {
  const { id } = req.params;
  const analysis = await processService.getSaveAnalysis(id);
  res.status(200).json(analysis);
});

const saveProcessDefinition = catchAsync(async (req, res) => {
  const { id } = req.params; // Podría no existir para la creación
  const processDefinition = await processService.saveProcessDefinition(id, req.body);
  res.status(id ? 200 : 201).json(processDefinition);
});

const updateProcessDefinitionMetadata = catchAsync(async (req, res) => {
  const { id } = req.params;
  const processDefinition = await processService.updateProcessDefinitionMetadata(id, req.body);
  res.status(200).json(processDefinition);
});

const getAllProcessDefinitions = catchAsync(async (req, res) => {
  const processDefinitions = await processService.getAllProcessDefinitions();
  res.status(200).json(processDefinitions);
});

const getAllProcessDefinitionsAdmin = catchAsync(async (req, res) => {
  const processDefinitions = await processService.getAllProcessDefinitionsAdmin();
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

const deleteProcessDefinition = catchAsync(async (req, res) => {
  const { id } = req.params;
  await processService.deleteProcessDefinition(id);
  res.status(204).send();
});

const getStartForm = catchAsync(async (req, res) => {
  const { id } = req.params;
  const formDefinition = await processService.getStartForm(id);
  res.status(200).json(formDefinition);
});

module.exports = {
  getSaveAnalysis,
  saveProcessDefinition,
  updateProcessDefinitionMetadata,
  getAllProcessDefinitions,
  getAllProcessDefinitionsAdmin,
  getProcessDefinitionById,
  deleteProcessDefinition,
  getStartForm,
};
