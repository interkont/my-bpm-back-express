# Feature Specification: Migración del backend a TypeScript con equivalencia funcional y saneamiento de deuda

**Feature Branch**: `001-typescript-migration`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Analizar el repo de backend y todo el código completo, verificarlo para un spec de migración a TypeScript del código, sin ninguna afectación funcional respecto a lo actual, incluso mejorando lo mejorable y aplicando los patrones de diseño y buenas prácticas más afines al enfoque funcional de este repo, y resolver o depurar cualquier deuda pendiente."

**Documentos de soporte**:
- [`analysis.md`](./analysis.md): auditoría completa del código (48 archivos `.js`, ~2.870 líneas), inventario de contrato a congelar, catálogo de deuda clasificada A/B/C con referencias `ruta:línea`, modelo de tipos y patrones objetivo. Es la entrada principal para `/speckit-plan`.
- `blueprint.md` (raíz): comportamiento funcional vigente. Referencias `ruta:línea` al commit `ca041db`.
- `.specify/memory/constitution.md` v1.0.0: hoy **prohíbe** TypeScript sin enmienda (sección *Stack*, EXC-07). Ver FR-001.

---

## Contexto y alcance

El backend `my-bpm-back-express` (Flowify BPMS) está escrito en JavaScript CommonJS sin tipos ni pruebas. El motor de procesos, el versionado de definiciones y la autorización dependen de contratos implícitos (estados como cadenas, tipos de nodo como cadenas, formas de respuesta construidas a mano) que hoy solo se verifican en ejecución. Esta feature convierte el 100 % del código a TypeScript estricto **sin cambiar lo que el sistema hace**, y aprovecha la conversión para eliminar la deuda que se puede eliminar sin cambiar el funcionamiento.

Para que "sin afectación funcional" y "resolver la deuda" sean compatibles, toda la deuda detectada se clasifica en tres categorías (detalle en `analysis.md` §5):

| Categoría | Qué es | Tratamiento en esta feature |
|---|---|---|
| **A — Refactor invisible** | Cambios de estructura, tipos, tooling, logging, organización del motor. Ningún cliente puede observar la diferencia. | **Incluida.** Debe demostrarse con pruebas de caracterización. |
| **B — Corrección de defecto compatible** | Casos que hoy terminan en un fallo (500 genérico, `TypeError`, recursión infinita, consulta inválida) o contradicen la intención explícita del código. La corrección solo cambia esos casos defectuosos, y el frontend `sveltekit-bpm` ya los soporta sin cambios. | **Incluida**, cada una declarada y con su prueba. Lista cerrada en FR-020…FR-034. |
| **C — Cambio funcional o decisión de producto** | Cambia lo que un usuario puede hacer o lo que el sistema decide (permisos, integridad referencial, semántica del motor, nuevas capacidades). | **Fuera de alcance**: se cataloga como features sucesoras (FR-040). Decidido en Clarifications, Q1 = A. |

**Actores**: usuario final (`USER` con roles de proceso), administrador (`ADMIN`), frontend `sveltekit-bpm`, consumidores externos de `POST /api/engine/decide-next-task`, y el equipo de desarrollo backend (principal beneficiario de esta feature).

**Endpoints afectados**: los 32 endpoints bajo `/api` más `GET /` (estático). Ninguno se añade ni se elimina. Nivel de acceso de cada uno: **sin cambios** (público solo `POST /api/auth/login`; ADMIN en `/users/*`, `/roles/*`, `GET /processes/all`, `GET /engine/decision-logs`; JWT en el resto).

**Entidades y estados involucrados**: todas las del modelo (14 modelos). Estados sin cambios: definición `DRAFT | ACTIVE | INACTIVE | DEPRECATED`; instancia `RUNNING | COMPLETED`; tarea `PENDING | COMPLETED`; `systemRole` `ADMIN | USER`.

**Impacto en el frontend `sveltekit-bpm`**: **no requiere cambios de código**. Las correcciones de categoría B mejoran los mensajes que el frontend ya muestra (lee `message` del cuerpo de error) y eliminan un cierre de sesión indebido (FR-024).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El sistema se comporta exactamente igual tras la migración (Priority: P1)

