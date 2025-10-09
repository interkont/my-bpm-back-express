const {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
  Role,
  FieldDefinition, // <-- Añadido el modelo FieldDefinition
} = require('../../models');
const { Op } = require('sequelize'); // Añadido para la nueva consulta

// ... (createProcessInstanceRecord y getAllProcessInstances sin cambios)
const createProcessInstanceRecord = async (data) => {
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
const getAllProcessInstances = async () => {
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
 * --- MODIFICADO ---
 */
const getProcessInstanceById = async (id) => {
  // Paso 1: Obtener la instancia de proceso con todas sus relaciones, como antes.
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

  // --- INICIO DE LA LÓGICA DE ENRIQUECIMIENTO ---
  
  const businessData = instance.businessData || {};
  const businessDataKeys = Object.keys(businessData);

  // Paso 2: Si no hay datos de negocio, no hacemos nada extra.
  if (businessDataKeys.length === 0) {
    instance.dataValues.businessDataFields = [];
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
  const fieldDefsMap = fieldDefs.reduce((acc, field) => {
    acc[field.name] = field;
    return acc;
  }, {});

  // Paso 4: Construir el nuevo array 'businessDataFields'.
  const businessDataFields = businessDataKeys.map(key => {
    const fieldDef = fieldDefsMap[key];
    return {
      name: key,
      label: fieldDef?.label || key, // Usar la clave como fallback si no hay definición
      fieldType: fieldDef?.fieldType || 'UNKNOWN',
      value: businessData[key],
    };
  });

  // Añadimos el nuevo array a la instancia antes de devolverla.
  instance.dataValues.businessDataFields = businessDataFields;
  
  // --- FIN DE LA LÓGICA DE ENRIQUECIMIENTO ---

  return instance;
};

// ... (updateProcessInstance y deleteProcessInstance sin cambios)
const updateProcessInstance = async (id, data) => {
    return ProcessInstance.update(data, {
      where: { id: parseInt(id, 10) },
    });
};
const deleteProcessInstance = async (id) => {
    return ProcessInstance.destroy({ where: { id: parseInt(id, 10) } });
};
  
module.exports = {
  createProcessInstanceRecord,
  getAllProcessInstances,
  getProcessInstanceById,
  updateProcessInstance,
  deleteProcessInstance,
};
