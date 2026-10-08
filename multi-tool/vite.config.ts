import path from 'path';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT ?? '1420';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

// In dev the browser and the API run on different origins, so the client
// calls a relative /api path and Vite forwards it to the Node server.
// Absolute localhost URLs in VITE_RELAY_URL point at the viewer's own
// machine and fail with "Failed to fetch".
const apiProxyTarget = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8080';

const apiProxy = {
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
  },
};

function integrityManifestPlugin(): Plugin {
  return {
    name: 'multi-tool-integrity-manifest',
    apply: 'build',
    writeBundle(options) {
      const outputDir = options.dir ?? (options.file ? path.dirname(options.file) : null);
      if (!outputDir) {
        return;
      }

      const files: Record<string, string> = {};

      const collectFiles = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const absolutePath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            collectFiles(absolutePath);
            continue;
          }

          const fileName = path.relative(outputDir, absolutePath).split(path.sep).join('/');
          if (fileName !== 'integrity.json') {
            files[fileName] = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
          }
        }
      };

      collectFiles(outputDir);

      writeFileSync(
        path.join(outputDir, 'integrity.json'),
        JSON.stringify({ algorithm: 'sha256', files }, null, 2),
      );
    },
  };
}

function javascriptObfuscationPlugin(): Plugin {
  return {
    name: 'multi-tool-javascript-obfuscation',
    apply: 'build',
    async renderChunk(code) {
      const { default: JavaScriptObfuscator } = await import('javascript-obfuscator');
      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.2,
        deadCodeInjection: false,
        debugProtection: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
      });

      return {
        code: result.getObfuscatedCode(),
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    javascriptObfuscationPlugin(),
    integrityManifestPlugin(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: apiProxy,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: apiProxy,
  },
});
