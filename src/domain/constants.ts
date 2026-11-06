// Valores de dominio: tuplas `as const` y uniones derivadas (data-model §2).

export const PROCESS_DEFINITION_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'DEPRECATED'] as const;
export type ProcessDefinitionStatus = (typeof PROCESS_DEFINITION_STATUS)[number];

export const PROCESS_INSTANCE_STATUS = ['RUNNING', 'COMPLETED'] as const;
export type ProcessInstanceStatus = (typeof PROCESS_INSTANCE_STATUS)[number];

export const TASK_STATUS = ['PENDING', 'COMPLETED'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const ELEMENT_TYPE = [
  'START_EVENT',
  'USER_TASK',
  'EXCLUSIVE_GATEWAY',
  'PARALLEL_GATEWAY',
  'END_EVENT',
  'AUTO_TASK',
] as const;
export type ElementType = (typeof ELEMENT_TYPE)[number];

export const SYSTEM_ROLE = ['ADMIN', 'USER'] as const;
export type SystemRole = (typeof SYSTEM_ROLE)[number];

export const USER_STATUS = ['ACTIVE'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const SAVE_ACTION = ['UPDATE_IN_PLACE', 'CREATE_NEW_VERSION'] as const;
export type SaveAction = (typeof SAVE_ACTION)[number];

export const DOCUMENT_STATUS = ['ACTIVE'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUS)[number];

export const isElementType = (value: unknown): value is ElementType =>
  ELEMENT_TYPE.some((type) => type === value);

export const isProcessDefinitionStatus = (value: unknown): value is ProcessDefinitionStatus =>
  PROCESS_DEFINITION_STATUS.some((status) => status === value);
