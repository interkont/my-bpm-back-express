import {
  buildGraph,
  outgoingOf,
  type ElementRow,
  type SequenceRow,
} from '../../../src/api/engine/graph';

const el = (
  id: number,
  bpmnElementId: string,
  type: ElementRow['type'] = 'USER_TASK',
): ElementRow => ({
  id,
  bpmnElementId,
  name: `n${id}`,
  type,
  assignedRoleId: null,
});
const seq = (id: number, s: string, t: string, c?: string | null): SequenceRow => ({
  id,
  sourceElementBpmnId: s,
  targetElementBpmnId: t,
  conditionExpression: c,
});

describe('buildGraph', () => {
  it('indexa elementos por bpmnElementId', () => {
    const g = buildGraph([el(1, 'A', 'START_EVENT'), el(2, 'B')], []);
    expect(g.elements.get('A')).toEqual({
      id: 1,
      bpmnElementId: 'A',
      name: 'n1',
      type: 'START_EVENT',
      assignedRoleId: null,
    });
    expect(g.elements.size).toBe(2);
  });

  it('ordena outgoing e incoming por id de secuencia ASC', () => {
    const g = buildGraph(
      [el(1, 'A'), el(2, 'B'), el(3, 'C')],
      [seq(9, 'A', 'C'), seq(2, 'A', 'B'), seq(5, 'B', 'C')],
    );
    expect(outgoingOf(g, 'A').map((e) => e.id)).toEqual([2, 9]);
    expect(g.incoming.get('C')?.map((e) => e.id)).toEqual([5, 9]);
  });

  it('mapea la arista y normaliza condición ausente a null', () => {
    const g = buildGraph([], [seq(1, 'A', 'B', 'x > 1'), seq(2, 'A', 'C'), seq(3, 'A', 'D', '')]);
    expect(outgoingOf(g, 'A')).toEqual([
      { id: 1, source: 'A', target: 'B', condition: 'x > 1' },
      { id: 2, source: 'A', target: 'C', condition: null },
      { id: 3, source: 'A', target: 'D', condition: '' },
    ]);
  });

  it('conserva una arista hacia un elemento ausente', () => {
    const g = buildGraph([el(1, 'A')], [seq(1, 'A', 'FANTASMA')]);
    expect(outgoingOf(g, 'A')).toHaveLength(1);
    expect(g.elements.has('FANTASMA')).toBe(false);
  });

  it('outgoingOf devuelve [] sin salidas', () => {
    const g = buildGraph([el(1, 'A')], []);
    expect(outgoingOf(g, 'A')).toEqual([]);
    expect(outgoingOf(g, 'ZZZ')).toEqual([]);
  });

  it('no muta la lista de entrada', () => {
    const rows = [seq(3, 'A', 'B'), seq(1, 'A', 'C')];
    buildGraph([], rows);
    expect(rows.map((r) => r.id)).toEqual([3, 1]);
  });
});
