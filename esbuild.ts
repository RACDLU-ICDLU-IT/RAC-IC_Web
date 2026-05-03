import { build } from 'esbuild';

build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/server.cjs',
  external: ['express', 'vite', 'firebase', 'firebase-admin'],
  format: 'cjs',
}).catch(() => process.exit(1));
