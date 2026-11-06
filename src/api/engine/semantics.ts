// Semántica por tipo de nodo (data-model §6.3). Puro: describe qué hace cada cáscara, no lo aplica.
import type { ElementType } from '../../domain/constants';
import type { ElementNode } from './graph';

export type ExecutionBehavior =
  | { kind: 'FOLLOW_ALL' }
  | { kind: 'EXCLUSIVE' }
  | { kind: 'CREATE_TASK' }
  | { kind: 'COMPLETE_INSTANCE' }
  | { kind: 'UNSUPPORTED' };

export type DecisionBehavior = { kind: 'FOLLOW_ALL' } | { kind: 'EXCLUSIVE' } | { kind: 'BLOCK' };

export interface NodeSemantics {
  execution: ExecutionBehavior;
  decision: DecisionBehavior;
}

// Efectos que el núcleo pide a la cáscara de ejecución, aplicados en orden dentro de la transacción.
export type EngineEffect =
  { kind: 'CREATE_TASK'; element: ElementNode } | { kind: 'COMPLETE_INSTANCE' };

// `satisfies`: añadir un `ElementType` sin fila deja de compilar.
export const NODE_SEMANTICS = {
  START_EVENT: { execution: { kind: 'FOLLOW_ALL' }, decision: { kind: 'FOLLOW_ALL' } },
  PARALLEL_GATEWAY: { execution: { kind: 'FOLLOW_ALL' }, decision: { kind: 'FOLLOW_ALL' } },
  EXCLUSIVE_GATEWAY: { execution: { kind: 'EXCLUSIVE' }, decision: { kind: 'EXCLUSIVE' } },
  USER_TASK: { execution: { kind: 'CREATE_TASK' }, decision: { kind: 'BLOCK' } },
  END_EVENT: { execution: { kind: 'COMPLETE_INSTANCE' }, decision: { kind: 'BLOCK' } },
  // Diferencia vigente (FR-007): no soportado al ejecutar, bloqueante al decidir.
  AUTO_TASK: { execution: { kind: 'UNSUPPORTED' }, decision: { kind: 'BLOCK' } },
} satisfies Record<ElementType, NodeSemantics>;
