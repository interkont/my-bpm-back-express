import { decideNextTask } from '../../../src/api/engine/decision.service';
import { isAppError } from '../../../src/domain/errors';

// Sin base de datos: se simulan los modelos usados por el servicio.
const mockCreate = jest.fn();
const mockFindOne = jest.fn();
jest.mock('../../../src/models', () => ({
  DecisionLog: { create: (...args: unknown[]): unknown => mockCreate(...args) },
  ProcessDefinition: { findOne: (...args: unknown[]): unknown => mockFindOne(...args) },
  ProcessElement: {},
  ProcessSequence: {},
  User: {},
}));

describe('decideNextTask: fallo al actualizar el log (N-09)', () => {
  it('relanza el error original aunque log.update falle', async () => {
    const update = jest.fn().mockRejectedValue(new Error('db caída'));
    mockCreate.mockResolvedValue({ update });
    mockFindOne.mockResolvedValue(null);

    let thrown: unknown;
    try {
      await decideNextTask('NOPE', 'X', {}, 1);
    } catch (error) {
      thrown = error;
    }
    expect(update).toHaveBeenCalledTimes(1);
    expect(isAppError(thrown)).toBe(true);
    expect((thrown as Error).message).toBe("Process with key 'NOPE' not found or is not active.");
  });
});
