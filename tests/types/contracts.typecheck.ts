/**
 * Pruebas de tipos negativas (US2, T049). No se ejecutan: las verifica `npm run typecheck`.
 * Cada `@ts-expect-error` documenta un error que el compilador DEBE seguir detectando; si un cambio
 * lo deja de detectar, la directiva queda sin uso y `tsc` falla.
 */
import type { ElementType, ProcessDefinitionStatus } from '../../src/domain/constants';
import type { NodeSemantics } from '../../src/api/engine/semantics';
import type { User } from '../../src/models/user.model';
import type { InboxItemDto } from '../../src/api/tasks/task.mappers';
import { attrs } from '../../src/utils/pick';

// US2-1: un estado mal escrito no compila.
// @ts-expect-error 'ACTIV' no pertenece a ProcessDefinitionStatus
export const badStatus: ProcessDefinitionStatus = 'ACTIV';

// US2-2: una tabla de semántica sin la fila de un tipo de nodo no compila.
const FOLLOW: NodeSemantics = {
  execution: { kind: 'FOLLOW_ALL' },
  decision: { kind: 'FOLLOW_ALL' },
};
export const incompleteSemantics = {
  START_EVENT: FOLLOW,
  USER_TASK: FOLLOW,
  EXCLUSIVE_GATEWAY: FOLLOW,
  PARALLEL_GATEWAY: FOLLOW,
  END_EVENT: FOLLOW,
  // falta AUTO_TASK
  // @ts-expect-error falta la fila AUTO_TASK en Record<ElementType, NodeSemantics>
} satisfies Record<ElementType, NodeSemantics>;

// US2-3: pedir un atributo inexistente en una proyección no compila (el defecto de decision-logs).
// @ts-expect-error 'username' no es un atributo de User
export const badAttributes = attrs<User>()('id', 'username');

// US2-4: un DTO de respuesta sin un campo del contrato no compila.
// @ts-expect-error falta taskName en InboxItemDto
export const incompleteInboxItem: InboxItemDto = {
  taskId: 1,
  processInstanceId: 1,
  processDescription: null,
  processVersion: 1,
  processName: 'p',
  processStartedBy: 'u',
  createdAt: new Date(0),
  dueDate: null,
};
