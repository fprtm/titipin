import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './',
    fileParallelism: false,
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/titipin_db',
      JWT_SECRET: 'test_super_secret_jwt_key_at_least_32_characters_long',
      JWT_REFRESH_SECRET: 'test_super_secret_refresh_jwt_key_at_least_32_chars',
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
