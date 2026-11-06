import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { FieldDefinition } from './field-definition.model';
import type { ProcessInstance } from './process-instance.model';
import type { TaskInstance } from './task-instance.model';
import type { User } from './user.model';

export class DocumentInstance extends Model<
  InferAttributes<DocumentInstance>,
  InferCreationAttributes<DocumentInstance>
> {
  declare id: CreationOptional<number>;
  declare processInstanceId: number;
  declare taskInstanceId: CreationOptional<number | null>;
  declare fieldDefId: number;
  declare storageKey: string;
  declare fileName: string;
  declare version: CreationOptional<number | null>;
  declare status: CreationOptional<string | null>;
  declare uploadedByUserId: number;
  declare createdAt: CreationOptional<Date>;

  declare processInstance?: NonAttribute<ProcessInstance>;
  declare fieldDefinition?: NonAttribute<FieldDefinition>;
  declare uploadedByUser?: NonAttribute<User>;
  declare taskInstance?: NonAttribute<TaskInstance>;
}

DocumentInstance.init(
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
    taskInstanceId: {
      type: DataTypes.INTEGER,
      field: 'task_instance_id',
    },
    fieldDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'field_def_id',
    },
    storageKey: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
      field: 'storage_key',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'ACTIVE',
    },
    uploadedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'uploaded_by_user_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    modelName: 'DocumentInstance',
    tableName: 'document_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['process_instance_id'],
      },
    ],
  },
);
