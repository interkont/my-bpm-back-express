const decisionService = require('./decision.service');
const catchAsync = require('../../utils/catchAsync');

const decideNextTask = catchAsync(async (req, res) => {
  const { businessProcessKey, currentBpmnElementId, contextData } = req.body;

  if (!businessProcessKey || !currentBpmnElementId || !contextData) {
    return res.status(400).json({ error: 'businessProcessKey, currentBpmnElementId, and contextData are required.' });
  }

  const result = await decisionService.decideNextTask(businessProcessKey, currentBpmnElementId, contextData);
  res.status(200).json(result);
});

module.exports = {
  decideNextTask,
};
