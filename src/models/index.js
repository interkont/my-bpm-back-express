const sequelize = require('../config/database');
const Role = require('./role.model');
const User = require('./user.model');
const ProcessDefinition = require('./process-definition.model');
const ProcessElement = require('./process-element.model');
const ProcessSequence = require('./process-sequence.model');
const FieldDefinition = require('./field-definition.model');
const ElementFormLink = require('./element-form-link.model');
const ProcessInstance = require('./process-instance.model');
const TaskInstance = require('./task-instance.model');
const DocumentInstance = require('./document-instance.model');
const CaseAssignment = require('./case-assignment.model');

// --- Relaciones con onDelete: CASCADE ---

// Cuando se elimina una ProcessDefinition, se eliminan sus elementos y secuencias.
ProcessDefinition.hasMany(ProcessElement, { foreignKey: 'processDefId', as: 'processElements' });
ProcessElement.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition', onDelete: 'CASCADE' });

ProcessDefinition.hasMany(ProcessSequence, { foreignKey: 'processDefId', as: 'processSequences' });
ProcessSequence.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition', onDelete: 'CASCADE' });

// Cuando se elimina un ProcessElement, se eliminan sus ElementFormLinks.
ProcessElement.hasMany(ElementFormLink, { foreignKey: 'elementId', as: 'elementFormLinks' });
ElementFormLink.belongsTo(ProcessElement, { foreignKey: 'elementId', as: 'processElement', onDelete: 'CASCADE' });

// Cuando se elimina una ProcessInstance, se eliminan sus tareas, documentos y asignaciones.
ProcessInstance.hasMany(TaskInstance, { foreignKey: 'processInstanceId', as: 'taskInstances' });
TaskInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });

ProcessInstance.hasMany(DocumentInstance, { foreignKey: 'processInstanceId', as: 'documentInstances' });
DocumentInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });

ProcessInstance.hasMany(CaseAssignment, { foreignKey: 'processInstanceId', as: 'caseAssignments' });
CaseAssignment.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });


// --- Otras Relaciones ---

// User <-> Role
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// ProcessDefinition <-> ProcessInstance (Ya definido arriba, sin cascada aquí)
ProcessDefinition.hasMany(ProcessInstance, { foreignKey: 'processDefId', as: 'processInstances' });
ProcessInstance.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition' });

// ProcessElement <-> TaskInstance
ProcessElement.hasMany(TaskInstance, { foreignKey: 'elementDefId', as: 'taskInstances' });
TaskInstance.belongsTo(ProcessElement, { foreignKey: 'elementDefId', as: 'processElement' });

// FieldDefinition <-> ElementFormLink & DocumentInstance
FieldDefinition.hasMany(ElementFormLink, { foreignKey: 'fieldDefId', as: 'elementFormLinks' });
ElementFormLink.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

FieldDefinition.hasMany(DocumentInstance, { foreignKey: 'fieldDefId', as: 'documentInstances' });
DocumentInstance.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

// Relaciones de User
User.hasMany(ProcessInstance, { foreignKey: 'startedByUserId', as: 'startedProcessInstances' });
ProcessInstance.belongsTo(User, { foreignKey: 'startedByUserId', as: 'startedByUser' });

User.hasMany(TaskInstance, { foreignKey: 'completedByUserId', as: 'completedTasks' });
TaskInstance.belongsTo(User, { foreignKey: 'completedByUserId', as: 'completedByUser' });

User.hasMany(TaskInstance, { foreignKey: 'assignedToUserId', as: 'assignedTasks' });
TaskInstance.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedUser' });

User.hasMany(DocumentInstance, { foreignKey: 'uploadedByUserId', as: 'uploadedDocuments' });
DocumentInstance.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedByUser' });

User.hasMany(CaseAssignment, { foreignKey: 'assignedUserId', as: 'caseAssignments' });
CaseAssignment.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

// Relaciones de Role
Role.hasMany(ProcessElement, { foreignKey: 'assignedRoleId', as: 'processElements' });
ProcessElement.belongsTo(Role, { foreignKey: 'assignedRoleId', as: 'assignedRole' });

Role.hasMany(TaskInstance, { foreignKey: 'assignedToRoleId', as: 'taskInstances' });
TaskInstance.belongsTo(Role, { foreignKey: 'assignedToRoleId', as: 'assignedRole' });

Role.hasMany(CaseAssignment, { foreignKey: 'roleId', as: 'caseAssignments' }); // Corregido: hasmany -> hasMany
CaseAssignment.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// TaskInstance -> DocumentInstance
TaskInstance.hasMany(DocumentInstance, { foreignKey: 'taskInstanceId', as: 'documentInstances' });
DocumentInstance.belongsTo(TaskInstance, { foreignKey: 'taskInstanceId', as: 'taskInstance' });


const db = {
  sequelize,
  Role,
  User,
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  FieldDefinition,
  ElementFormLink,
  ProcessInstance,
  TaskInstance,
  DocumentInstance,
  CaseAssignment,
};

module.exports = db;
