import type { ProcessInstanceStatus, TaskStatus } from '../../domain/constants';
import type { BusinessData, JsonObject, JsonValue } from '../../domain/types';
import { enrichFieldValue } from '../../utils/formFields';
import type { FieldDefinition } from '../../models/field-definition.model';
import type { ProcessInstance } from '../../models/process-instance.model';
import type { TaskInstance } from '../../models/task-instance.model';

// Proyección de la definición de proceso incluida en una instancia.
export interface ProcessDefinitionSummaryDto {
  id: number;
  businessProcessKey: string;
  name: string;
  description: string | null;
  version: number;
  category: string | null;
  status: string;
  bpmnProcessId: string;
}

export interface UserSummaryDto {
  id: number;
  fullName: string;
  email: string;
}

// Fila de la instancia (todos los atributos del modelo).
export interface InstanceRowDto {
  id: number;
  processDefId: number;
  description: string | null;
  status: ProcessInstanceStatus;
  businessData: BusinessData | null;
  startedByUserId: number;
  startTime: Date;
  endTime: Date | null;
}

export interface InstanceListItemDto extends InstanceRowDto {
  processDefinition: ProcessDefinitionSummaryDto | null;
  startedByUser: UserSummaryDto | null;
}

export interface TaskInstanceDto {
  id: number;
  processInstanceId: number;
  elementDefId: number;
  status: TaskStatus;
  comments: string | null;
  assignedToRoleId: number | null;
  assignedToUserId: number | null;
  dueDate: Date | null;
  createdAt: Date;
  completedByUserId: number | null;
  completionTime: Date | null;
  completionPayload: JsonValue | null;
  processElement: { name: string | null; bpmnElementId: string } | null;
  assignedRole: { name: string } | null;
  assignedUser: { fullName: string } | null;
  completedByUser: { fullName: string } | null;
}

// Sin definición en la biblioteca: datos en crudo, sin `validations`.
export interface BusinessDataFieldDto {
  name: string;
  label: string;
  fieldType: string;
  value: JsonValue | null;
  validations?: JsonObject;
}

export interface InstanceDetailDto extends InstanceListItemDto {
  taskInstances: TaskInstanceDto[];
  businessDataFields: BusinessDataFieldDto[];
}

export const toInstanceRow = (instance: ProcessInstance): InstanceRowDto => {
  const plain = instance.get({ plain: true });
  return {
    id: plain.id,
    processDefId: plain.processDefId,
    description: plain.description,
    status: plain.status,
    businessData: plain.businessData,
    startedByUserId: plain.startedByUserId,
    startTime: plain.startTime,
    endTime: plain.endTime,
  };
};

const toProcessDefinitionSummary = (
  instance: ProcessInstance,
): ProcessDefinitionSummaryDto | null => {
  if (!instance.processDefinition) return null;
  const def = instance.processDefinition.get({ plain: true });
  return {
    id: def.id,
    businessProcessKey: def.businessProcessKey,
    name: def.name,
    description: def.description,
    version: def.version,
    category: def.category,
    status: def.status,
    bpmnProcessId: def.bpmnProcessId,
  };
};

const toUserSummary = (instance: ProcessInstance): UserSummaryDto | null => {
  if (!instance.startedByUser) return null;
  const user = instance.startedByUser.get({ plain: true });
  return { id: user.id, fullName: user.fullName, email: user.email };
};

export const toInstanceListItem = (instance: ProcessInstance): InstanceListItemDto => ({
  ...toInstanceRow(instance),
  processDefinition: toProcessDefinitionSummary(instance),
  startedByUser: toUserSummary(instance),
});

const toTaskInstance = (task: TaskInstance): TaskInstanceDto => {
  const plain = task.get({ plain: true });
  const element = task.processElement?.get({ plain: true });
  const role = task.assignedRole?.get({ plain: true });
  const assignedUser = task.assignedUser?.get({ plain: true });
  const completedByUser = task.completedByUser?.get({ plain: true });
  return {
    id: plain.id,
    processInstanceId: plain.processInstanceId,
    elementDefId: plain.elementDefId,
    status: plain.status,
    comments: plain.comments,
    assignedToRoleId: plain.assignedToRoleId,
    assignedToUserId: plain.assignedToUserId,
    dueDate: plain.dueDate,
    createdAt: plain.createdAt,
    completedByUserId: plain.completedByUserId,
    completionTime: plain.completionTime,
    completionPayload: plain.completionPayload,
    processElement: element ? { name: element.name, bpmnElementId: element.bpmnElementId } : null,
    assignedRole: role ? { name: role.name } : null,
    assignedUser: assignedUser ? { fullName: assignedUser.fullName } : null,
    completedByUser: completedByUser ? { fullName: completedByUser.fullName } : null,
  };
};

/**
 * Detalle de la instancia: enriquece `businessData` con la etiqueta, el tipo, el valor enriquecido
 * y las validaciones de cada campo (`fieldDefs`). Sin datos de negocio, `businessDataFields` es `[]`.
 */
export const toInstanceDetail = (
  instance: ProcessInstance,
  fieldDefs: readonly Pick<FieldDefinition, 'name' | 'label' | 'fieldType' | 'validations'>[],
): InstanceDetailDto => {
  const row = toInstanceRow(instance);
  const fieldDefsByName = new Map(fieldDefs.map((field) => [field.name, field]));

  const businessDataFields = Object.entries(row.businessData ?? {}).map(
    ([key, rawValue]): BusinessDataFieldDto => {
      const fieldDef = fieldDefsByName.get(key);
      if (!fieldDef) {
        return { name: key, label: key, fieldType: 'UNKNOWN', value: rawValue };
      }
      const { value, validations } = enrichFieldValue(fieldDef, rawValue);
      return {
        name: key,
        label: fieldDef.label,
        fieldType: fieldDef.fieldType,
        value,
        // Las validaciones permiten al frontend interpretar el dato (p. ej. las columnas de un GRID).
        validations,
      };
    },
  );

  return {
    ...toInstanceListItem(instance),
    taskInstances: (instance.taskInstances ?? []).map(toTaskInstance),
    businessDataFields,
  };
};
