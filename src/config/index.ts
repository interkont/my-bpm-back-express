import './env';
import nodeConfig from 'config';

export interface AppConfig {
  readonly App: { readonly port: number | string };
  readonly db: { readonly databaseUrl: string };
  readonly jwt: { readonly secret: string };
}

// Mismas claves que hoy; `jwt.secret` se lee vía `custom-environment-variables.json` (EXC-12).
// La validación de obligatorios llega en US5 (T089).
export const config: AppConfig = {
  App: nodeConfig.get<AppConfig['App']>('App'),
  db: nodeConfig.get<AppConfig['db']>('db'),
  jwt: nodeConfig.get<AppConfig['jwt']>('jwt'),
};
