const sequelize = require('../config/database');
const Role = require('./role.model');
const User = require('./user.model');
const UserRole = require('./userRole.model');
const ProcessDefinition = require('./process-definition.model');
const ProcessElement = require('./process-element.model');
const ProcessSequence = require('./process-sequence.model');
const FieldDefinition = require('./field-definition.model');
const ElementFormLink = require('./element-form-link.model');
const ProcessInstance = require('./process-instance.model');
const TaskInstance = require('./task-instance.model');
const DocumentInstance = require('./document-instance.model');
const CaseAssignment = require('./case-assignment.model');
const DecisionLog = require('./decision-log.model');
const SystemRoleModule = require('./system-role-module.model'); // Importar nuevo modelo

// Definición de relaciones
ProcessDefinition.hasMany(ProcessElement, { foreignKey: 'processDefId', as: 'processElements', onDelete: 'CASCADE' });
ProcessElement.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition', onDelete: 'CASCADE' });

ProcessDefinition.hasMany(ProcessSequence, { foreignKey: 'processDefId', as: 'processSequences', onDelete: 'CASCADE' });
ProcessSequence.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition', onDelete: 'CASCADE' });

ProcessElement.hasMany(ElementFormLink, { foreignKey: 'elementId', as: 'elementFormLinks', onDelete: 'CASCADE' });
ElementFormLink.belongsTo(ProcessElement, { foreignKey: 'elementId', as: 'processElement', onDelete: 'CASCADE' });

ProcessInstance.hasMany(TaskInstance, { foreignKey: 'processInstanceId', as: 'taskInstances', onDelete: 'CASCADE' });
TaskInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });

ProcessInstance.hasMany(DocumentInstance, { foreignKey: 'processInstanceId', as: 'documentInstances', onDelete: 'CASCADE' });
DocumentInstance.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });

ProcessInstance.hasMany(CaseAssignment, { foreignKey: 'processInstanceId', as: 'caseAssignments', onDelete: 'CASCADE' });
CaseAssignment.belongsTo(ProcessInstance, { foreignKey: 'processInstanceId', as: 'processInstance', onDelete: 'CASCADE' });

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles'
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users'
});

ProcessDefinition.hasMany(ProcessInstance, { foreignKey: 'processDefId', as: 'processInstances' });
ProcessInstance.belongsTo(ProcessDefinition, { foreignKey: 'processDefId', as: 'processDefinition' });

ProcessElement.hasMany(TaskInstance, { foreignKey: 'elementDefId', as: 'taskInstances' });
TaskInstance.belongsTo(ProcessElement, { foreignKey: 'elementDefId', as: 'processElement' });

FieldDefinition.hasMany(ElementFormLink, { foreignKey: 'fieldDefId', as: 'elementFormLinks' });
ElementFormLink.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

FieldDefinition.hasMany(DocumentInstance, { foreignKey: 'fieldDefId', as: 'documentInstances' });
DocumentInstance.belongsTo(FieldDefinition, { foreignKey: 'fieldDefId', as: 'fieldDefinition' });

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

// Relación para DecisionLog
User.hasMany(DecisionLog, { foreignKey: 'executedByUserId', as: 'decisionLogs' });
DecisionLog.belongsTo(User, { foreignKey: 'executedByUserId', as: 'executedByUser' });

Role.hasMany(ProcessElement, { foreignKey: 'assignedRoleId', as: 'processElements' });
ProcessElement.belongsTo(Role, { foreignKey: 'assignedRoleId', as: 'assignedRole' });

Role.hasMany(TaskInstance, { foreignKey: 'assignedToRoleId', as: 'taskInstances' });
TaskInstance.belongsTo(Role, { foreignKey: 'assignedToRoleId', as: 'assignedRole' });

Role.hasMany(CaseAssignment, { foreignKey: 'roleId', as: 'caseAssignments' });
CaseAssignment.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

TaskInstance.hasMany(DocumentInstance, { foreignKey: 'taskInstanceId', as: 'documentInstances' });
DocumentInstance.belongsTo(TaskInstance, { foreignKey: 'taskInstanceId', as: 'taskInstance' });

const db = {
  sequelize,
  Role,
  User,
  UserRole,
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  FieldDefinition,
  ElementFormLink,
  ProcessInstance,
  TaskInstance,
  DocumentInstance,
  CaseAssignment,
  DecisionLog,
  SystemRoleModule, // Exportar nuevo modelo
};

module.exports = db;