Un usuario y un administrador usan Flowify como hasta hoy: inician sesión, modelan y versionan procesos, activan versiones, inician instancias, trabajan su bandeja, completan tareas, consultan instancias y administran usuarios y roles. Nada de lo que funcionaba cambia: mismas rutas, mismos datos, mismas respuestas, mismas decisiones del motor.

**Why this priority**: es la condición explícita del pedido ("sin ninguna afectación funcional"). Sin esta garantía, la migración no puede entregarse.

**Independent Test**: se ejecuta la batería de caracterización (contrato de los 32 endpoints + escenarios del motor + evaluación de condiciones) primero contra el código JavaScript actual para registrar la línea base, y luego contra la versión TypeScript; los resultados deben coincidir en todos los caminos correctos.

**Acceptance Scenarios**:

1. **Given** la línea base registrada sobre el código actual, **When** se ejecuta la misma batería contra la versión migrada, **Then** cada respuesta de camino correcto coincide en código HTTP y cuerpo JSON (ignorando valores generados como ids, fechas y tokens).
2. **Given** un proceso ACTIVE con gateway exclusivo, gateway paralelo (fork/join) y varias tareas, **When** se inicia una instancia y se completan sus tareas en distintos órdenes, **Then** las tareas creadas, sus estados, el `businessData` resultante y el estado final de la instancia son idénticos a los de la línea base.
3. **Given** las expresiones de condición almacenadas hoy en la base de demo, **When** se evalúan con los mismos contextos en ambas versiones, **Then** producen el mismo resultado booleano.
4. **Given** un token JWT emitido por la versión actual antes del despliegue, **When** se usa contra la versión migrada, **Then** sigue siendo aceptado hasta su vencimiento con los mismos permisos.
5. **Given** definiciones, instancias y tareas creadas por la versión actual (incluidas instancias en curso), **When** se opera sobre ellas con la versión migrada, **Then** se leen, versionan y avanzan sin errores ni migraciones de datos.
6. **Given** el frontend `sveltekit-bpm` sin modificaciones, **When** se recorren sus flujos de demo, **Then** todos funcionan igual que antes.

---

### User Story 2 - El equipo trabaja sobre contratos de dominio verificados (Priority: P1)

Un desarrollador que modifica el motor, el versionado o un endpoint obtiene del propio proyecto la verificación de que respeta los contratos: valores válidos de estados y tipos de nodo, forma de las entradas y respuestas, atributos reales de cada entidad y paridad entre el motor de ejecución y el motor de decisión. Un error de este tipo se detecta antes de ejecutar el sistema.

**Why this priority**: es el valor de negocio de la migración. Sin contratos verificados, cada cambio futuro en el motor arriesga regresiones silenciosas (el código actual ya contiene una: `decision-logs` consulta un atributo inexistente).

**Independent Test**: se introducen deliberadamente errores representativos (un estado mal escrito, un tipo de nodo nuevo manejado solo en un motor, un atributo inexistente en una consulta, un campo de respuesta omitido) y se verifica que la verificación estática del proyecto los rechaza.

**Acceptance Scenarios**:

1. **Given** un desarrollador que escribe un estado inexistente (p. ej. `'ACTIV'`), **When** ejecuta la verificación del proyecto, **Then** falla señalando el error.
2. **Given** un tipo de nodo nuevo añadido al catálogo, **When** no se define su comportamiento en ambos motores (ejecución y decisión), **Then** la verificación del proyecto falla.
3. **Given** una consulta que pide un atributo que no existe en la entidad, **When** se verifica el proyecto, **Then** falla (el defecto actual de `decision-logs` no podría haberse introducido).
4. **Given** un cambio que altera la forma de una respuesta consumida por el frontend, **When** se ejecutan las pruebas de contrato, **Then** fallan identificando el endpoint y el campo.

---

### User Story 3 - Los errores son comprensibles y usan el código HTTP correcto (Priority: P2)

