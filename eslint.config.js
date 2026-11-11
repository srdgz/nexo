const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

module.exports = tseslint.config(
  {
    ignores: ['dist/', '.angular/', 'coverage/', 'node_modules/', 'docs/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strict,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'nx', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'nx', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: restrict([
      {
        regex: '^(@features/|(\\.\\.?/)+(.*/)?features/)',
        message: 'core no puede depender de features.',
      },
    ]),
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: restrict([
      {
        regex: '^(@features/|@core/|(\\.\\.?/)+(.*/)?(features|core)/)',
        message: 'shared no puede depender de core ni de features.',
      },
      { group: ['@supabase/*'], message: 'shared no conoce Supabase.' },
    ]),
  },
  {
    files: ['src/app/features/*/domain/**/*.ts'],
    rules: restrict([
      {
        group: ['@angular/*', 'rxjs', 'rxjs/*', '@supabase/*'],
        message: 'domain es TypeScript puro: sin Angular, RxJS ni Supabase.',
      },
      {
        group: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
        message: 'domain no depende de otras capas.',
      },
    ]),
  },
  {
    files: ['src/app/features/*/application/**/*.ts'],
    rules: restrict([
      { group: ['@supabase/*'], message: 'application usa puertos, no Supabase.' },
      {
        group: ['**/infrastructure/**', '**/presentation/**'],
        message: 'application solo depende de domain.',
      },
    ]),
  },
  {
    files: ['src/app/features/*/presentation/**/*.ts'],
    rules: restrict([
      { group: ['@supabase/*'], message: 'presentation no conoce Supabase.' },
      {
        group: ['**/infrastructure/**'],
        message: 'presentation usa casos de uso y stores de application.',
      },
    ]),
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
);
