import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export function createBaseConfig(options = {}) {
  return defineConfig([
    globalIgnores(['dist', 'coverage']),
    {
      files: ['**/*.ts'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
      ],
      languageOptions: {
        ecmaVersion: 2020,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        'prefer-const': 'warn',
        'no-useless-escape': 'warn',
        ...(options.rules || {}),
      },
    },
    {
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-require-imports': 'warn',
        'prefer-const': 'warn',
      },
    },
    {
      files: ['**/__tests__/helpers/**'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ])
}
