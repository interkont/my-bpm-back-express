const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcessInstance = sequelize.define(
  'ProcessInstance',
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
    description: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    businessData: {
      type: DataTypes.JSONB,
      field: 'business_data',
    },
    startedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'started_by_user_id',
    },
    startTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.DATE,
      field: 'end_time',
    },
  },
  {
    tableName: 'process_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['status'],
      },
    ],
  }
);

module.exports = ProcessInstance;
