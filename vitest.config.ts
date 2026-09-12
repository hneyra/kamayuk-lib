import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** La misma tabla que el `paths` de `tsconfig.json`. Si las dos dejan de decir lo mismo, la
 *  guarda `enlace-vivo` lo dice: el compilador resolveria un archivo y el ejecutor otro, que
 *  es la clase de desacuerdo que sale verde en `yarn typecheck` y rojo sólo en produccion. */
const paquete = (nombre: string) => fileURLToPath(new URL(`./paquetes/${nombre}/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kamayuk/api': paquete('api'),
      '@kamayuk/formato': paquete('formato'),
      '@kamayuk/sesion': paquete('sesion'),
      '@kamayuk/shell': paquete('shell'),
      '@kamayuk/ui': paquete('ui'),
      '@kamayuk/verificaciones': paquete('verificaciones'),
    },
  },
  test: {
    environment: 'jsdom',
    // Sin globales: un `describe` que aparece de la nada no dice de donde sale, y el
    // compilador tampoco. Aqui cada cosa se importa.
    globals: false,
    include: ['paquetes/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'paquetes/verificaciones/muestras/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