Hoy casi cualquier error de negocio (credenciales inválidas, recurso inexistente, versión ACTIVE duplicada, tarea no autorizada) llega al usuario como "HTTP error! Status: 500". Tras la migración, el usuario ve el mensaje real ("Invalid credentials", "Process definition not found", "An active version already exists…") y el cliente recibe un código HTTP coherente, sin que ningún flujo correcto cambie.

**Why this priority**: es la corrección de mayor impacto visible dentro de la categoría B y la condición para que el resto del manejo de errores sea tipado y centralizado.

**Independent Test**: para cada error de negocio catalogado (FR-021), se provoca la condición y se verifica código, `message` y `code`; además se verifica en el frontend sin cambios que el aviso muestra el mensaje real.

**Acceptance Scenarios**:

1. **Given** credenciales inválidas, **When** se intenta iniciar sesión, **Then** la respuesta es 401 con `{ message: "Invalid credentials" }` y el frontend muestra ese mensaje.
2. **Given** un id de definición inexistente, **When** se consulta `save-ask`, se modifica, se borra o se pide su formulario de inicio, **Then** la respuesta es 404 con mensaje descriptivo.
3. **Given** otra versión ACTIVE de la misma key, **When** se activa una versión, **Then** la respuesta es 409 con el mensaje actual (versión e id de la activa) y nada cambia en la base.
4. **Given** un usuario autenticado que intenta cambiar su contraseña con una contraseña anterior incorrecta, **When** envía el formulario de perfil, **Then** recibe un error de validación con mensaje claro y **su sesión no se cierra**.
5. **Given** un fallo no controlado, **When** ocurre, **Then** la respuesta es 500 con cuerpo JSON genérico sin detalles internos, y el detalle completo queda en el log.

---

### User Story 4 - El motor falla de forma explícita ante modelos defectuosos (Priority: P2)

Un modelador guarda un proceso con un defecto (una secuencia que apunta a un elemento borrado, un ciclo formado solo por gateways, una tarea sin salida). Hoy el motor revienta con un error interno o, en el motor de decisión, entra en recursión sin fin. Tras la migración, la operación se rechaza de forma atómica con un error de modelado que identifica el elemento problemático; los procesos correctos se ejecutan exactamente igual.

**Why this priority**: el motor es el núcleo del producto (Principio VI) y estas fallas afectan la estabilidad del servidor completo.

**Independent Test**: suite de escenarios de grafos defectuosos ejecutada contra ambos motores, verificando error explícito, ausencia de cambios parciales en base y que el servidor sigue respondiendo.

**Acceptance Scenarios**:

1. **Given** un gateway con una secuencia hacia un `bpmnElementId` inexistente, **When** el motor recorre esa ruta, **Then** responde con error de modelado (`PROCESS_MODEL_ERROR`) que nombra la secuencia, y la transacción se revierte.
2. **Given** un ciclo formado solo por gateways, **When** se invoca `decide-next-task` o se inicia una instancia, **Then** se responde error de modelado en lugar de agotar la pila, y la llamada queda auditada en `decision_logs`.
3. **Given** un proceso correcto de la línea base, **When** se ejecuta, **Then** el resultado es idéntico al de la User Story 1.

---

### User Story 5 - El servicio se construye, arranca y opera de forma predecible (Priority: P3)

Cualquier integrante del equipo, en Windows o Linux, instala dependencias, compila, ejecuta las pruebas y levanta el servidor (desarrollo y modo productivo) con comandos documentados. Si falta una variable de configuración obligatoria, el servidor se niega a arrancar con un mensaje que nombra la variable. Los logs salen de un único canal, con niveles coherentes y sin datos sensibles.

**Why this priority**: hoy `start:prod` no funciona, `start:dev` falla en Windows, conviven dos loggers y `console.*`, y el motor imprime el `businessData` completo. Son prerrequisitos para salir de la fase piloto, pero no bloquean el valor de P1/P2.

**Independent Test**: en una máquina Windows y una Linux limpias, seguir el `quickstart.md` de la feature; arrancar sin `JWT_SECRET` y verificar el mensaje; ejecutar un flujo completo y revisar que los logs no contengan contraseñas, tokens, hashes ni `businessData`.

