const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcessSequence = sequelize.define(
  'ProcessSequence',
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
    sourceElementBpmnId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'source_element_bpmn_id',
    },
    targetElementBpmnId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'target_element_bpmn_id',
    },
    conditionExpression: {
      type: DataTypes.TEXT,
      field: 'condition_expression',
    },
  },
  {
    tableName: 'process_sequences',
    timestamps: false,
  }
);

module.exports = ProcessSequence;
