const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DecisionLog = sequelize.define(
  'DecisionLog',
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
    currentBpmnElementId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'current_bpmn_element_id',
    },
    requestPayload: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'request_payload',
    },
    responsePayload: {
      type: DataTypes.JSONB,
      field: 'response_payload',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message',
    },
    executedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'executed_by_user_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'decision_logs',
    timestamps: false,
  }
);

module.exports = DecisionLog;
