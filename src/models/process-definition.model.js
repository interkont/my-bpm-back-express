const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcessDefinition = sequelize.define(
  'ProcessDefinition',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    businessProcessKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'business_process_key',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    bpmnProcessId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'bpmn_process_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    bpmnXml: {
      type: DataTypes.TEXT,
      field: 'bpmn_xml',
    },
  },
  {
    tableName: 'process_definitions',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['business_process_key', 'version'],
      },
    ],
  }
);

module.exports = ProcessDefinition;
