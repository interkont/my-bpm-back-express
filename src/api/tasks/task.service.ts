import { Op } from 'sequelize';
import type { JsonObject, JsonValue } from '../../domain/types';
import {
  ElementFormLink,
  FieldDefinition,
  ProcessDefinition,
  ProcessElement,
  ProcessInstance,
  TaskInstance,
  User,
} from '../../models';

export interface MyTaskDto {
  taskId: number;
  taskName: string;
  processInstanceId: number;
  processDescription: string | null | undefined;
  processVersion: number | string | undefined;
  processName: string;
  processStartedBy: string;
  createdAt: Date;
  dueDate: Date | null;
}

export interface TaskFormField {
  name: string;
  label: string;
  fieldType: string;
  value: JsonValue | null;
  validations: JsonObject;
}

export interface TaskFormDefinition {
  taskName: string | null;
  fields: TaskFormField[];
  actions: string[];
}

/**
 * Obtiene la bandeja de entrada de un usuario.
 */
export const getMyTasks = async (userId: number, roleIds: number[]): Promise<MyTaskDto[]> => {
  const taskInstances = await TaskInstance.findAll({
    where: {
      status: 'PENDING',
      [Op.or]: [{ assignedToUserId: userId }, { assignedToRoleId: { [Op.in]: roleIds } }],
    },
    include: [
      {
        model: ProcessInstance,
        as: 'processInstance',
        include: [
          {
            model: ProcessDefinition,
            as: 'processDefinition',
          },
          {
            model: User,
            as: 'startedByUser',
          },
        ],
      },
      {
        model: ProcessElement,
        as: 'processElement',
      },
    ],
    order: [['createdAt', 'desc']],
  });

  const formattedTasks = taskInstances.map((task) => ({
    taskId: task.id,
    taskName: task.processElement?.name ?? 'Unnamed Task',
    processInstanceId: task.processInstanceId,
    processDescription: task.processInstance?.description,
    processVersion: task.processInstance?.processDefinition?.version,
    processName: task.processInstance?.processDefinition?.name ?? 'Unknown Process',
    processStartedBy: task.processInstance?.startedByUser?.fullName ?? 'Unknown User',
    createdAt: task.createdAt,
    dueDate: task.dueDate,
  }));

  return formattedTasks;
};

export const getTaskForm = async (taskId: string): Promise<TaskFormDefinition> => {
  const taskInstance = await TaskInstance.findByPk(parseInt(taskId, 10), {
    include: [
      {
        model: ProcessElement,
        as: 'processElement',
        include: [
          {
            model: ElementFormLink,
            as: 'elementFormLinks',
            include: [
              {
                model: FieldDefinition,
                as: 'fieldDefinition',
              },
            ],
          },
        ],
      },
      {
        model: ProcessInstance,
        as: 'processInstance',
      },
    ],
    order: [
      [
        { model: ProcessElement, as: 'processElement' },
        { model: ElementFormLink, as: 'elementFormLinks' },
        'displayOrder',
        'ASC',
      ],
    ],
  });

  if (!taskInstance) {
    throw new Error('Task not found');
  }

  const businessData = taskInstance.processInstance?.businessData ?? {};

  // Los includes de arriba garantizan processElement y elementFormLinks; si faltaran,
  // el JS original lanzaba un TypeError (500) y aquí ocurre igual.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const processElement = taskInstance.processElement!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const formFields = processElement.elementFormLinks!.map((link) => {
    // El include anidado garantiza fieldDefinition (FK obligatoria); mismo fallo que el JS si faltara.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fieldDefinition = link.fieldDefinition!;
    return {
      name: fieldDefinition.name,
      label: fieldDefinition.label,
      fieldType: fieldDefinition.fieldType,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `||` del JS: valores falsy (0, '', false) deben dar null
      value: businessData[fieldDefinition.name] || null,
      validations: {
        ...(fieldDefinition.validations ?? {}),
        isRequired: link.isRequired,
        isReadonly: link.isReadonly,
        ...(link.contextualValidations ?? {}),
      },
    };
  });

  // `actions` no es un atributo del modelo ProcessElement (nunca se carga), por lo que
  // hoy siempre resulta `['complete']`. Se lee por Reflect.get para conservar el `||` del JS.
  // El `as` es seguro: el valor es `undefined` o, a lo sumo, un arreglo de strings.
  const actions = Reflect.get(processElement, 'actions') as string[] | undefined;

  const formDefinition = {
    taskName: processElement.name ?? null,
    fields: formFields,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- se conserva el `||` del JS
    actions: actions || ['complete'],
  };

  return formDefinition;
};
