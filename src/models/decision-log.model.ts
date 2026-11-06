import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { JsonValue } from '../domain/types';
import type { User } from './user.model';

export class DecisionLog extends Model<
  InferAttributes<DecisionLog>,
  InferCreationAttributes<DecisionLog>
> {
  declare id: CreationOptional<number>;
  declare businessProcessKey: string;
  declare currentBpmnElementId: string;
  declare requestPayload: JsonValue;
  declare responsePayload: CreationOptional<JsonValue | null>;
  declare errorMessage: CreationOptional<string | null>;
  declare executedByUserId: number;
  declare createdAt: CreationOptional<Date>;

  declare executedByUser?: NonAttribute<User>;
}

DecisionLog.init(
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
    sequelize,
    modelName: 'DecisionLog',
    tableName: 'decision_logs',
    timestamps: false,
  },
);
