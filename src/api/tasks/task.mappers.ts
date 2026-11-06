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

  // Los includes del servicio garantizan processElement y elementFormLinks; si faltaran,
  // el JS original lanzaba un TypeError (500) y aquí ocurre igual.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const processElement = task.processElement!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const fields = processElement.elementFormLinks!.map((link) => {
    // El include anidado garantiza fieldDefinition (FK obligatoria); mismo fallo que el JS si faltara.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fieldDefinition = link.fieldDefinition!;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `||` del JS: valores falsy (0, '', false) deben dar null (se corrige en US3, FR-031)
    const value: JsonValue | null = businessData[fieldDefinition.name] || null;
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
