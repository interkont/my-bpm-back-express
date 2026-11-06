import { ELEMENT_TYPE } from '../../../src/domain/constants';
import { NODE_SEMANTICS } from '../../../src/api/engine/semantics';

describe('NODE_SEMANTICS', () => {
  it('tiene una fila por cada ElementType', () => {
    expect(Object.keys(NODE_SEMANTICS).sort()).toEqual([...ELEMENT_TYPE].sort());
  });

  it.each([
    ['START_EVENT', 'FOLLOW_ALL', 'FOLLOW_ALL'],
    ['PARALLEL_GATEWAY', 'FOLLOW_ALL', 'FOLLOW_ALL'],
    ['EXCLUSIVE_GATEWAY', 'EXCLUSIVE', 'EXCLUSIVE'],
    ['USER_TASK', 'CREATE_TASK', 'BLOCK'],
    ['END_EVENT', 'COMPLETE_INSTANCE', 'BLOCK'],
    ['AUTO_TASK', 'UNSUPPORTED', 'BLOCK'],
  ] as const)('%s: ejecución %s, decisión %s', (type, execution, decision) => {
    expect(NODE_SEMANTICS[type].execution.kind).toBe(execution);
    expect(NODE_SEMANTICS[type].decision.kind).toBe(decision);
  });

  it('AUTO_TASK difiere entre ejecución (no soportado) y decisión (bloqueante)', () => {
    expect(NODE_SEMANTICS.AUTO_TASK.execution.kind).not.toBe(
      NODE_SEMANTICS.AUTO_TASK.decision.kind,
    );
  });
});
