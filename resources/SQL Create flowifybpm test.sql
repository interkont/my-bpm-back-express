-- =============================================================================
-- Flowify BPMS - Esquema de Base de Datos
-- Base de Datos: flowifybpms-test
-- Versión: 1.1
-- Descripción: Script completo para la creación de la estructura de tablas,
--              relaciones, comentarios e índices para el motor de BPM.
-- =============================================================================

-- Creación de la Base de Datos (ejecutar por separado si es necesario)
-- CREATE DATABASE "flowify";


-- =============================================================================
-- SECCIÓN 1: TABLAS MAESTRAS Y DE CONFIGURACIÓN
-- =============================================================================

-- Tabla de Roles: Define los roles de usuario en el sistema.
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
	description VARCHAR(100) NOT NULL
);
COMMENT ON TABLE roles IS 'Define los roles de usuario en el sistema (ej: Gerencia, Finanzas).';
COMMENT ON COLUMN roles.name IS 'Nombre único del rol.';

-- Tabla de Usuarios: Almacena la información de los usuarios del sistema.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES roles(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE users IS 'Almacena la información de los usuarios del sistema.';
COMMENT ON COLUMN users.full_name IS 'Nombre completo del usuario.';
COMMENT ON COLUMN users.email IS 'Correo electrónico único para el login.';
COMMENT ON COLUMN users.password_hash IS 'Hash de la contraseña del usuario.';
COMMENT ON COLUMN users.role_id IS 'Rol principal del usuario.';
COMMENT ON COLUMN users.status IS 'Estado del usuario (ACTIVE, INACTIVE).';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del registro.';

-- Tabla de Definiciones de Procesos: El catálogo maestro de cada proceso de negocio.
CREATE TABLE process_definitions (
    id SERIAL PRIMARY KEY,
    business_process_key VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INT NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    bpmn_process_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_process_key, version)
);
COMMENT ON TABLE process_definitions IS 'El catálogo maestro de cada proceso de negocio y sus versiones.';
COMMENT ON COLUMN process_definitions.business_process_key IS 'ID de negocio que agrupa todas las versiones (ej: PURCHASE_REQUEST).';
COMMENT ON COLUMN process_definitions.name IS 'Nombre descriptivo de esta versión (ej: Solicitud de Compra v2).';
COMMENT ON COLUMN process_definitions.description IS 'Descripción en lenguaje natural del propósito del proceso.';
COMMENT ON COLUMN process_definitions.version IS 'Número de versión del diagrama.';
COMMENT ON COLUMN process_definitions.category IS 'Categoría para agrupar en la UI (ej: Finanzas, RRHH).';
COMMENT ON COLUMN process_definitions.status IS 'Estado del ciclo de vida (ACTIVE, INACTIVE, DRAFT).';
COMMENT ON COLUMN process_definitions.bpmn_process_id IS 'ID técnico del tag <bpmn:process> en el XML.';

-- Tabla de Elementos de Proceso: Cada "caja", "rombo" o "círculo" de un diagrama.
CREATE TABLE process_elements (
    id SERIAL PRIMARY KEY,
    process_def_id INT NOT NULL REFERENCES process_definitions(id) ON DELETE CASCADE,
    bpmn_element_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    type VARCHAR(100) NOT NULL,
    assigned_role_id INT REFERENCES roles(id),
    webhook_target TEXT,
    sla_definition JSONB
);
COMMENT ON TABLE process_elements IS 'Cada "caja", "rombo" o "círculo" (nodo) de un diagrama de proceso.';
COMMENT ON COLUMN process_elements.process_def_id IS 'FK a una versión de proceso específica.';
COMMENT ON COLUMN process_elements.bpmn_element_id IS 'ID técnico del elemento en el XML.';
COMMENT ON COLUMN process_elements.name IS 'La etiqueta visible del elemento.';
COMMENT ON COLUMN process_elements.description IS 'Descripción detallada del propósito del elemento para la UI.';
COMMENT ON COLUMN process_elements.type IS 'Tipo de nodo BPMN (USER_TASK, SERVICE_TASK, EXCLUSIVE_GATEWAY, etc.).';
COMMENT ON COLUMN process_elements.assigned_role_id IS 'Rol responsable de la tarea.';
COMMENT ON COLUMN process_elements.webhook_target IS 'URL del webhook de n8n para las ServiceTask.';
COMMENT ON COLUMN process_elements.sla_definition IS 'JSON con la regla de vencimiento (ej: {"type": "BUSINESS_HOURS", "value": 48}).';

