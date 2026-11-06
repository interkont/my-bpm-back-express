import type { BusinessData, JsonValue } from '../../domain/types';
import type {
  ElementFormLink,
  FieldDefinition,
  ProcessDefinition,
  ProcessElement,
  ProcessInstance,
  Role,
  TaskInstance,
  User,
} from '../../models';
import { modelError } from '../../domain/errors';
import { enrichFieldValue, toFormField, type FormFieldDto } from '../../utils/formFields';

// Formas planas (`get({ plain: true })`) con solo los atributos que se proyectan en el servicio.
export type InboxTaskPlain = Pick<
  TaskInstance,
  'id' | 'processInstanceId' | 'createdAt' | 'dueDate'
> & {
  processElement?: Pick<ProcessElement, 'name'>;
  processInstance?: Pick<ProcessInstance, 'description'> & {
    processDefinition?: Pick<ProcessDefinition, 'name' | 'version'>;
    startedByUser?: Pick<User, 'fullName'>;
  };
};

export type TaskFormLinkPlain = Pick<
  ElementFormLink,
  'isRequired' | 'isReadonly' | 'contextualValidations'
> & {
  fieldDefinition?: Pick<FieldDefinition, 'name' | 'label' | 'fieldType' | 'validations'>;
};

export type TaskFormPlain = {
  processElement?: Pick<ProcessElement, 'name' | 'actions' | 'caseAssignmentConfig'> & {
    elementFormLinks?: TaskFormLinkPlain[];
  };
  processInstance?: { businessData?: BusinessData | null };
};

// Roles asignables con sus usuarios (proyección de `Role.findAll` con `users`).
export type AssignableRolePlain = Pick<Role, 'id' | 'name'> & {
  users?: Pick<User, 'id' | 'fullName' | 'email'>[];
};

export interface CaseAssignmentDataDto {
  assignableRoles: {
    roleId: number;
    roleName: string;
    users: { userId: number; userName: string; userEmail: string }[];
  }[];
}

export interface InboxItemDto {
  taskId: number;
  taskName: string;
  processInstanceId: number;
  processDescription: string | null | undefined;
  processVersion: number | undefined;
  processName: string;
  processStartedBy: string;
  createdAt: Date;
  dueDate: Date | null;
}

export interface TaskFormDto {
  taskName: string | null;
  fields: FormFieldDto[];
  actions: JsonValue;
  caseAssignmentData?: CaseAssignmentDataDto;
}

export const toInboxItem = (task: InboxTaskPlain): InboxItemDto => ({
  taskId: task.id,
  taskName: task.processElement?.name ?? 'Unnamed Task',
  processInstanceId: task.processInstanceId,
  processDescription: task.processInstance?.description,
  processVersion: task.processInstance?.processDefinition?.version,
  processName: task.processInstance?.processDefinition?.name ?? 'Unknown Process',
  processStartedBy: task.processInstance?.startedByUser?.fullName ?? 'Unknown User',
  createdAt: task.createdAt,
  dueDate: task.dueDate,
});

export const toTaskForm = (task: TaskFormPlain): TaskFormDto => {
  const businessData = task.processInstance?.businessData ?? {};

  // Un elemento o enlace de formulario ausente es un modelo de proceso roto (FR-027).
  const processElement = task.processElement;
  if (!processElement?.elementFormLinks) {
    throw modelError('Task element or form links not found');
  }

  const fields = processElement.elementFormLinks.map((link) => {
    const fieldDefinition = link.fieldDefinition;
    if (!fieldDefinition) {
      throw modelError('Form field definition not found');
    }
    // FR-031: 0, false y "" se muestran tal cual; solo un dato ausente da null.
    const { value } = enrichFieldValue(fieldDefinition, businessData[fieldDefinition.name] ?? null);
    return toFormField(fieldDefinition, link, value);
  });

  return {
    taskName: processElement.name ?? null,
    fields,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- se conserva el `||` del JS
    actions: processElement.actions || ['complete'],
  };
};

/**
 * Roles que la tarea puede asignar al caso, solo si su elemento lo pide
 * (`caseAssignmentConfig.isCaseAssignment === true` con al menos un rol).
 */
export const assignableRoleIds = (task: TaskFormPlain): number[] => {
  const config = task.processElement?.caseAssignmentConfig;
  const roles = config?.assignableRoles;
  if (config?.isCaseAssignment !== true || !Array.isArray(roles)) return [];
  // Postgres acepta ids numéricos como texto ("5"); el resto no puede coincidir con ningún rol.
  return roles
    .filter((id) => typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id)))
    .map(Number);
};

export const toCaseAssignmentData = (roles: AssignableRolePlain[]): CaseAssignmentDataDto => ({
  assignableRoles: roles.map((role) => ({
    roleId: role.id,
    roleName: role.name,
    users: (role.users ?? []).map((user) => ({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
    })),
  })),
});
