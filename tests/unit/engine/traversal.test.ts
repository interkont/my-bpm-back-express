import { isAppError } from '../../../src/domain/errors';
import {
  buildGraph,
  outgoingOf,
  type ElementRow,
  type SequenceRow,
} from '../../../src/api/engine/graph';
import { enterNode, resolveTarget, type TraversalPath } from '../../../src/api/engine/traversal';

const el = (id: number, bpmnElementId: string, type: ElementRow['type']): ElementRow => ({
  id,
  bpmnElementId,
  name: bpmnElementId,
  type,
  assignedRoleId: null,
});
const seq = (id: number, source: string, target: string): SequenceRow => ({
  id,
  sourceElementBpmnId: source,
  targetElementBpmnId: target,
});

// Recorre como el motor de decisión: detecta ciclos por ancestros del camino actual.
const visit = (
  graph: ReturnType<typeof buildGraph>,
  id: string,
  path: TraversalPath,
  visits: string[],
): void => {
  const node = graph.elements.get(id);
  if (!node) throw new Error(`falta ${id}`);
  const next = enterNode(path, node);
  visits.push(id);
  for (const edge of outgoingOf(graph, id)) {
    visit(graph, resolveTarget(graph, edge).bpmnElementId, next, visits);
  }
};

const expectModelError = (fn: () => unknown, message: string): void => {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(isAppError(thrown)).toBe(true);
  if (!isAppError(thrown)) return;
  expect(thrown.statusCode).toBe(422);
  expect(thrown.code).toBe('PROCESS_MODEL_ERROR');
  expect(thrown.message).toBe(message);
};

describe('traversal', () => {
  it('DIAMOND no es un ciclo: el gateway compartido se visita dos veces (una por rama)', () => {
    const graph = buildGraph(
      [
        el(1, 'Start', 'START_EVENT'),
        el(2, 'Fork', 'PARALLEL_GATEWAY'),
        el(3, 'A', 'PARALLEL_GATEWAY'),
        el(4, 'B', 'PARALLEL_GATEWAY'),
        el(5, 'Gw', 'EXCLUSIVE_GATEWAY'),
        el(6, 'Task', 'USER_TASK'),
      ],
      [
        seq(1, 'Start', 'Fork'),
        seq(2, 'Fork', 'A'),
        seq(3, 'Fork', 'B'),
        seq(4, 'A', 'Gw'),
        seq(5, 'B', 'Gw'),
        seq(6, 'Gw', 'Task'),
      ],
    );
    const visits: string[] = [];
    expect(() => {
      visit(graph, 'Start', [], visits);
    }).not.toThrow();
    expect(visits.filter((id) => id === 'Gw')).toHaveLength(2);
  });

  it('GATEWAY_CYCLE se detecta y nombra el elemento revisitado', () => {
    const graph = buildGraph(
      [
        el(1, 'Start', 'START_EVENT'),
        el(2, 'GwA', 'EXCLUSIVE_GATEWAY'),
        el(3, 'GwB', 'EXCLUSIVE_GATEWAY'),
      ],
      [seq(1, 'Start', 'GwA'), seq(2, 'GwA', 'GwB'), seq(3, 'GwB', 'GwA')],
    );
    expectModelError(() => {
      visit(graph, 'Start', [], []);
    }, 'Process modelling error: cycle without blocking elements at GwA.');
  });

  it('enterNode agrega el nodo al camino sin mutar el anterior', () => {
    const graph = buildGraph([el(1, 'S', 'START_EVENT')], []);
    const node = graph.elements.get('S');
    if (!node) throw new Error('falta S');
    const path: TraversalPath = ['X'];
    expect(enterNode(path, node)).toEqual(['X', 'S']);
    expect(path).toEqual(['X']);
  });

  it('resolveTarget nombra la secuencia cuando el destino no existe', () => {
    const graph = buildGraph([el(1, 'Start', 'START_EVENT')], [seq(1, 'Start', 'Ghost')]);
    const [edge] = outgoingOf(graph, 'Start');
    if (!edge) throw new Error('falta la arista');
    expectModelError(() => {
      resolveTarget(graph, edge);
    }, 'Process modelling error: sequence Start → Ghost points to a missing element.');
  });

  it('resolveTarget devuelve el elemento destino existente', () => {
    const graph = buildGraph(
      [el(1, 'Start', 'START_EVENT'), el(2, 'Task', 'USER_TASK')],
      [seq(1, 'Start', 'Task')],
    );
    const [edge] = outgoingOf(graph, 'Start');
    if (!edge) throw new Error('falta la arista');
    expect(resolveTarget(graph, edge).bpmnElementId).toBe('Task');
  });
});
