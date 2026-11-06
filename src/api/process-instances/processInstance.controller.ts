import type { ParamsDictionary } from 'express-serve-static-core';
import { catchAsync } from '../../utils/catchAsync';
import { startProcess } from '../engine/processEngine.service';
import * as processInstanceService from './processInstance.service';

interface CreateProcessInstanceBody {
  businessProcessKey: Parameters<typeof startProcess>[0];
  businessData: Parameters<typeof startProcess>[2];
  description: Parameters<typeof startProcess>[3];
}

/**
 * Inicia una instancia de proceso utilizando el motor de procesos.
 */
export const createProcessInstance = catchAsync<
  ParamsDictionary,
  unknown,
  CreateProcessInstanceBody
>(async (req, res) => {
  const { businessProcessKey, businessData, description } = req.body;
  // Aserción: la ruta está protegida por `protect`, que siempre puebla req.user.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const startedByUserId = req.user!.id;

  const instance = await startProcess(
    businessProcessKey,
    startedByUserId,
    businessData,
    description,
  );

  res.status(201).json({
    processInstanceId: instance.id,
    status: instance.status,
    message: 'Process instance started successfully.',
  });
});

export const createProcessInstanceRecord = catchAsync<
  ParamsDictionary,
  unknown,
  processInstanceService.ProcessInstanceCreateInput
>(async (req, res) => {
  const data = {
    ...req.body,
    // Aserción: la ruta está protegida por `protect`, que siempre puebla req.user.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    startedByUserId: req.user!.id,
  };
  const instance = await processInstanceService.createProcessInstanceRecord(data);
  res.status(201).json(instance);
});

export const getAllProcessInstances = catchAsync(async (_req, res) => {
  const instances = await processInstanceService.getAllProcessInstances();
  res.status(200).json(instances);
});

export const getProcessInstanceById = catchAsync<{ id: string }>(async (req, res) => {
  const { id } = req.params;
  const instance = await processInstanceService.getProcessInstanceById(id);
  if (!instance) {
    return res.status(404).json({ message: 'Process instance not found' });
  }
  res.status(200).json(instance);
});

export const updateProcessInstance = catchAsync<
  { id: string },
  unknown,
  processInstanceService.ProcessInstanceUpdateInput
>(async (req, res) => {
  const { id } = req.params;
  const instance = await processInstanceService.updateProcessInstance(id, req.body);
  res.status(200).json(instance);
});

export const deleteProcessInstance = catchAsync<{ id: string }>(async (req, res) => {
  const { id } = req.params;
  await processInstanceService.deleteProcessInstance(id);
  res.status(204).send();
});
