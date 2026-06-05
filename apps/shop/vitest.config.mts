import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/shop',
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'shop',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/shop',
      provider: 'v8' as const,
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
}));
