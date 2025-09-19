const processInstanceService = require('./processInstance.service'); // Corregido
const catchAsync = require('../../utils/catchAsync'); // Corregido

const createProcessInstance = catchAsync(async (req, res) => {
  // Añadimos el ID del usuario autenticado como el iniciador del proceso
  const data = {
    ...req.body,
    startedByUserId: req.user.id,
  };
  const instance = await processInstanceService.createProcessInstance(data);
  res.status(201).json(instance);
});

const getAllProcessInstances = catchAsync(async (req, res) => {
  const instances = await processInstanceService.getAllProcessInstances();
  res.status(200).json(instances);
});

const getProcessInstanceById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const instance = await processInstanceService.getProcessInstanceById(id);
  if (!instance) {
    return res.status(404).json({ message: 'Process instance not found' });
  }
  res.status(200).json(instance);
});

const updateProcessInstance = catchAsync(async (req, res) => {
  const { id } = req.params;
  const instance = await processInstanceService.updateProcessInstance(id, req.body);
  res.status(200).json(instance);
});

const deleteProcessInstance = catchAsync(async (req, res) => {
  const { id } = req.params;
  await processInstanceService.deleteProcessInstance(id);
  res.status(204).send();
});

module.exports = {
  createProcessInstance,
  getAllProcessInstances,
  getProcessInstanceById,
  updateProcessInstance,
  deleteProcessInstance,
};