-- Tabla de Secuencias de Proceso: Las "flechas" que conectan los elementos.
CREATE TABLE process_sequences (
    id SERIAL PRIMARY KEY,
    process_def_id INT NOT NULL REFERENCES process_definitions(id) ON DELETE CASCADE,
    source_element_bpmn_id VARCHAR(255) NOT NULL,
    target_element_bpmn_id VARCHAR(255) NOT NULL,
    condition_expression TEXT
);
COMMENT ON TABLE process_sequences IS 'Las "flechas" que conectan los elementos, definiendo el flujo.';
COMMENT ON COLUMN process_sequences.process_def_id IS 'FK a una versión de proceso.';
COMMENT ON COLUMN process_sequences.source_element_bpmn_id IS 'El bpmn_element_id del nodo de origen.';
COMMENT ON COLUMN process_sequences.target_element_bpmn_id IS 'El bpmn_element_id del nodo de destino.';
COMMENT ON COLUMN process_sequences.condition_expression IS 'Condición lógica (ej: ''${business_data.amount > 5000}'').';

-- Tabla de Definiciones de Campos: La "biblioteca" central de todos los campos de formulario.
CREATE TABLE field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    validations JSONB
);
COMMENT ON TABLE field_definitions IS 'La "biblioteca" central y reutilizable de todos los campos de formulario posibles.';
COMMENT ON COLUMN field_definitions.name IS 'Nombre técnico del campo (ej: purchaseAmount).';
COMMENT ON COLUMN field_definitions.label IS 'Etiqueta visible para el usuario.';
COMMENT ON COLUMN field_definitions.field_type IS 'Tipo de input (TEXT, NUMBER, SELECT, GRID, FILE, etc.).';
COMMENT ON COLUMN field_definitions.validations IS 'Reglas y estructura universal del campo (ej: ''options'' para SELECT, ''columns'' para GRID).';

-- Tabla de Vínculos de Formulario: Ensambla los formularios uniendo tareas con campos.
CREATE TABLE element_form_links (
    id SERIAL PRIMARY KEY,
    element_id INT NOT NULL REFERENCES process_elements(id) ON DELETE CASCADE,
    field_def_id INT NOT NULL REFERENCES field_definitions(id),
    display_order INT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    is_readonly BOOLEAN DEFAULT FALSE,
    contextual_validations JSONB
);
COMMENT ON TABLE element_form_links IS 'Ensambla los formularios uniendo tareas con campos y definiendo su comportamiento.';
COMMENT ON COLUMN element_form_links.element_id IS 'FK a la tarea (USER_TASK).';
COMMENT ON COLUMN element_form_links.field_def_id IS 'FK al campo de la biblioteca.';
COMMENT ON COLUMN element_form_links.display_order IS 'Orden del campo en el formulario.';
COMMENT ON COLUMN element_form_links.is_required IS '¿Es obligatorio en el contexto de esta tarea?';
COMMENT ON COLUMN element_form_links.is_readonly IS '¿Es de solo lectura en el contexto de esta tarea?';
COMMENT ON COLUMN element_form_links.contextual_validations IS 'Reglas que solo aplican aquí (ej: ''{"minRows": 2}'').';


-- =============================================================================
-- SECCIÓN 2: TABLAS TRANSACCIONALES (DE INSTANCIAS)
-- =============================================================================

