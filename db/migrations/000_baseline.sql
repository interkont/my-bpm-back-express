-- =============================================================================
-- 000_baseline.sql - Esquema vigente de Flowify BPM (PostgreSQL 17)
--
-- SOLO DOCUMENTACION Y BASE DE PRUEBAS. MUST NOT aplicarse a la base de demo,
-- cuyo esquema ya es este. Generado con:
--   pg_dump --schema-only --no-owner --no-privileges --schema=public
-- contra la base de demo (solo lectura), 2026-11-05. Idempotente:
-- CREATE ... IF NOT EXISTS y ADD CONSTRAINT envuelto en bloques DO que ignoran
-- duplicados. Incluye columnas fuera del modelo Sequelize
-- (process_elements.actions, process_elements.case_assignment_config; EXC-10),
-- las unicas FKs reales (user_roles x2, decision_logs) y el CHECK de
-- users.system_role (blueprint 4.2).
-- =============================================================================
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: case_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.case_assignments (
    id integer NOT NULL,
    process_instance_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_user_id integer NOT NULL
);

--
-- Name: case_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.case_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: case_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_assignments_id_seq OWNED BY public.case_assignments.id;

--
-- Name: decision_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.decision_logs (
    id integer NOT NULL,
    business_process_key character varying(100) NOT NULL,
    current_bpmn_element_id character varying(255) NOT NULL,
    request_payload jsonb NOT NULL,
    response_payload jsonb,
    error_message text,
    executed_by_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: TABLE decision_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.decision_logs IS 'Stores an audit trail of all requests made to the decision engine service.';

--
-- Name: COLUMN decision_logs.business_process_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.decision_logs.business_process_key IS 'The business key of the process being queried.';

--
-- Name: COLUMN decision_logs.current_bpmn_element_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.decision_logs.current_bpmn_element_id IS 'The starting BPMN element ID for the decision query.';

--
-- Name: decision_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.decision_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: decision_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.decision_logs_id_seq OWNED BY public.decision_logs.id;

--
-- Name: document_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.document_instances (
    id integer NOT NULL,
    process_instance_id integer NOT NULL,
    task_instance_id integer,
    field_def_id integer NOT NULL,
    storage_key text NOT NULL,
    file_name character varying(255) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    uploaded_by_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: document_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.document_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: document_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_instances_id_seq OWNED BY public.document_instances.id;

--
-- Name: element_form_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.element_form_links (
    id integer NOT NULL,
    element_id integer NOT NULL,
    field_def_id integer NOT NULL,
    display_order integer NOT NULL,
    is_required boolean DEFAULT false,
    is_readonly boolean DEFAULT false,
    contextual_validations jsonb
);

--
-- Name: element_form_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.element_form_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: element_form_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.element_form_links_id_seq OWNED BY public.element_form_links.id;

--
-- Name: field_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.field_definitions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    validations jsonb
);

--
-- Name: field_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.field_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: field_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.field_definitions_id_seq OWNED BY public.field_definitions.id;

--
-- Name: process_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.process_definitions (
    id integer NOT NULL,
    business_process_key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    version integer NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    bpmn_process_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bpmn_xml text
);

--
-- Name: process_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.process_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: process_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_definitions_id_seq OWNED BY public.process_definitions.id;

--
-- Name: process_elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.process_elements (
    id integer NOT NULL,
    process_def_id integer NOT NULL,
    bpmn_element_id character varying(255) NOT NULL,
    name character varying(255),
    description text,
    type character varying(100) NOT NULL,
    assigned_role_id integer,
    webhook_target text,
    sla_definition jsonb,
    actions jsonb,
    case_assignment_config jsonb
);

--
-- Name: COLUMN process_elements.case_assignment_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.process_elements.case_assignment_config IS 'Configuración para la funcionalidad de Asignación de Casos (ej: { "isCaseAssignment": true, "assignableRoles": [1, 5] }).';

--
-- Name: process_elements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.process_elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: process_elements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_elements_id_seq OWNED BY public.process_elements.id;

--
-- Name: process_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.process_instances (
    id integer NOT NULL,
    process_def_id integer NOT NULL,
    status character varying(50) NOT NULL,
    business_data jsonb,
    started_by_user_id integer NOT NULL,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp with time zone,
    description text
);

--
-- Name: COLUMN process_instances.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.process_instances.description IS 'Descripción en lenguaje natural de esta instancia o caso específico.';

--
-- Name: process_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.process_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: process_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_instances_id_seq OWNED BY public.process_instances.id;

--
-- Name: process_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.process_sequences (
    id integer NOT NULL,
    process_def_id integer NOT NULL,
    source_element_bpmn_id character varying(255) NOT NULL,
    target_element_bpmn_id character varying(255) NOT NULL,
    condition_expression text
);

--
-- Name: process_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.process_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: process_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_sequences_id_seq OWNED BY public.process_sequences.id;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(100) NOT NULL
);

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

