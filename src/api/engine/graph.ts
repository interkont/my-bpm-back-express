// Grafo puro del proceso (data-model §6.1). Sin `models` ni `sequelize`: recibe filas planas.
import type { ElementType } from '../../domain/constants';

export interface ElementNode {
  id: number;
  bpmnElementId: string;
  name: string | null;
  type: ElementType;
  assignedRoleId: number | null;
}

export interface SequenceEdge {
  id: number;
  source: string;
  target: string;
  condition: string | null;
}

export interface ProcessGraph {
  elements: ReadonlyMap<string, ElementNode>;
  outgoing: ReadonlyMap<string, readonly SequenceEdge[]>;
  incoming: ReadonlyMap<string, readonly SequenceEdge[]>;
}

// Forma mínima de una fila de `ProcessElement` (estructural: acepta modelos o literales).
export interface ElementRow {
  id: number;
  bpmnElementId: string;
  name: string | null;
  type: ElementType;
  assignedRoleId: number | null;
}

// Forma mínima de una fila de `ProcessSequence`.
export interface SequenceRow {
  id: number;
  sourceElementBpmnId: string;
  targetElementBpmnId: string;
  conditionExpression?: string | null;
}

const pushTo = (map: Map<string, SequenceEdge[]>, key: string, edge: SequenceEdge): void => {
  const list = map.get(key);
  if (list) list.push(edge);
  else map.set(key, [edge]);
};

/**
 * Construye el grafo. Las aristas se ordenan por `id` de secuencia ASC (R-09), que reproduce el
 * orden de inserción que hoy devuelve la base sin ORDER BY. Una arista cuyo destino no está en
 * `elements` se conserva: el error se reporta solo al recorrerla.
 */
export const buildGraph = (
  elements: readonly ElementRow[],
  sequences: readonly SequenceRow[],
): ProcessGraph => {
  const elementMap = new Map<string, ElementNode>();
  for (const row of elements) {
    elementMap.set(row.bpmnElementId, {
      id: row.id,
      bpmnElementId: row.bpmnElementId,
      name: row.name,
      type: row.type,
      assignedRoleId: row.assignedRoleId,
    });
  }

  const outgoing = new Map<string, SequenceEdge[]>();
  const incoming = new Map<string, SequenceEdge[]>();
  const sorted = [...sequences].sort((a, b) => a.id - b.id);
  for (const row of sorted) {
    const edge: SequenceEdge = {
      id: row.id,
      source: row.sourceElementBpmnId,
      target: row.targetElementBpmnId,
      condition: row.conditionExpression ?? null,
    };
    pushTo(outgoing, edge.source, edge);
    pushTo(incoming, edge.target, edge);
  }

  return { elements: elementMap, outgoing, incoming };
};

// Aristas de salida de un elemento; `[]` si no tiene.
export const outgoingOf = (graph: ProcessGraph, bpmnElementId: string): readonly SequenceEdge[] =>
  graph.outgoing.get(bpmnElementId) ?? [];
