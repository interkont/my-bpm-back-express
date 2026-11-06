import { catchAsync } from '../../utils/catchAsync';
import * as decisionService from './decision.service';
import type { DecisionContext } from './decision.service';

interface DecideNextTaskBody {
  businessProcessKey?: string;
  currentBpmnElementId?: string;
  contextData?: DecisionContext;
}

export const decideNextTask = catchAsync<Record<string, string>, unknown, DecideNextTaskBody>(
  async (req, res) => {
    const { businessProcessKey, currentBpmnElementId, contextData } = req.body;
    // Obtenemos el userId del usuario autenticado (passport lo deja en req.user).
    // `protect` garantiza que `req.user` existe en esta ruta.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.id;

    if (!businessProcessKey || !currentBpmnElementId || !contextData) {
      return res.status(400).json({
        error: 'businessProcessKey, currentBpmnElementId, and contextData are required.',
      });
    }

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