--
-- Name: system_role_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.system_role_modules (
    id integer NOT NULL,
    system_role character varying(50) NOT NULL,
    module_name character varying(255) NOT NULL
);

--
-- Name: system_role_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.system_role_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: system_role_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_role_modules_id_seq OWNED BY public.system_role_modules.id;

--
-- Name: task_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_instances (
    id integer NOT NULL,
    process_instance_id integer NOT NULL,
    element_def_id integer NOT NULL,
    status character varying(50) NOT NULL,
    assigned_to_role_id integer,
    assigned_to_user_id integer,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_by_user_id integer,
    completion_time timestamp with time zone,
    completion_payload jsonb,
    comments text
);

--
-- Name: COLUMN task_instances.comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_instances.comments IS 'Comentarios opcionales añadidos por el usuario al completar la tarea.';

--
-- Name: task_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.task_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: task_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_instances_id_seq OWNED BY public.task_instances.id;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'Tabla de unión para la relación muchos a muchos entre usuarios y roles.';

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    system_role character varying(50) DEFAULT 'USER'::character varying NOT NULL,
    CONSTRAINT users_system_role_check CHECK (((system_role)::text = ANY ((ARRAY['ADMIN'::character varying, 'USER'::character varying])::text[])))
);

--
-- Name: COLUMN users.system_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.system_role IS 'Define el rol del usuario en el sistema (ADMIN, USER), independiente de sus roles de negocio.';

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

--
-- Name: case_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_assignments ALTER COLUMN id SET DEFAULT nextval('public.case_assignments_id_seq'::regclass);

--
-- Name: decision_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_logs ALTER COLUMN id SET DEFAULT nextval('public.decision_logs_id_seq'::regclass);

--
-- Name: document_instances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_instances ALTER COLUMN id SET DEFAULT nextval('public.document_instances_id_seq'::regclass);

--
-- Name: element_form_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_form_links ALTER COLUMN id SET DEFAULT nextval('public.element_form_links_id_seq'::regclass);

--
-- Name: field_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_definitions ALTER COLUMN id SET DEFAULT nextval('public.field_definitions_id_seq'::regclass);

--
-- Name: process_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_definitions ALTER COLUMN id SET DEFAULT nextval('public.process_definitions_id_seq'::regclass);

--
-- Name: process_elements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_elements ALTER COLUMN id SET DEFAULT nextval('public.process_elements_id_seq'::regclass);

--
-- Name: process_instances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_instances ALTER COLUMN id SET DEFAULT nextval('public.process_instances_id_seq'::regclass);

--
-- Name: process_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_sequences ALTER COLUMN id SET DEFAULT nextval('public.process_sequences_id_seq'::regclass);

--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);

--
-- Name: system_role_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_role_modules ALTER COLUMN id SET DEFAULT nextval('public.system_role_modules_id_seq'::regclass);

--
-- Name: task_instances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instances ALTER COLUMN id SET DEFAULT nextval('public.task_instances_id_seq'::regclass);

--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

