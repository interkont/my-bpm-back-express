# Flowify BPM Backend (Node.js + Express + TypeScript)

API del motor BPM de Flowify. El proyecto está migrado a TypeScript (feature `001-typescript-migration`).

> **Referencia vigente:** [`blueprint.md`](./blueprint.md). Los capítulos 2 y 3 de este README (y el
> contenido histórico original) se conservan como historial; el README cap. 1 se considera legado
> (EXC-13) y, ante cualquier diferencia, prevalece `blueprint.md`.

## Requisitos

- Node.js 20
- Docker (solo para levantar el Postgres de pruebas)

## Instalación

```sh
npm ci
```

## Configuración

Crea un archivo `.env` en la raíz. **Nunca debe versionarse** (ni sus valores compartirse o imprimirse).

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a la base de datos (Sequelize) |
| `JWT_SECRET` | Sí | Firma y verificación de tokens |
| `PORT` | No | Puerto de escucha |
| `NODE_ENV` | No | Entorno (lo fijan los scripts de arranque) |
| `NODE_CONFIG_DIR` | No | Carpeta de los JSON de `config` (por defecto `src/config`) |

Si falta una variable obligatoria, el proceso termina con `Missing required configuration: <NOMBRE>`.

Precedencia del puerto: `PORT` → `--port <n>` → `3000`.

## Comandos

Todos funcionan en Windows y Unix.

| Comando | Efecto |
|---|---|
| `npm run start:dev` | Arranca desde `src/` con recarga (`tsx watch`) |
| `npm run build` | Compila `src/` a `dist/` |
| `npm run start:prod` | Ejecuta `dist/server.js` (requiere `build` previo) |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:test:up` / `npm run db:test:down` | Levanta / elimina el Postgres de pruebas (Docker) |
| `npm test` | Suites Jest (requiere `db:test:up`) |

## Estructura del proyecto

```text
src/api/           # módulos por recurso (rutas, controladores, servicios) y middlewares
src/domain/        # lógica de negocio y motor de procesos
src/config/        # configuración tipada (único lugar que lee process.env)
src/models/        # modelos Sequelize
src/utils/         # utilidades (logger, etc.)
tests/             # pruebas (contract, engine, unit, fixtures)
db/migrations/     # migraciones de base de datos
```

## Documentación

- [`blueprint.md`](./blueprint.md): referencia vigente del sistema.
- [`specs/001-typescript-migration/`](./specs/001-typescript-migration/): spec, plan, contratos y `quickstart.md` de la migración.

---

## Histórico (legado): Getting Started original

Instrucciones previas a la migración (`npm run dev`, `nodemon`, `node src/app.js`), ya no vigentes; usa la sección «Comandos».

---

## Chapter 2: Process Modeling API Enhancements

This chapter details the significant enhancements made to the Process Definition API to support dynamic process modeling from a frontend application, robust versioning, and a clear lifecycle for process definitions.

### 1. Unified Process Saving Endpoint

The `POST` and `PUT` endpoints for process definitions have been consolidated into a single, intelligent service. This simplifies the API and handles complex logic on the backend.

- **Endpoint:** `POST /api/processes/` (for creation)
- **Endpoint:** `PUT /api/processes/:id` (for updates)
- **Service Logic (`saveProcessDefinition`):**
    - **Smart Updates:** When updating a process in `DRAFT` state, the service performs an intelligent synchronization: it updates existing elements, creates new ones, and deletes those that were removed, without creating a new version.
    - **Automatic Versioning:** If a `PUT` request is made to a process that is `ACTIVE` or has running instances, the service automatically creates a new version. The previous version is marked as `DEPRECATED`, ensuring that ongoing instances are not affected.

### 2. Partial Metadata Updates

A new endpoint has been introduced to allow for partial updates of a process definition's metadata without triggering a new version. This is ideal for changing a process's name, description, or status.

- **Endpoint:** `PATCH /api/processes/:id`
- **Allowed Fields:** `name`, `description`, `category`, `status`.
- **Use Case:** An administrator can use this to manually change a process status from `ACTIVE` to `INACTIVE`, for example.

### 3. Decoupled API Payload

The API contract for creating and retrieving process definitions is now decoupled from the frontend's view layer.

- **`diagramJson`:** This field in the payload stores the raw JSON from the frontend modeling tool (e.g., SvelteFlow). The backend treats it as opaque data, responsible only for storing and retrieving it.
- **`elements` & `sequences`:** These arrays contain a clean, structured representation of the process's business logic (nodes and their connections). This is the data the backend's process engine uses.

### 4. Robust Process Lifecycle and Statuses

The process definition lifecycle is now managed by four distinct statuses:

- **`DRAFT`**: An in-design process that has not been activated yet. Can be freely edited.
- **`ACTIVE`**: The single, executable version of a business process. The system ensures only one version can be `ACTIVE` per `businessProcessKey`.
- **`DEPRECATED`**: An older version that was automatically replaced by a newer `ACTIVE` version.
- **`INACTIVE`**: A process that was manually archived or disabled by an administrator via the `PATCH` endpoint.

### 5. Admin-Only Endpoint for All Processes

To support the process modeler, a new administrative endpoint has been added to retrieve all process definitions, regardless of their status.

- **Endpoint:** `GET /api/processes/all`
- **Security:** Requires administrator privileges.
- **Purpose:** Allows administrators to view and manage processes that are in `DRAFT`, `DEPRECATED`, or `INACTIVE` states. The standard `GET /api/processes/` endpoint still returns only `ACTIVE` processes for regular users.

### 6. Guaranteed Cascade Deletion

The `DELETE /api/processes/:id` endpoint now enforces cascade deletion at the application layer within a transaction. This ensures that when a process definition is deleted, all its associated elements and sequences are reliably removed, maintaining database integrity.

---

## Chapter 3: Business Logic as a Service

The backend now exposes the process engine's decision-making capabilities as a standalone, stateless service. This allows external systems to leverage the modeled business logic without needing to create a process instance, effectively turning the platform into a "Business Logic as a Service".

### 1. "Decide Next Task" Endpoint

This is the core of the service. An external application can ask the engine what the next step in a process should be, based on a given context.

- **Endpoint:** `POST /api/engine/decide-next-task`
- **Functionality:** The service simulates the process flow from a given starting point (`currentBpmnElementId`). It traverses the process graph, recursively solving any intermediate gateways by evaluating their conditions against the provided `contextData`, until it finds the next blocking task(s) (`USER_TASK`, `AUTO_TASK`) or the end of the process (`END_EVENT`).

#### Request Payload Example:
```json
{
  "businessProcessKey": "PURCHASE_REQUEST",
  "currentBpmnElementId": "StartEvent_Purchase",
  "contextData": {
    "task": {},
    "instance": {
      "businessData": {
        "purchaseAmount": 1501
      }
    }
  }
}
```

#### Response Payload Example:
```json
{
  "nextTasks": [
    {
      "bpmnElementId": "Task_HighValueApproval",
      "name": "Aprobación de Alto Valor",
      "type": "USER_TASK",
      "assignedRoleId": 4
    }
  ]
}
```

### 2. Auditing with Decision Logs

Every call to the decision service is audited to provide full traceability.

- **Persistence:** Each request and its corresponding response (or error) is stored in the `decision_logs` table. This log includes which user made the request, the full request payload, the response, and timestamps.
- **Query Endpoint:** A new administrative endpoint is available to query these logs.
    - **Endpoint:** `GET /api/engine/decision-logs`
    - **Security:** Requires administrator privileges.
