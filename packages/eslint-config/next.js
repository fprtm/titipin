import baseConfig from './base.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...baseConfig, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
});
