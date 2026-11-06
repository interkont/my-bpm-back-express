import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { ProcessDefinition } from './process-definition.model';

export class ProcessSequence extends Model<
  InferAttributes<ProcessSequence>,
  InferCreationAttributes<ProcessSequence>
> {
  declare id: CreationOptional<number>;
  declare processDefId: number;
  declare sourceElementBpmnId: string;
  declare targetElementBpmnId: string;
  declare conditionExpression: CreationOptional<string | null>;

  // Asociaciones (se pueblan solo con include)
  declare processDefinition?: NonAttribute<ProcessDefinition>;
}

ProcessSequence.init(
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
    sequelize,
    modelName: 'ProcessSequence',
    tableName: 'process_sequences',
    timestamps: false,
  },
);
