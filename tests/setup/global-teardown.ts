// La base de pruebas se conserva entre ejecuciones (el reset se hace por archivo de test)
export default function globalTeardown(): Promise<void> {
  return Promise.resolve();
}