**Acceptance Scenarios**:

1. **Given** un clon limpio y un `.env` válido, **When** se ejecutan los comandos documentados de instalación, compilación y arranque en Windows y en Linux, **Then** el servidor arranca en el puerto configurado con la misma precedencia actual (`PORT` → `--port` → 3000).
2. **Given** que falta `DATABASE_URL` o `JWT_SECRET`, **When** se arranca, **Then** el proceso termina con un mensaje que nombra la variable faltante (sin imprimir valores).
3. **Given** un flujo completo de instancia, **When** se revisan los logs, **Then** solo contienen identificadores y resultados, emitidos por un único logger.

---

### User Story 6 - La deuda que no se resuelve queda catalogada y priorizada (Priority: P3)

El responsable del producto recibe, al cerrar la feature, la lista de deuda de categoría C con su riesgo, su impacto en el frontend y la feature sucesora propuesta, de modo que pueda planificar la salida de la fase piloto sin re-auditar el código.

**Why this priority**: es lo que permite cumplir "resolver o depurar cualquier deuda pendiente" sin violar "sin afectación funcional".

**Independent Test**: comparar la tabla de excepciones (EXC-xx) y anti-patrones (AP-xx) de la constitution y la §11 del blueprint contra el resultado: cada ítem aparece como resuelto (con su prueba) o como feature sucesora.

**Acceptance Scenarios**:

1. **Given** el cierre de la feature, **When** se revisan EXC-01…EXC-13, AP-01…AP-20 y blueprint §11, **Then** cada ítem está marcado como resuelto o asignado a una feature sucesora con justificación.

---

### Edge Cases

- **Instancias en curso durante el despliegue**: tareas `PENDING` creadas por la versión JS deben completarse con la versión TS sin diferencia (sin migración de datos).
- **Tokens emitidos antes del despliegue**: mismo secreto, mismo payload `{ id, roleIds, systemRole }`, misma expiración de 8 h; siguen siendo válidos.
- **`diagramJson` guardado con la versión actual** (almacenado como texto JSON en `bpmn_xml`): se lee igual; si no es JSON válido, se sigue devolviendo `{}` como hoy.
- **`businessData` con claves sin `FieldDefinition`**: se siguen devolviendo con `label` = clave y `fieldType` = `UNKNOWN`.
- **Ids no numéricos en la ruta** (`/processes/abc`): hoy el resultado depende del ORM (404 o 500); tras la migración responden 400 o 404 de forma consistente, nunca 500.
- **Cuerpo JSON malformado**: hoy 500 texto plano; tras la migración 400 con mensaje.
- **Valores falsy legítimos en formularios** (`0`, `false`, `""`): hoy se muestran como `null` en el formulario de la tarea; tras la migración se muestra el valor real (FR-031).
- **Proceso que llega a `END_EVENT` en el mismo arranque**: hoy la respuesta de inicio dice `RUNNING` aunque la instancia quedó `COMPLETED`; tras la migración devuelve el estado real (FR-032).
- **Ramas paralelas**: el orden de creación de tareas hermanas pasa a ser determinista (orden de las secuencias); no cambia qué tareas se crean.
- **Peticiones al límite de tamaño o de rate limit**: mismos límites actuales (cuerpo JSON 100 kB, 100 peticiones / 15 min por IP).
- **Conflictos de unicidad del ORM** (email duplicado, `name` de rol duplicado): hoy 500; tras la migración 409.
- **Consumidores externos de `decide-next-task`** que leen el campo `error` de la respuesta 400: el campo se conserva junto al nuevo `message` (FR-025).

---

## Requirements *(mandatory)*

### Functional Requirements

#### Gobierno y prerrequisitos

