import * as processService from './process.service';
import type { MetadataInput, SaveProcessInput } from './process.schemas';
import { catchAsync } from '../../utils/catchAsync';

interface IdParams {
  id: string;
}

// En POST / no hay :id (creación); en PUT /:id sí.
interface OptionalIdParams {
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
    return res.status(404).json({ message: 'Process definition not found' });
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
