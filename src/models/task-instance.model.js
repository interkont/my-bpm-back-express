const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskInstance = sequelize.define(
  'TaskInstance',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    processInstanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'process_instance_id',
    },
    elementDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'element_def_id',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    comments: {
      type: DataTypes.TEXT,
    },
    assignedToRoleId: {
      type: DataTypes.INTEGER,
      field: 'assigned_to_role_id',
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      field: 'assigned_to_user_id',
    },
    dueDate: {
      type: DataTypes.DATE,
      field: 'due_date',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    completedByUserId: {
      type: DataTypes.INTEGER,
      field: 'completed_by_user_id',
    },
    completionTime: {
      type: DataTypes.DATE,
      field: 'completion_time',
    },
    completionPayload: {
      type: DataTypes.JSONB,
      field: 'completion_payload',
    },
  },
  {
    tableName: 'task_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['assigned_to_role_id'],
      },
      {
        fields: ['assigned_to_user_id'],
      },
    ],
  }
);

module.exports = TaskInstance;
