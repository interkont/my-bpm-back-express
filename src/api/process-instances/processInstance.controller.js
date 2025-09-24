const processInstanceService = require('./processInstance.service');
const processEngineService = require('../engine/processEngine.service');
const catchAsync = require('../../utils/catchAsync');

/**
 * Inicia una instancia de proceso utilizando el motor de procesos.
 */
const createProcessInstance = catchAsync(async (req, res) => {
  // Ahora también pasamos la descripción al motor.
  const { businessProcessKey, businessData, description } = req.body;
  const startedByUserId = req.user.id;
  
  const instance = await processEngineService.startProcess(businessProcessKey, startedByUserId, businessData, description);
  
  res.status(201).json({
    processInstanceId: instance.id,
    status: instance.status,
    message: "Process instance started successfully."
  });
});

// ... (El resto de funciones permanecen igual)
const createProcessInstanceRecord = catchAsync(async (req, res) => {
    const data = {
      ...req.body,
      startedByUserId: req.user.id,
    };
    const instance = await processInstanceService.createProcessInstanceRecord(data);
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
    createProcessInstanceRecord,
    getAllProcessInstances,
    getProcessInstanceById,
    updateProcessInstance,
    deleteProcessInstance,
  };
