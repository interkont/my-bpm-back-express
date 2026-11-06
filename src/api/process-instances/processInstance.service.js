const {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
  Role,
  FieldDefinition,
} = require('../../models');
const { Op } = require('sequelize');
const { enrichFieldValue } = require('../../utils/formUtils'); // Importar función centralizada

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

const getProcessInstanceById = async (id) => {
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

  const businessData = instance.businessData || {};
  const businessDataKeys = Object.keys(businessData);

  if (businessDataKeys.length === 0) {
    instance.dataValues.businessDataFields = [];
    return instance;
  }

  const fieldDefs = await FieldDefinition.findAll({
    where: {
      name: {
        [Op.in]: businessDataKeys,
      },
    },
    // Traemos todos los atributos porque 'enrichFieldValue' los necesita
  });

  const fieldDefsMap = fieldDefs.reduce((acc, field) => {
    acc[field.name] = field.toJSON(); // Usamos toJSON para obtener un objeto plano
    return acc;
  }, {});

  const businessDataFields = businessDataKeys.map(key => {
    const fieldDef = fieldDefsMap[key];
    const rawValue = businessData[key];

    // Si no encontramos una definición, devolvemos los datos en crudo.
    if (!fieldDef) {
        return {
            name: key,
            label: key,
            fieldType: 'UNKNOWN',
            value: rawValue,
        };
    }

    // Aquí sucede la magia: usamos la misma función de enriquecimiento.
    const enriched = enrichFieldValue(fieldDef, rawValue);
    
    return {
      name: key,
      label: fieldDef.label,
      fieldType: fieldDef.fieldType,
      value: enriched.value,
      // Añadimos las validaciones para que el frontend pueda interpretar los datos (ej. las columnas del grid)
      validations: enriched.validations,
    };
  });

  instance.dataValues.businessDataFields = businessDataFields;
  
  return instance;
};

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
