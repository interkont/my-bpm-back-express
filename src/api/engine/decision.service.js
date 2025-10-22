const { ProcessDefinition, ProcessElement, ProcessSequence } = require('../../models');
const { evaluateExpression } = require('../../utils/expressionEngine');

/**
 * Función recursiva para navegar el grafo del proceso y encontrar las siguientes tareas o eventos de fin.
 * @private
 */
const _findNextBlockingElements = async (element, processDefId, contextData) => {
  // Caso base: Si el elemento actual es una tarea de usuario, una tarea automática o un evento de fin, lo hemos encontrado.
  if (element.type === 'USER_TASK' || element.type === 'END_EVENT' || element.type === 'AUTO_TASK') {
    return [element];
  }

  // Obtener las secuencias de salida del elemento actual.
  const outgoingSequences = await ProcessSequence.findAll({
    where: { processDefId, sourceElementBpmnId: element.bpmnElementId },
  });

  if (outgoingSequences.length === 0) {
    return []; // Callejón sin salida
  }

  let nextElementsToProcess = [];

  // Determinar los siguientes elementos a procesar basado en el tipo del elemento actual.
  switch (element.type) {
    case 'START_EVENT':
    case 'PARALLEL_GATEWAY':
      // Seguir todos los caminos.
      const targetBpmnIds = outgoingSequences.map(seq => seq.targetElementBpmnId);
      nextElementsToProcess = await ProcessElement.findAll({
        where: { processDefId, bpmnElementId: targetBpmnIds },
      });
      break;

    case 'EXCLUSIVE_GATEWAY':
      // Evaluar condiciones para encontrar un único camino.
      let chosenSequence = null;
      for (const seq of outgoingSequences) {
        if (seq.conditionExpression && evaluateExpression(seq.conditionExpression, contextData)) {
          chosenSequence = seq;
          break;
        }
      }
      // Si ninguna condición se cumple, buscar el camino por defecto (sin condición).
      if (!chosenSequence) {
        chosenSequence = outgoingSequences.find(seq => !seq.conditionExpression);
      }
      if (chosenSequence) {
        const nextElement = await ProcessElement.findOne({
          where: { processDefId, bpmnElementId: chosenSequence.targetElementBpmnId },
        });
        nextElementsToProcess.push(nextElement);
      } else {
        throw new Error(`No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${element.bpmnElementId}.`);
      }
      break;
    
    default:
        // Si es otro tipo de elemento que no bloquea (ej. Tarea de Servicio en el futuro), se trataría como un Start Event.
        // Por ahora, lo limitamos a los tipos que conocemos.
        throw new Error(`Unsupported element type for decision traversal: ${element.type}`);
  }

  // Llamada recursiva para cada uno de los siguientes elementos.
  const results = await Promise.all(
    nextElementsToProcess.map(nextEl => _findNextBlockingElements(nextEl, processDefId, contextData))
  );

  // Aplanar el array de resultados. [[task1], [task2, task3]] -> [task1, task2, task3]
  return results.flat();
};

/**
 * Servicio principal para decidir la siguiente tarea en un flujo de proceso.
 */
const decideNextTask = async (businessProcessKey, currentBpmnElementId, contextData) => {
  // 1. Encontrar la definición de proceso activa.
  const processDefinition = await ProcessDefinition.findOne({
    where: { businessProcessKey, status: 'ACTIVE' },
    order: [['version', 'DESC']],
  });
  if (!processDefinition) {
    throw new Error(`Process with key '${businessProcessKey}' not found or is not active.`);
  }

  // 2. Encontrar el elemento de partida.
  const startElement = await ProcessElement.findOne({
    where: { processDefId: processDefinition.id, bpmnElementId: currentBpmnElementId },
  });
  if (!startElement) {
    throw new Error(`Element with BPMN ID '${currentBpmnElementId}' not found in process '${businessProcessKey}'.`);
  }

  // 3. Iniciar la búsqueda recursiva.
  const blockingElements = await _findNextBlockingElements(startElement, processDefinition.id, contextData);
  
  // 4. Formatear la respuesta para el cliente.
  const nextTasks = blockingElements.map(el => ({
    bpmnElementId: el.bpmnElementId,
    name: el.name,
    type: el.type,
    assignedRoleId: el.assignedRoleId,
  }));
  
  return { nextTasks };
};

module.exports = {
  decideNextTask,
};
