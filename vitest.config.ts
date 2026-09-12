import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * SIN `resolve.alias`, y por lo mismo que `tsconfig.json` no tiene `paths`.
 *
 * Los paquetes se importan entre si por ruta relativa, que es lo unico que resuelve igual aqui y
 * en el consumidor. Un alias los haria resolver aqui por una via que ningun consumidor usa — y
 * entonces las pruebas verdes de este repositorio dejarian de decir nada sobre si el paquete
 * funciona enchufado (#4).
 */
export default defineConfig({
  plugins: [react()],
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
