import tsParser from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**/*'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': pluginTs,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
