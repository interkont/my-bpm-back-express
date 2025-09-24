const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcessElement = sequelize.define(
  'ProcessElement',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    processDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'process_def_id',
    },
    bpmnElementId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'bpmn_element_id',
    },
    name: {
      type: DataTypes.STRING(255),
    },
    description: {
      type: DataTypes.TEXT,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    assignedRoleId: {
      type: DataTypes.INTEGER,
      field: 'assigned_role_id',
    },
    webhookTarget: {
      type: DataTypes.TEXT,
      field: 'webhook_target',
    },
    slaDefinition: {
      type: DataTypes.JSONB,
      field: 'sla_definition',
    },
  },
  {
    tableName: 'process_elements',
    timestamps: false,
  }
);

module.exports = ProcessElement;