- **FR-001**: Antes de iniciar la implementación MUST aprobarse una enmienda de la constitution que autorice TypeScript (elimina la prohibición de la sección *Stack* y EXC-07, actualiza las extensiones de archivo normadas en el Principio I y las plantillas de módulo, añade al stack aprobado las herramientas de compilación, ejecución en desarrollo, pruebas y lint que justifique el plan, e incorpora el código 422 a la tabla de errores). Se espera versión 2.0.0.
- **FR-002**: La migración MUST entregarse completa en un único cambio integrado a la rama principal: al integrarse no puede quedar código de aplicación en JavaScript (regla vigente "sin TypeScript parcial"). Dentro de la rama de la feature se admite convivencia temporal.
- **FR-003**: Antes de modificar el código MUST existir una batería de pruebas de caracterización ejecutada contra el código JavaScript actual que registre la línea base de: (a) los 32 endpoints en sus caminos correctos y de error, (b) los escenarios del motor (inicio, gateway exclusivo con condición, ruta por defecto, fork/join paralelo, fin), (c) la evaluación de todas las expresiones de condición existentes en la base de demo.
- **FR-004**: Las pruebas MUST ejecutarse sin la base compartida remota, sobre una base de pruebas construida a partir del esquema real vigente, documentado como script SQL versionado de línea base (`db/migrations/000_baseline.sql`, solo documenta el esquema existente, no lo modifica).

#### Equivalencia funcional (categoría A)

- **FR-005**: Todas las rutas, métodos, niveles de acceso, parámetros aceptados y formas de respuesta de camino correcto MUST permanecer idénticos, salvo las correcciones listadas en FR-020…FR-034.
- **FR-006**: Las reglas de negocio RN-01…RN-34 del blueprint §10 MUST conservarse, incluidas las de versionado (RN-13…RN-19), motor (RN-20…RN-29) y auditoría de decisiones (RN-31…RN-33).
- **FR-007**: La semántica actual del motor MUST conservarse en ambos motores, incluidas sus diferencias actuales documentadas: `AUTO_TASK` sigue siendo nodo bloqueante válido en el motor de decisión y no soportado en el de ejecución; el primer paso de `decide-next-task` sigue tomando todas las salidas sin evaluar condiciones; el join paralelo conserva su regla de conteo. Cambiar estas semánticas es categoría C.
- **FR-008**: La evaluación de condiciones MUST producir resultados idénticos para la sintaxis existente, conservando que una expresión vacía o con error se considera falsa.
- **FR-009**: Los tokens, el algoritmo de firma, el payload y la expiración MUST conservarse; los usuarios MUST NOT necesitar volver a iniciar sesión por el despliegue.
- **FR-010**: Las respuestas MUST seguir sin incluir `passwordHash`; además, la identidad del usuario autenticado disponible internamente durante la petición MUST dejar de transportar el hash.
- **FR-011**: El proyecto MUST verificar estáticamente, con el nivel más estricto disponible, todo el código de aplicación; el uso de tipos no verificados MUST limitarse a los bordes con librerías sin tipos o datos de forma libre (`businessData`, `diagramJson`, `validations`), donde el dato se trata como desconocido hasta validarse.
- **FR-012**: Los valores de dominio (estados de definición, instancia y tarea; tipos de nodo; `systemRole`; acciones de guardado `UPDATE_IN_PLACE`/`CREATE_NEW_VERSION`) MUST definirse una sola vez y usarse desde esa definición en todo el código.
- **FR-013**: La paridad entre el motor de ejecución y el de decisión MUST garantizarse por construcción: ambos MUST compartir la lógica de construcción del contexto de evaluación y de elección de ruta del gateway exclusivo, y añadir un tipo de nodo sin definir su comportamiento en ambos MUST impedir la compilación.
- **FR-014**: Las formas de entrada y salida de cada endpoint MUST declararse explícitamente y las respuestas MUST construirse con proyecciones explícitas (no mutando entidades del ORM), produciendo el mismo JSON que hoy.
- **FR-015**: Todos los controladores MUST delegar los errores en el manejador central; ningún controlador MUST traducir errores por su cuenta. Las reglas de dominio (incluido el hash de contraseñas) MUST residir en servicios.
- **FR-016**: MUST existir un único logger; MUST NOT quedar salidas directas a consola; los logs MUST NOT contener contraseñas, tokens, hashes ni el contenido de `businessData`/contexto de evaluación. Los archivos de log actuales (`error.log`, `combined.log`) MUST seguir generándose.
- **FR-017**: La configuración MUST validarse al arrancar (variables obligatorias: `DATABASE_URL`, `JWT_SECRET`) y leerse desde un único módulo de configuración; el secreto JWT MUST dejar de leerse directamente del entorno en los servicios.
- **FR-018**: La aplicación MUST poder cargarse sin abrir puerto ni conectar a la base (separación aplicación/servidor), y los comandos de desarrollo, compilación, arranque productivo, verificación de tipos, lint y pruebas MUST funcionar en Windows y Unix.
- **FR-019**: MUST eliminarse el código muerto e inalcanzable identificado (consulta de conteo sin uso del join, bloque de deprecación inalcanzable en el PATCH, imports sin uso, `src/index.ts` de plantilla, imports perezosos dentro de funciones, comentarios de bitácora) y los metadatos de plantilla de `package.json`, sin cambiar el comportamiento.

