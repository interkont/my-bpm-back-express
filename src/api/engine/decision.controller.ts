import { catchAsync } from '../../utils/catchAsync';
import * as decisionService from './decision.service';
import type { DecisionContext } from './decision.service';
import type { DecideNextTaskInput } from './decision.schemas';

export const decideNextTask = catchAsync<Record<string, string>, unknown, DecideNextTaskInput>(
  async (req, res) => {
    // `validateBody` ya garantiza que los tres campos tienen valor.
    const { businessProcessKey, currentBpmnElementId } = req.body as {
      businessProcessKey: string;
      currentBpmnElementId: string;
    };
    // El cuerpo viene del JSON del cliente y se pasa tal cual: coincide con la forma de `DecisionContext`.
    const contextData = req.body.contextData as DecisionContext;
    // Obtenemos el userId del usuario autenticado (passport lo deja en req.user).
    // `protect` garantiza que `req.user` existe en esta ruta.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.id;

    const result = await decisionService.decideNextTask(
      businessProcessKey,
      currentBpmnElementId,
      contextData,
      userId,
    );
    return res.status(200).json(result);
  },
);

export const getDecisionLogs = catchAsync(async (req, res) => {
  // Los filtros por query aún no se implementan: se ignoran igual que antes.
  const logs = await decisionService.getDecisionLogs();
  res.status(200).json(logs);
});
