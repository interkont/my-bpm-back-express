const { ProcessDefinition, ProcessElement, ProcessSequence, DecisionLog } = require('../../models');
const { evaluateExpression } = require('../../utils/expressionEngine');

/**
 * Función recursiva para navegar el grafo del proceso y encontrar las siguientes tareas o eventos de fin.
 * @private
 */
const _findNextBlockingElements = async (element, processDefId, contextData) => {
  // Caso base: Si el elemento actual es una tarea de usuario, una tarea automática o un evento de fin, lo hemos encontrado.
  if (!element) return []; // Si no hay elemento, no hay nada que hacer.
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
        where: { processDefId, bpmnElementId: { [require('sequelize').Op.in]: targetBpmnIds } },
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
        if(nextElement) nextElementsToProcess.push(nextElement);
      } else {
        throw new Error(`No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${element.bpmnElementId}.`);
      }
      break;
    
    default:
        throw new Error(`Unsupported element type for decision traversal: ${element.type}`);
  }

  // Llamada recursiva para cada uno de los siguientes elementos.
  const results = await Promise.all(
    nextElementsToProcess.map(nextEl => _findNextBlockingElements(nextEl, processDefId, contextData))
  );

  // Aplanar el array de resultados.
  return results.flat();
};

/**
 * Servicio principal para decidir la siguiente tarea en un flujo de proceso.
 */
const decideNextTask = async (businessProcessKey, currentBpmnElementId, contextData, userId) => {
  // Crear el registro de log inicial
  const log = await DecisionLog.create({
    businessProcessKey,
    currentBpmnElementId,
    requestPayload: { businessProcessKey, currentBpmnElementId, contextData },
    executedByUserId: userId,
  });

  try {
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

    // --- LÓGICA CORREGIDA ---
    // 3. Dar el "primer paso" desde el elemento actual para encontrar los siguientes candidatos.
    const initialOutgoingSequences = await ProcessSequence.findAll({
      where: { processDefId: processDefinition.id, sourceElementBpmnId: startElement.bpmnElementId },
    });

    if (initialOutgoingSequences.length === 0) {
      // Si no hay salida, la respuesta es vacía, pero la llamada fue exitosa.
      const emptyResponse = { nextTasks: [] };
      await log.update({ responsePayload: emptyResponse });
      return emptyResponse;
    }

    const initialTargetBpmnIds = initialOutgoingSequences.map(seq => seq.targetElementBpmnId);
    const elementsAfterStart = await ProcessElement.findAll({
      where: { processDefId: processDefinition.id, bpmnElementId: { [require('sequelize').Op.in]: initialTargetBpmnIds } },
    });

    // 4. Iniciar la búsqueda recursiva DESDE LOS SIGUIENTES elementos.
    const results = await Promise.all(
      elementsAfterStart.map(nextEl => _findNextBlockingElements(nextEl, processDefinition.id, contextData))
    );
    const blockingElements = results.flat();
    
    // 5. Formatear la respuesta para el cliente.
    const nextTasks = blockingElements.map(el => ({
      bpmnElementId: el.bpmnElementId,
      name: el.name,
      type: el.type,
      assignedRoleId: el.assignedRoleId,
    }));
    
    const response = { nextTasks };
    
    // Actualizar el log con la respuesta exitosa
    await log.update({ responsePayload: response });
    
    return response;

  } catch (error) {
    // Actualizar el log con el mensaje de error
    await log.update({ errorMessage: error.message });
    // Relanzar el error para que el controlador lo maneje
    throw error;
  }
};

const getDecisionLogs = async (filters) => {
  // Opcional: Implementar filtros si es necesario en el futuro
  return DecisionLog.findAll({
    order: [['createdAt', 'DESC']],
    include: [{
      model: require('../../models').User, // Carga tardía para evitar ciclos
      as: 'executedByUser',
      attributes: ['id', 'username', 'email']
    }]
  });
};


module.exports = {
  decideNextTask,
  getDecisionLogs,
};
