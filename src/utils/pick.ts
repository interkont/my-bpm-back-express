import type { Attributes, Model } from 'sequelize';

// Copia solo las claves propias presentes y distintas de `undefined`
// (conserva la semántica de `set`/`create` de Sequelize).
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Partial<Pick<T, K>> => {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (Object.hasOwn(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

// Proyecciones `attributes` verificadas por el compilador contra el modelo.
export const attrs =
  <M extends Model>() =>
  (...keys: (keyof Attributes<M> & string)[]): string[] =>
    keys;
