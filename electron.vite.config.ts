import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs'
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      react(),
      {
        name: 'html-csp-transform',
        transformIndexHtml(html, ctx) {
          const isDev = ctx.server !== undefined;
          const csp = isDev
            ? "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws:;"
            : "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self';";
          return html.replace('__CSP_PLACEHOLDER__', csp);
        }
      }
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('zustand')) {
                return 'vendor-react';
              }
              if (id.includes('@codemirror') || id.includes('@replit') || id.includes('@lezer')) {
                return 'vendor-codemirror';
              }
              if (id.includes('katex')) {
                return 'vendor-katex';
              }
              if (id.includes('force-graph')) {
                return 'vendor-graph';
              }
            }
            return undefined;
          }
        }
      }
    }
  }
});
