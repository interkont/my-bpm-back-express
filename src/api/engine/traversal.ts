import { modelError } from '../../domain/errors';
import type { ElementNode, ProcessGraph, SequenceEdge } from './graph';

/**
 * Detección de ciclos por camino (research R-10): se lleva el conjunto de ancestros de la
 * recursión actual. Revisitar un nodo del camino es un ciclo sin elementos bloqueantes (los
 * bloqueantes detienen la recursión). Los diamantes (dos ramas que llegan al mismo nodo) no son
 * ciclos y se procesan como hoy.
 */
export type TraversalPath = readonly string[];

export const enterNode = (path: TraversalPath, node: ElementNode): TraversalPath => {
  if (path.includes(node.bpmnElementId)) {
    throw modelError(
      `Process modelling error: cycle without blocking elements at ${node.bpmnElementId}.`,
    );
  }
  return [...path, node.bpmnElementId];
};

/** Destino de una arista; si no existe en el grafo es un error de modelado que nombra la secuencia. */
export const resolveTarget = (graph: ProcessGraph, edge: SequenceEdge): ElementNode => {
  const target = graph.elements.get(edge.target);
  if (!target) {
    throw modelError(
      `Process modelling error: sequence ${edge.source} → ${edge.target} points to a missing element.`,
    );
  }
  return target;
};
