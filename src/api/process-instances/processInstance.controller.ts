import type { ParamsDictionary } from 'express-serve-static-core';
import { notFound } from '../../domain/errors';
import { catchAsync } from '../../utils/catchAsync';
import { pick } from '../../utils/pick';
import { startProcess } from '../engine/execution.service';
import * as processInstanceService from './processInstance.service';
import type {
  CreateProcessInstanceRecordInput,
  StartProcessInstanceInput,
  UpdateProcessInstanceInput,
} from './processInstance.schemas';

/**
 * Inicia una instancia de proceso utilizando el motor de procesos.
 */
export const createProcessInstance = catchAsync<
  ParamsDictionary,
  unknown,
  StartProcessInstanceInput
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
  CreateProcessInstanceRecordInput
>(async (req, res) => {
  // Lista blanca (FR-029): id, startedByUserId y claves desconocidas del cuerpo se ignoran.
  const data = {
    ...pick(req.body, [
      'processDefId',
      'description',
      'status',
      'businessData',
      'startTime',
      'endTime',
    ]),
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
    throw notFound('Process instance not found');
  }
  res.status(200).json(instance);
});

export const updateProcessInstance = catchAsync<
  { id: string },
  unknown,
  UpdateProcessInstanceInput
>(async (req, res) => {
  const { id } = req.params;
  // Lista blanca (FR-029): id, processDefId, startedByUserId y startTime no se modifican.
  const data = pick(req.body, ['description', 'status', 'businessData', 'endTime']);
  const instance = await processInstanceService.updateProcessInstance(id, data);
  res.status(200).json(instance);
});

export const deleteProcessInstance = catchAsync<{ id: string }>(async (req, res) => {
  const { id } = req.params;
  await processInstanceService.deleteProcessInstance(id);
  res.status(204).send();
});
