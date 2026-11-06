// Lectura única de NODE_ENV. Sin dependencias para que el logger pueda usarlo sin cargar la
// configuración validada (que puede fallar si faltan variables obligatorias).
export const nodeEnv: string = process.env.NODE_ENV ?? 'development';
export const isProduction: boolean = nodeEnv === 'production';