--
-- Name: case_assignments case_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.case_assignments
    ADD CONSTRAINT case_assignments_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: decision_logs decision_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.decision_logs
    ADD CONSTRAINT decision_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: document_instances document_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.document_instances
    ADD CONSTRAINT document_instances_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: element_form_links element_form_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.element_form_links
    ADD CONSTRAINT element_form_links_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: field_definitions field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT field_definitions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: process_definitions process_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.process_definitions
    ADD CONSTRAINT process_definitions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: process_elements process_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.process_elements
    ADD CONSTRAINT process_elements_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: process_instances process_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.process_instances
    ADD CONSTRAINT process_instances_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: process_sequences process_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.process_sequences
    ADD CONSTRAINT process_sequences_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: system_role_modules system_role_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.system_role_modules
    ADD CONSTRAINT system_role_modules_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: system_role_modules system_role_modules_system_role_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.system_role_modules
    ADD CONSTRAINT system_role_modules_system_role_module_name_key UNIQUE (system_role, module_name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: task_instances task_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.task_instances
    ADD CONSTRAINT task_instances_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: case_assignments_process_instance_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS case_assignments_process_instance_id_role_id_key ON public.case_assignments USING btree (process_instance_id, role_id);

--
-- Name: document_instances_process_instance_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS document_instances_process_instance_id_idx ON public.document_instances USING btree (process_instance_id);

--
-- Name: document_instances_storage_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS document_instances_storage_key_key ON public.document_instances USING btree (storage_key);

--
-- Name: field_definitions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS field_definitions_name_key ON public.field_definitions USING btree (name);

--
-- Name: idx_decision_logs_bpmn_element_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_decision_logs_bpmn_element_id ON public.decision_logs USING btree (current_bpmn_element_id);

--
-- Name: idx_decision_logs_business_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_decision_logs_business_key ON public.decision_logs USING btree (business_process_key);

--
-- Name: idx_decision_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_decision_logs_user_id ON public.decision_logs USING btree (executed_by_user_id);

--
-- Name: process_definitions_business_process_key_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS process_definitions_business_process_key_version_key ON public.process_definitions USING btree (business_process_key, version);

--
-- Name: process_instances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS process_instances_status_idx ON public.process_instances USING btree (status);

--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS roles_name_key ON public.roles USING btree (name);

--
-- Name: task_instances_assigned_to_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS task_instances_assigned_to_role_id_idx ON public.task_instances USING btree (assigned_to_role_id);

--
-- Name: task_instances_assigned_to_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS task_instances_assigned_to_user_id_idx ON public.task_instances USING btree (assigned_to_user_id);

--
-- Name: task_instances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS task_instances_status_idx ON public.task_instances USING btree (status);

--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (email);

--
-- Name: decision_logs fk_executed_by_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.decision_logs
    ADD CONSTRAINT fk_executed_by_user FOREIGN KEY (executed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
  ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- PostgreSQL database dump complete
--

-- -----------------------------------------------------------------------------
-- ROLLBACK (solo base de pruebas; orden inverso de dependencias)
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS public.user_roles CASCADE;
-- DROP TABLE IF EXISTS public.decision_logs CASCADE;
-- DROP TABLE IF EXISTS public.case_assignments CASCADE;
-- DROP TABLE IF EXISTS public.document_instances CASCADE;
-- DROP TABLE IF EXISTS public.element_form_links CASCADE;
-- DROP TABLE IF EXISTS public.field_definitions CASCADE;
-- DROP TABLE IF EXISTS public.process_definitions CASCADE;
-- DROP TABLE IF EXISTS public.process_elements CASCADE;
-- DROP TABLE IF EXISTS public.process_instances CASCADE;
-- DROP TABLE IF EXISTS public.process_sequences CASCADE;
-- DROP TABLE IF EXISTS public.system_role_modules CASCADE;
-- DROP TABLE IF EXISTS public.task_instances CASCADE;
-- DROP TABLE IF EXISTS public.roles CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
