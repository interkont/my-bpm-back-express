import { buildEvaluationContext, chooseExclusiveRoute } from '../../../src/api/engine/context';
import type { SequenceEdge } from '../../../src/api/engine/graph';

const edge = (id: number, target: string, condition: string | null): SequenceEdge => ({
  id,
  source: 'G',
  target,
  condition,
});

describe('buildEvaluationContext', () => {
  it('aplana businessData y añade instance y task', () => {
    const instance = { id: 1 };
    const task = { action: 'ok' };
    const ctx = buildEvaluationContext({ amount: 5 }, instance, task);
    expect(ctx).toEqual({ amount: 5, instance, task });
    expect(Object.keys(ctx)).toEqual(['amount', 'instance', 'task']);
  });

  it('businessData null o undefined equivale a {}', () => {
    expect(buildEvaluationContext(null, { a: 1 }, {})).toEqual({ instance: { a: 1 }, task: {} });
    expect(buildEvaluationContext(undefined, {}, {})).toEqual({ instance: {}, task: {} });
  });

  it('instance y task prevalecen sobre claves homónimas de businessData', () => {
    const ctx = buildEvaluationContext({ instance: 'x', task: 'y', k: 1 }, { id: 1 }, { t: 1 });
    expect(ctx.instance).toEqual({ id: 1 });
    expect(ctx.task).toEqual({ t: 1 });
    expect(ctx.k).toBe(1);
  });
});

describe('chooseExclusiveRoute', () => {
  const ctx = buildEvaluationContext({ n: 10 }, {}, {});

  it('elige la primera condición verdadera', () => {
    const edges = [edge(1, 'A', 'n > 100'), edge(2, 'B', 'n > 5'), edge(3, 'C', 'n > 1')];
    expect(chooseExclusiveRoute(edges, ctx)?.target).toBe('B');
  });

  it('una condición verdadera gana aunque haya ruta por defecto antes', () => {
    const edges = [edge(1, 'DEF', null), edge(2, 'B', 'n > 5')];
    expect(chooseExclusiveRoute(edges, ctx)?.target).toBe('B');
  });

  it('usa la primera ruta sin condición si ninguna es verdadera', () => {
    const edges = [edge(1, 'A', 'n > 100'), edge(2, 'D1', null), edge(3, 'D2', null)];
    expect(chooseExclusiveRoute(edges, ctx)?.target).toBe('D1');
  });

  it('cadena vacía cuenta como sin condición', () => {
    expect(chooseExclusiveRoute([edge(1, 'A', 'n > 100'), edge(2, 'E', '')], ctx)?.target).toBe(
      'E',
    );
  });

  it('devuelve null sin ruta ni defecto', () => {
    expect(chooseExclusiveRoute([edge(1, 'A', 'n > 100')], ctx)).toBeNull();
    expect(chooseExclusiveRoute([], ctx)).toBeNull();
  });

  it('una condición que falla es falsa y no es defecto', () => {
    expect(chooseExclusiveRoute([edge(1, 'A', 'n >>> ((')], ctx)).toBeNull();
    expect(
      chooseExclusiveRoute([edge(1, 'A', 'noExiste.x'), edge(2, 'D', null)], ctx)?.target,
    ).toBe('D');
  });
});