#### Correcciones de defectos compatibles (categoría B, lista cerrada)

- **FR-020**: El manejador central de errores MUST responder con el código asociado al error y cuerpo JSON `{ message, code?, details? }`; los errores no controlados MUST responder 500 con `{ message: "Internal server error" }` sin detalles internos (hoy: 500 texto plano `Something broke!` en todos los casos).
- **FR-021**: Los errores de negocio existentes MUST mapearse así (mismo texto de mensaje que hoy):

  | Condición actual | Hoy | Tras la migración |
  |---|---|---|
  | Credenciales inválidas en login; body sin `email`/`password` | 500 | 401 / 400 |
  | Definición inexistente en `save-ask`, `PATCH`, `DELETE`, `start-form` sin `START_EVENT` | 500 | 404 |
  | `PUT /processes/:id` con id inexistente (hoy crea en silencio un proceso nuevo v1) | 200 + alta indebida | 404 |
  | Otra versión ACTIVE para la key | 500 | 409 |
  | Formulario de tarea inexistente | 500 | 404 |
  | Tarea inexistente, no `PENDING` o no asignada al usuario al completarla | 500 | 404 (MUST NOT ser 401) |
  | Key sin versión ACTIVE al iniciar instancia o en `decide-next-task` | 500 | 404 |
  | Elemento inexistente en `decide-next-task` | 500 | 404 |
  | `PUT /users/:id` inexistente | 500 | 404 |
  | Unicidad o FK violada (email, nombre de rol, key+versión) | 500 | 409 |
  | Cuerpo JSON malformado; id de ruta no numérico | 500 | 400 |
  | Alta de usuario sin `password` | 500 | 400 |
  | Error de modelado del proceso (FR-027) | 500 / `TypeError` | 422 con `code: PROCESS_MODEL_ERROR` |