-- Tabla de Instancias de Proceso: Registra cada ejecución o "caso" de un proceso.
CREATE TABLE process_instances (
    id SERIAL PRIMARY KEY,
    process_def_id INT NOT NULL REFERENCES process_definitions(id),
    status VARCHAR(50) NOT NULL,
    business_data JSONB,
    started_by_user_id INT NOT NULL REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE process_instances IS 'Registra cada ejecución o "caso" de un proceso.';
COMMENT ON COLUMN process_instances.process_def_id IS 'Versión de la definición que se está ejecutando.';
COMMENT ON COLUMN process_instances.status IS 'Estado actual (RUNNING, COMPLETED, FAILED, CANCELLED).';
COMMENT ON COLUMN process_instances.business_data IS 'Objeto JSON con todos los datos de negocio de esta instancia.';
COMMENT ON COLUMN process_instances.started_by_user_id IS 'Usuario que inició el proceso.';
COMMENT ON COLUMN process_instances.start_time IS 'Fecha de inicio.';
COMMENT ON COLUMN process_instances.end_time IS 'Fecha de finalización.';

-- Tabla de Instancias de Tareas: Alimenta la bandeja de entrada de los usuarios.
CREATE TABLE task_instances (
    id SERIAL PRIMARY KEY,
    process_instance_id INT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    element_def_id INT NOT NULL REFERENCES process_elements(id),
    status VARCHAR(50) NOT NULL,
    assigned_to_role_id INT REFERENCES roles(id),
    assigned_to_user_id INT REFERENCES users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_by_user_id INT REFERENCES users(id),
    completion_time TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE task_instances IS 'Registra cada tarea generada dentro de una instancia de proceso. Alimenta la bandeja de entrada.';
COMMENT ON COLUMN task_instances.process_instance_id IS 'FK a la instancia de proceso a la que pertenece.';
COMMENT ON COLUMN task_instances.element_def_id IS 'FK a la definición del elemento (la tarea) en el diagrama.';
COMMENT ON COLUMN task_instances.status IS 'Estado de la tarea (PENDING, COMPLETED).';
COMMENT ON COLUMN task_instances.assigned_to_role_id IS 'Rol al que está asignada la tarea.';
COMMENT ON COLUMN task_instances.assigned_to_user_id IS '(Opcional) Usuario específico asignado.';
COMMENT ON COLUMN task_instances.due_date IS '(Opcional) Fecha de vencimiento calculada.';
COMMENT ON COLUMN task_instances.created_at IS 'Fecha de creación de la tarea.';
COMMENT ON COLUMN task_instances.completed_by_user_id IS '(Opcional) Usuario que completó la tarea.';
COMMENT ON COLUMN task_instances.completion_time IS '(Opcional) Fecha de completitud.';

-- Tabla de Instancias de Documentos: Referencia a los archivos en S3 y sus metadatos.
CREATE TABLE document_instances (
    id SERIAL PRIMARY KEY,
    process_instance_id INT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    task_instance_id INT REFERENCES task_instances(id),
    field_def_id INT NOT NULL REFERENCES field_definitions(id),
    storage_key TEXT UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    uploaded_by_user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE document_instances IS 'Referencia a los archivos en S3 y sus metadatos.';
COMMENT ON COLUMN document_instances.process_instance_id IS 'A qué instancia de proceso pertenece el documento.';
COMMENT ON COLUMN document_instances.task_instance_id IS '(Opcional) En qué tarea específica se cargó el documento.';
COMMENT ON COLUMN document_instances.field_def_id IS 'Qué tipo de documento es (ej: Documento de Identidad).';
COMMENT ON COLUMN document_instances.storage_key IS 'La ruta/clave única del objeto en S3.';
COMMENT ON COLUMN document_instances.file_name IS 'Nombre original del archivo subido por el usuario.';
COMMENT ON COLUMN document_instances.version IS 'Versión del documento (para reemplazos).';
COMMENT ON COLUMN document_instances.status IS 'Estado (ACTIVE, SUPERSEDED, DELETED).';
COMMENT ON COLUMN document_instances.uploaded_by_user_id IS 'Quién subió el archivo.';
COMMENT ON COLUMN document_instances.created_at IS 'Fecha y hora de carga.';

-- Tabla de Asignaciones de Caso: Asigna un usuario específico a un rol para un caso particular.
CREATE TABLE case_assignments (
    id SERIAL PRIMARY KEY,
    process_instance_id INT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id),
    assigned_user_id INT NOT NULL REFERENCES users(id),
    UNIQUE (process_instance_id, role_id)
);
COMMENT ON TABLE case_assignments IS 'Asigna un usuario específico a un rol para una única instancia de proceso.';
COMMENT ON COLUMN case_assignments.process_instance_id IS 'FK a la instancia de proceso específica.';
COMMENT ON COLUMN case_assignments.role_id IS 'FK al rol que se está asignando.';
COMMENT ON COLUMN case_assignments.assigned_user_id IS 'FK al usuario que asumirá ese rol para este caso.';


-- =============================================================================
-- SECCIÓN 3: ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- =============================================================================
CREATE INDEX idx_process_instances_status ON process_instances(status);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_task_instances_assigned_role ON task_instances(assigned_to_role_id);
CREATE INDEX idx_task_instances_assigned_user ON task_instances(assigned_to_user_id);
CREATE INDEX idx_document_instances_process ON document_instances(process_instance_id);

-- Fin del script

ALTER TABLE task_instances
ADD COLUMN completion_payload JSONB;
COMMENT ON COLUMN task_instances.completion_payload IS 'Objeto JSON que almacena los datos exactos del formulario y la acción enviada por el usuario al completar esta tarea. Sirve como un log inmutable.';


ALTER TABLE process_definitions
ADD COLUMN bpmn_xml TEXT;

COMMENT ON COLUMN process_definitions.bpmn_xml IS 'El contenido completo del archivo XML BPMN 2.0 que define la estructura visual del proceso.';


