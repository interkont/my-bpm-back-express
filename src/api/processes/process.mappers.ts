import type { ProcessDefinition, ProcessElement, ProcessSequence } from '../../models';
import type { ElementType, ProcessDefinitionStatus, SaveAction } from '../../domain/constants';
import type { JsonObject, JsonValue } from '../../domain/types';
import { toFieldDefinitionDto, type FieldDefinitionDto } from '../fields/field.mappers';

// Fila de definición tal como la devuelven POST/PUT/PATCH (incluye bpmnXml).
export interface ProcessDefinitionRowDto {
  id: number;
  businessProcessKey: string;
  name: string;
  description: string | null;
  version: number;
  category: string | null;
  status: ProcessDefinitionStatus;
  bpmnProcessId: string;
  createdAt: Date;
  bpmnXml: string | null;
}

// Elemento de la definición tal como se serializa hoy.
export interface ProcessElementDto {
  id: number;
  processDefId: number;
  bpmnElementId: string;
  name: string | null;
  description: string | null;
  type: ElementType;
  assignedRoleId: number | null;
  webhookTarget: string | null;
  slaDefinition: JsonValue | null;
  actions: JsonValue | null;
  caseAssignmentConfig: JsonObject | null;
  // Vínculos de formulario con la forma que el modelador reenvía al guardar.
  formFields: ElementFormFieldDto[];
}

export interface ElementFormFieldDto {
  id: number;
  fieldDefId: number;
  displayOrder: number;
  isRequired: boolean;
  isReadonly: boolean;
  contextualValidations: JsonObject | null;
  fieldDefinition: FieldDefinitionDto | null;
}

export interface ProcessSequenceDto {
  id: number;
  processDefId: number;
  sourceElementBpmnId: string;
  targetElementBpmnId: string;
  conditionExpression: string | null;
}

// Listados: la misma fila sin bpmnXml.
export type ProcessDefinitionListItemDto = Omit<ProcessDefinitionRowDto, 'bpmnXml'>;

export interface ProcessDefinitionDetailDto extends ProcessDefinitionListItemDto {
  elements: ProcessElementDto[];
  sequences: ProcessSequenceDto[];
  diagramJson: JsonValue;
}

export interface SaveAnalysisDto {
  state: ProcessDefinitionStatus;
  instancesCount: number;
  action: SaveAction;
}

export const toDefinitionListItem = (entity: ProcessDefinition): ProcessDefinitionListItemDto => {
  const row = entity.get({ plain: true });
  return {
    id: row.id,
    businessProcessKey: row.businessProcessKey,
    name: row.name,
    description: row.description,
    version: row.version,
    category: row.category,
    status: row.status,
    bpmnProcessId: row.bpmnProcessId,
    createdAt: row.createdAt,
  };
};

export const toDefinitionRow = (entity: ProcessDefinition): ProcessDefinitionRowDto => ({
  ...toDefinitionListItem(entity),
  bpmnXml: entity.get({ plain: true }).bpmnXml,
});

const toElement = (entity: ProcessElement): ProcessElementDto => {
  const row = entity.get({ plain: true });
  return {
    id: row.id,
    processDefId: row.processDefId,
    bpmnElementId: row.bpmnElementId,
    name: row.name,
    description: row.description,
    type: row.type,
    assignedRoleId: row.assignedRoleId,
    webhookTarget: row.webhookTarget,
    slaDefinition: row.slaDefinition,
    actions: row.actions,
    caseAssignmentConfig: row.caseAssignmentConfig,
    formFields: (entity.elementFormLinks ?? []).map((link) => ({
      id: link.id,
      fieldDefId: link.fieldDefId,
      displayOrder: link.displayOrder,
      isRequired: link.isRequired,
      isReadonly: link.isReadonly,
      contextualValidations: link.contextualValidations,
      fieldDefinition: link.fieldDefinition ? toFieldDefinitionDto(link.fieldDefinition) : null,
    })),
  };
};

const toSequence = (entity: ProcessSequence): ProcessSequenceDto => {
  const row = entity.get({ plain: true });
  return {
    id: row.id,
    processDefId: row.processDefId,
    sourceElementBpmnId: row.sourceElementBpmnId,
    targetElementBpmnId: row.targetElementBpmnId,
    conditionExpression: row.conditionExpression,
  };
};

// bpmnXml vacío, nulo o con JSON inválido se expone como `{}`.
const parseDiagram = (bpmnXml: string | null): JsonValue => {
  try {
    // El texto lo escribe este mismo servicio con JSON.stringify; se acepta como JSON.
    return bpmnXml ? (JSON.parse(bpmnXml) as JsonValue) : {};
  } catch {
    return {};
  }
};

// Mismo orden de claves que hoy: fila (sin bpmnXml) + elements/sequences/diagramJson.
export const toDefinitionDetail = (entity: ProcessDefinition): ProcessDefinitionDetailDto => ({
  ...toDefinitionListItem(entity),
  elements: (entity.processElements ?? []).map(toElement),
  sequences: (entity.processSequences ?? []).map(toSequence),
  diagramJson: parseDiagram(entity.get({ plain: true }).bpmnXml),
});

export const toSaveAnalysis = (
  state: ProcessDefinitionStatus,
  instancesCount: number,
): SaveAnalysisDto => ({
  state,
  instancesCount,
  action: state === 'ACTIVE' || instancesCount > 0 ? 'CREATE_NEW_VERSION' : 'UPDATE_IN_PLACE',
});
