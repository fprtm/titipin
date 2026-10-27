import baseConfig from './base.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...baseConfig, {
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
});
