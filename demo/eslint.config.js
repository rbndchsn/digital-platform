import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'src/routeTree.gen.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // TanStack file routes export a `Route` object next to the component by design.
    files: ['src/routes/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Pages and components must go through the api layer, never the mock store (plan_v1 §0.2).
    files: ['src/features/**', 'src/routes/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/mock/*', '**/mock/*'], message: 'Import from @/api instead of the mock store.' }] }],
    },
  },
)
