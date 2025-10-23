const decisionService = require('./decision.service');
const catchAsync = require('../../utils/catchAsync');

const decideNextTask = catchAsync(async (req, res) => {
  const { businessProcessKey, currentBpmnElementId, contextData } = req.body;
  const userId = req.user.id; // Obtenemos el userId del usuario autenticado

  if (!businessProcessKey || !currentBpmnElementId || !contextData) {
    return res.status(400).json({ error: 'businessProcessKey, currentBpmnElementId, and contextData are required.' });
  }

  const result = await decisionService.decideNextTask(businessProcessKey, currentBpmnElementId, contextData, userId);
  res.status(200).json(result);
});

const getDecisionLogs = catchAsync(async (req, res) => {
  const logs = await decisionService.getDecisionLogs(req.query); // Pasamos query params por si se añaden filtros
  res.status(200).json(logs);
});

module.exports = {
  decideNextTask,
  getDecisionLogs,
};