- **FR-022**: Los códigos que ya son correctos hoy (400/404 de perfil, 404/409 de roles, 403 de `isAdmin`, 401 de autenticación, 404 de lecturas por id) MUST conservarse con el mismo cuerpo.
- **FR-023**: La validación de entrada MUST rechazar únicamente entradas que hoy terminan en error; MUST NOT rechazar ninguna petición que hoy se procese con éxito (la validación más estricta de campos es categoría C).
- **FR-024**: El cambio de contraseña propia con contraseña anterior incorrecta MUST responder 400 (hoy 401, lo que hace que el frontend cierre la sesión del usuario). Ningún error de negocio sobre un usuario autenticado MUST usar 401.
- **FR-025**: Las respuestas de error que hoy usan la clave `error` (`decide-next-task` 400, `my-tasks` 401) MUST incluir además `message` con el mismo texto, conservando `error` por compatibilidad con consumidores externos.
- **FR-026**: `GET /api/engine/decision-logs` MUST funcionar (hoy falla por pedir el atributo inexistente `username`) y devolver el usuario ejecutor con `id`, `fullName` y `email`.
- **FR-027**: Ambos motores MUST detectar y reportar como error de modelado, revirtiendo la transacción: secuencia hacia elemento inexistente, ciclo sin elementos bloqueantes, tarea de usuario sin salida y tarea cuya definición de elemento no existe. Las decisiones fallidas MUST seguir quedando auditadas.
- **FR-028**: La creación de una nueva versión MUST calcular `version` como el máximo existente para la key + 1 (hoy: versión de origen + 1, que provoca violación de unicidad al versionar desde una versión que no es la última).
- **FR-029**: Al guardar definiciones (crear, actualizar en sitio, nueva versión) e instancias crudas (`/record`, `PUT /process-instances/:id`), solo MUST persistirse los campos del modelo correspondiente, sin permitir sobrescribir identificadores, versión ni fechas de creación desde el cuerpo. Los campos que hoy se aceptan y persisten MUST seguir aceptándose.
- **FR-030**: El historial de tareas de `GET /process-instances/:id` MUST ordenarse por fecha de creación ascendente, como pretende el código actual (hoy el orden indicado se ignora).
- **FR-031**: En el formulario de una tarea, los valores falsy válidos de `businessData` (`0`, `false`, `""`) MUST mostrarse como tales (hoy se convierten en `null`); solo la ausencia de valor produce `null`.
- **FR-032**: La respuesta de inicio de instancia MUST reflejar el estado real de la instancia al terminar la transacción.
- **FR-033**: `PATCH /processes/:id` MUST rechazar con 400 valores de `status` fuera de `DRAFT | ACTIVE | INACTIVE | DEPRECATED` (hoy se persiste cualquier cadena).
- **FR-034**: Las dependencias MUST actualizarse dentro de su versión mayor actual para resolver las vulnerabilidades críticas y altas que tengan corrección sin cambio de mayor; las dependencias instaladas sin uso MUST retirarse. El informe final MUST listar las vulnerabilidades restantes y su feature sucesora.

#### Deuda fuera de alcance (categoría C)

- **FR-040**: La feature MUST entregar el catálogo de deuda de categoría C (ver `analysis.md` §5.3) con riesgo, impacto en el frontend y feature sucesora propuesta, y MUST actualizar la tabla de excepciones de la constitution y el blueprint §11 marcando lo resuelto. Incluye, entre otros: reemplazo de `expr-eval` (vulnerabilidad crítica), `isAdmin` en diseño de procesos y escritura de instancias, control de acceso por registro, claves foráneas y borrados con dependientes, semántica del motor (`AUTO_TASK`, modelo de tokens, join, primer paso del motor de decisión), persistencia de `formFields`/`actions`/`webhook_target`/`sla_definition` que el modelador ya envía y hoy se descartan, `GET /api/fields`, permisos frescos desde la base y estado del usuario, CORS por entorno. Ningún ítem C entra en esta feature (Q1 = A).
- **FR-042**: La librería de evaluación de expresiones MUST conservarse en su versión actual exacta durante esta feature. Su reemplazo MUST planificarse como la feature inmediatamente sucesora, conservando la funcionalidad del motor de expresiones (misma sintaxis y mismos resultados) y usando como criterio de aceptación la batería de expresiones de FR-003 (c).
- **FR-041**: `blueprint.md` MUST actualizarse para reflejar los nuevos códigos de error, el comando de arranque y la estructura del proyecto.

### Key Entities *(include if feature involves data)*

No se crean ni modifican entidades ni columnas. Se formalizan como contratos tipados las existentes:

