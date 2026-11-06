import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { ProcessDefinitionStatus } from '../domain/constants';
import type { ProcessElement } from './process-element.model';
import type { ProcessSequence } from './process-sequence.model';
import type { ProcessInstance } from './process-instance.model';

export class ProcessDefinition extends Model<
  InferAttributes<ProcessDefinition>,
  InferCreationAttributes<ProcessDefinition>
> {
  declare id: CreationOptional<number>;
  declare businessProcessKey: string;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare version: number;
  declare category: CreationOptional<string | null>;
  declare status: CreationOptional<ProcessDefinitionStatus>;
  declare bpmnProcessId: string;
  declare createdAt: CreationOptional<Date>;
  declare bpmnXml: CreationOptional<string | null>;

  // Asociaciones (se pueblan solo con include)
  declare processElements?: NonAttribute<ProcessElement[]>;
  declare processSequences?: NonAttribute<ProcessSequence[]>;
  declare processInstances?: NonAttribute<ProcessInstance[]>;
}

ProcessDefinition.init(
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
    sequelize,
    modelName: 'ProcessDefinition',
    tableName: 'process_definitions',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['business_process_key', 'version'],
      },
    ],
  },
);
