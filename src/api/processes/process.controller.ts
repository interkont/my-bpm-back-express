import type { ParamsDictionary } from 'express-serve-static-core';
import * as processService from './process.service';
import type { MetadataInput, SaveProcessInput } from './process.schemas';
import { catchAsync } from '../../utils/catchAsync';
import { notFound } from '../../domain/errors';

// Extiende ParamsDictionary para encajar con los validadores de id genéricos de las rutas.
interface IdParams extends ParamsDictionary {
  id: string;
}

// En POST / no hay :id (creación); en PUT /:id sí.
interface OptionalIdParams extends Partial<ParamsDictionary> {
  id?: string;
}

export const getSaveAnalysis = catchAsync<IdParams>(async (req, res) => {
  const { id } = req.params;
  const analysis = await processService.getSaveAnalysis(id);
  res.status(200).json(analysis);
});

export const saveProcessDefinition = catchAsync<OptionalIdParams, unknown, SaveProcessInput>(
  async (req, res) => {
    const { id } = req.params; // Podría no existir para la creación
    const processDefinition = await processService.saveProcessDefinition(id, req.body);
    res.status(id ? 200 : 201).json(processDefinition);
  },
);

export const updateProcessDefinitionMetadata = catchAsync<IdParams, unknown, MetadataInput>(
  async (req, res) => {
    const { id } = req.params;
    const processDefinition = await processService.updateProcessDefinitionMetadata(id, req.body);
    res.status(200).json(processDefinition);
  },
);

export const getAllProcessDefinitions = catchAsync(async (_req, res) => {
  const processDefinitions = await processService.getAllProcessDefinitions();
  res.status(200).json(processDefinitions);
});

export const getAllProcessDefinitionsAdmin = catchAsync(async (_req, res) => {
  const processDefinitions = await processService.getAllProcessDefinitionsAdmin();
  res.status(200).json(processDefinitions);
});

export const getProcessDefinitionById = catchAsync<IdParams>(async (req, res) => {
  const { id } = req.params;
  const processDefinition = await processService.getProcessDefinitionById(id);
  if (!processDefinition) {
    throw notFound('Process definition not found');
  }
  res.status(200).json(processDefinition);
});

export const deleteProcessDefinition = catchAsync<IdParams>(async (req, res) => {
  const { id } = req.params;
  await processService.deleteProcessDefinition(id);
  res.status(204).send();
});

export const getStartForm = catchAsync<IdParams>(async (req, res) => {
  const { id } = req.params;
  const formDefinition = await processService.getStartForm(id);
  res.status(200).json(formDefinition);
});
