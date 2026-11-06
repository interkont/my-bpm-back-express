import type { JsonValue } from '../../domain/types';
import type { DecisionLog, User } from '../../models';
import type { ElementNode } from './graph';

export type NextTaskDto = {
  bpmnElementId: string;
  name: string | null;
  type: string;
  assignedRoleId: number | null;
};

// Forma plana de un registro de decisión con su usuario (atributos pedidos por el servicio).
export type DecisionLogPlain = Pick<
  DecisionLog,
  | 'id'
  | 'businessProcessKey'
  | 'currentBpmnElementId'
  | 'requestPayload'
  | 'responsePayload'
  | 'errorMessage'
  | 'executedByUserId'
  | 'createdAt'
> & { executedByUser?: Pick<User, 'id' | 'fullName' | 'email'> };

export interface DecisionLogDto {
  id: number;
  businessProcessKey: string;
  currentBpmnElementId: string;
  requestPayload: JsonValue;
  responsePayload: JsonValue | null | undefined;
  errorMessage: string | null | undefined;
  executedByUserId: number;
  createdAt: Date;
  executedByUser?: { id: number; fullName: string; email: string };
}

export const toNextTask = (
  element: Pick<ElementNode, 'bpmnElementId' | 'name' | 'type' | 'assignedRoleId'>,
): NextTaskDto => ({
  bpmnElementId: element.bpmnElementId,
  name: element.name,
  type: element.type,
  assignedRoleId: element.assignedRoleId,
});

// Proyección pública de un registro de decisión: del usuario expone `id`, `fullName` y `email` (FR-026).
export const toDecisionLog = (log: DecisionLogPlain): DecisionLogDto => ({
  id: log.id,
  businessProcessKey: log.businessProcessKey,
  currentBpmnElementId: log.currentBpmnElementId,
  requestPayload: log.requestPayload,
  responsePayload: log.responsePayload,
  errorMessage: log.errorMessage,
  executedByUserId: log.executedByUserId,
  createdAt: log.createdAt,
  ...(log.executedByUser && {
    executedByUser: {
      id: log.executedByUser.id,
      fullName: log.executedByUser.fullName,
      email: log.executedByUser.email,
    },
  }),
});
