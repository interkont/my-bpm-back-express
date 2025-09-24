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

// User <-> Role
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// ProcessDefinition -> ProcessElement, ProcessSequence, ProcessInstance
ProcessDefinition.hasMany(ProcessElement, { foreignKey: 'processDefId', as: 'processElements' });
ProcessElement.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition' });

ProcessDefinition.hasMany(ProcessSequence, { foreignKey: 'processDefId', as: 'processSequences' });
ProcessSequence.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition' });

ProcessDefinition.hasMany(ProcessInstance, { foreignKey: 'processDefId', as: 'processInstances' });
ProcessInstance.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition' });

// ProcessElement -> ElementFormLink, TaskInstance
ProcessElement.hasMany(ElementFormLink, { foreignKey: 'elementId', as: 'elementFormLinks' });
ElementFormLink.belongsTo(ProcessElement, { foreignKey: 'elementId', as: 'processElement' });

ProcessElement.hasMany(TaskInstance, { foreignKey: 'elementDefId', as: 'taskInstances' });
TaskInstance.belongsTo(ProcessElement, { foreignKey: 'elementDefId', as: 'processElement' });

// FieldDefinition -> ElementFormLink, DocumentInstance
FieldDefinition.hasMany(ElementFormLink, { foreignKey: 'fieldDefId', as: 'elementFormLinks' });
ElementFormLink.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

FieldDefinition.hasMany(DocumentInstance, { foreignKey: 'fieldDefId', as: 'documentInstances' });
DocumentInstance.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

// ProcessInstance -> TaskInstance, DocumentInstance, CaseAssignment
ProcessInstance.hasMany(TaskInstance, { foreignKey: 'processInstanceId', as: 'taskInstances' });
TaskInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance' });

ProcessInstance.hasMany(DocumentInstance, { foreignKey: 'processInstanceId', as: 'documentInstances' });
DocumentInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance' });

ProcessInstance.hasMany(CaseAssignment, { foreignKey: 'processInstanceId', as: 'caseAssignments' });
CaseAssignment.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance' });

// User relations
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

// Role relations
Role.hasMany(ProcessElement, { foreignKey: 'assignedRoleId', as: 'processElements' });
ProcessElement.belongsTo(Role, { foreignKey: 'assignedRoleId', as: 'assignedRole' });

Role.hasMany(TaskInstance, { foreignKey: 'assignedToRoleId', as: 'taskInstances' });
TaskInstance.belongsTo(Role, { foreignKey: 'assignedToRoleId', as: 'assignedRole' });

Role.hasMany(CaseAssignment, { foreignKey: 'roleId', as: 'caseAssignments' });
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