- **Usuario / Rol / Asignación usuario-rol / Módulos por rol de sistema**: identidad, roles de proceso (N:M) y módulos de UI por `systemRole`.
- **Definición de proceso / Elemento / Secuencia**: grafo versionado por `businessProcessKey`; el elemento se identifica en el grafo por `bpmnElementId`.
- **Definición de campo / Vínculo elemento-formulario**: biblioteca de campos y su uso por elemento.
- **Instancia de proceso / Instancia de tarea**: ejecución ligada a una versión, con `businessData` libre.
- **Log de decisión**: auditoría de `decide-next-task`.
- **Documento, asignación de caso**: existen en el esquema sin uso funcional; se tipan sin añadir comportamiento.
- **Error de aplicación**: nuevo concepto transversal (no persistido): mensaje, código HTTP y código de error estable.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los escenarios de camino correcto de la línea base (32 endpoints + escenarios del motor) producen el mismo resultado en la versión migrada.
- **SC-002**: El 100 % de las expresiones de condición existentes en la base de demo producen el mismo resultado en ambas versiones.
- **SC-003**: Los flujos de demo del frontend (login, modelado y guardado, nueva versión, activación, inicio de instancia, bandeja, completar tarea, detalle de instancia, administración de usuarios y roles) se completan sin modificar el frontend y sin errores nuevos.
- **SC-004**: 0 archivos de aplicación en JavaScript al integrar; 0 errores en la verificación estática estricta; 0 advertencias de lint.
- **SC-005**: Cada uno de los errores de negocio de FR-021 llega al usuario con su mensaje real en lugar de "HTTP error! Status: 500" (verificado por prueba para cada fila de la tabla).
- **SC-006**: 0 caídas o bloqueos del servidor ante los grafos defectuosos de la suite de modelado (FR-027).
- **SC-007**: El equipo levanta el servicio desde un clon limpio en Windows y en Linux siguiendo solo `quickstart.md`, en menos de 10 minutos.
- **SC-008**: 0 vulnerabilidades críticas o altas con corrección disponible sin cambio de versión mayor; las restantes listadas con feature sucesora.
- **SC-009**: 100 % de los ítems EXC-xx, AP-xx y blueprint §11 clasificados como resueltos (con prueba) o asignados a feature sucesora.
- **SC-010**: Las pruebas automatizadas cubren los 32 endpoints, todos los tipos de nodo del motor y todas las filas de FR-021, y se ejecutan completas sin la base compartida.
- **SC-011**: 0 apariciones de contraseñas, tokens, hashes o `businessData` en los logs generados por la suite completa.

---

## Assumptions

- **Fase piloto vigente**: no hay QA ni producción; el despliegue es un reemplazo directo en el ambiente de demo, sin ventana de convivencia ni rollback de datos (no se cambian datos).
- **Correcciones B incluidas por defecto**: se asumen deseadas porque el pedido incluye "mejorar lo mejorable" y el frontend las soporta sin cambios (lee `message` en todo error y solo trata 401 de forma especial). Si se prefiere una migración 100 % pura, las FR-020…FR-034 pasan a una feature propia.
- **Códigos de estado elegidos para no romper el frontend**: ningún error de negocio sobre usuario autenticado usa 401, porque el frontend cierra sesión ante cualquier 401 con token.
- **Esquema de base**: la fuente de verdad es la base de demo actual; se extrae un volcado de solo esquema para la base de pruebas. `resources/*.sql` y `*.prisma` no se usan (Principio II).
- **Runtime y frameworks**: se mantienen Node 20, Express 4, Sequelize 6, passport-jwt y `config`; no se cambian versiones mayores en esta feature (Express 5, Sequelize 7 serían features propias).
- **Estilo**: se conserva el enfoque funcional actual (módulos de funciones, sin clases de servicio ni contenedores de inyección); los patrones concretos se proponen en `analysis.md` §6 y se deciden en `/speckit-plan`.
- **Biblioteca de validación**: se decide en el plan dentro de la enmienda de FR-001 (`express-validator`, ya aprobada, o un esquema que derive tipos); en ambos casos aplica FR-023.
- **Dependencias**: la feature depende de acceso de lectura a la base de demo para extraer el esquema y las expresiones de condición existentes.

---

## Clarifications

### Session 2026-11-05

- Q1: ¿Entra en esta feature alguna deuda de categoría C (cambio funcional)? → A: ninguna. Primero se migra con equivalencia funcional verificada; la deuda C queda como features sucesoras.
- Riesgo aceptado: `expr-eval` 2.0.2 sigue en uso durante esta feature, con sus tres avisos de seguridad sin corrección (GHSA-q9v2-7m5w-4693 crítico, GHSA-jc85-fpwf-qm7x y GHSA-8gw3-rxh4-v6jx altos). Se acepta porque el sistema está en fase piloto con datos de demo (EXC-01). Su reemplazo es la feature inmediatamente sucesora (FR-042): se cambia la librería, no se retira el motor de expresiones.
