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
            ? "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws:;"
            : "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self';";
          return html.replace('__CSP_PLACEHOLDER__', csp);
        }
      }
    ]
  }
});
