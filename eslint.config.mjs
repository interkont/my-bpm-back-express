import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';

// Reglas que codifican la constitution v2.0.0 (research R-06).
export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/**/*.js', 'public/**', '**/*.mjs', 'jest.config.js'],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'import-x': importX },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Usar uniones `as const` (AP-22).' },
      ],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'import-x/no-cycle': 'error',
    },
  },
  {
    files: ['src/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/models', '**/models/*'], message: 'Los controllers no importan modelos (Principio I).' },
          ],
          paths: [
            { name: 'sequelize', message: 'Los controllers no usan Sequelize (Principio I).' },
            { name: 'bcryptjs', message: 'El hash va en el servicio (AP-04).' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../*', '../../*'], message: 'src/domain no depende de otras capas (Principio I).' },
          ],
          paths: [
            { name: 'sequelize', message: 'src/domain no depende de Sequelize.' },
            { name: 'express', message: 'src/domain no depende de Express.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/api/engine/graph.ts', 'src/api/engine/semantics.ts', 'src/api/engine/context.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/models', '**/models/*'], message: 'El núcleo del motor es puro (Principio I).' }],
          paths: [{ name: 'sequelize', message: 'El núcleo del motor es puro (Principio I).' }],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  prettier,
);
