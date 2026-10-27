import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared base ESLint 9 Flat Config
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      'dist/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'next-env.d.ts',
      '**/*.d.ts',
    ],
  },
);
