import type { BusinessData, JsonValue } from '../../domain/types';
import type {
  ElementFormLink,
  FieldDefinition,
  ProcessDefinition,
  ProcessElement,
  ProcessInstance,
  TaskInstance,
  User,
} from '../../models';
import { modelError } from '../../domain/errors';
import { toFormField, type FormFieldDto } from '../../utils/formFields';

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
  processElement?: Pick<ProcessElement, 'name'> & { elementFormLinks?: TaskFormLinkPlain[] };
  processInstance?: { businessData?: BusinessData | null };
};

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
  actions: string[];
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
    const value: JsonValue | null = businessData[fieldDefinition.name] ?? null;
    return toFormField(fieldDefinition, link, value);
  });

  // `actions` no es un atributo del modelo ProcessElement (nunca se carga), por lo que
  // hoy siempre resulta `['complete']`. Se lee por Reflect.get para conservar el `||` del JS.
  // El `as` es seguro: el valor es `undefined` o, a lo sumo, un arreglo de strings.
  const actions = Reflect.get(processElement, 'actions') as string[] | undefined;

  return {
    taskName: processElement.name ?? null,
    fields,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- se conserva el `||` del JS
    actions: actions || ['complete'],
  };
};
