import { Op, type CreationAttributes, type InferAttributes } from 'sequelize';
import {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
  Role,
  FieldDefinition,
} from '../../models';

export type ProcessInstanceCreateInput = CreationAttributes<ProcessInstance>;
export type ProcessInstanceUpdateInput = Partial<InferAttributes<ProcessInstance>>;

export const createProcessInstanceRecord = async (
  data: ProcessInstanceCreateInput,
): Promise<ProcessInstance> => {
  return ProcessInstance.create(data);
};

const processDefinitionAttributes = [
  'id',
  'businessProcessKey',
  'name',
  'description',
  'version',
  'category',
  'status',
  'bpmnProcessId',
];

export const getAllProcessInstances = async (): Promise<ProcessInstance[]> => {
  return ProcessInstance.findAll({
    order: [['startTime', 'desc']],
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: ['id', 'fullName', 'email'],
      },
    ],
  });
};

/**
 * Obtiene una instancia de proceso por su ID, enriqueciendo los datos de negocio.
 */
export const getProcessInstanceById = async (id: string): Promise<ProcessInstance | null> => {
  // Paso 1: Obtener la instancia de proceso con todas sus relaciones.
  const instance = await ProcessInstance.findByPk(parseInt(id, 10), {
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: ['id', 'fullName', 'email'],
      },
      {
        model: TaskInstance,
        as: 'taskInstances',
        order: [['createdAt', 'ASC']],
        include: [
          { model: ProcessElement, as: 'processElement', attributes: ['name', 'bpmnElementId'] },
          { model: Role, as: 'assignedRole', attributes: ['name'] },
          { model: User, as: 'assignedUser', attributes: ['fullName'] },
          { model: User, as: 'completedByUser', attributes: ['fullName'] },
        ],
      },
    ],
  });

  if (!instance) {
    return null;
  }

  // `||` (no `??`) conserva el comportamiento original ante valores falsy.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const businessData = instance.businessData || {};
  const businessDataKeys = Object.keys(businessData);

  // Paso 2: Si no hay datos de negocio, no hacemos nada extra.
  if (businessDataKeys.length === 0) {
    // Se asigna sobre dataValues (igual que antes) para que toJSON incluya el campo.
    Object.assign(instance.dataValues, { businessDataFields: [] });
    return instance;
  }

  // Paso 3: Consultar la "biblioteca" de campos para obtener los metadatos.
  const fieldDefs = await FieldDefinition.findAll({
    where: {
      name: {
        [Op.in]: businessDataKeys,
      },
    },
    attributes: ['name', 'label', 'fieldType'],
  });

  // Mapear las definiciones a un objeto para una búsqueda rápida.
  const fieldDefsMap = fieldDefs.reduce<Record<string, FieldDefinition | undefined>>(
    (acc, field) => {
      acc[field.name] = field;
      return acc;
    },
    {},
  );

  // Paso 4: Construir el nuevo array 'businessDataFields'.
  const businessDataFields = businessDataKeys.map((key) => {
    const fieldDef = fieldDefsMap[key];
    return {
      name: key,
      // `||` (no `??`) conserva el comportamiento original ante cadenas vacías.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      label: fieldDef?.label || key, // Usar la clave como fallback si no hay definición
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      fieldType: fieldDef?.fieldType || 'UNKNOWN',
      value: businessData[key],
    };
  });

  // Añadimos el nuevo array a la instancia antes de devolverla.
  Object.assign(instance.dataValues, { businessDataFields });

  return instance;
};

export const updateProcessInstance = async (
  id: string,
  data: ProcessInstanceUpdateInput,
): Promise<[affectedCount: number]> => {
  return ProcessInstance.update(data, {
    where: { id: parseInt(id, 10) },
  });
};

export const deleteProcessInstance = async (id: string): Promise<number> => {
  return ProcessInstance.destroy({ where: { id: parseInt(id, 10) } });
};
