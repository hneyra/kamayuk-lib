import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { PROHIBICIONES } from './paquetes/verificaciones/prohibiciones.mjs';

/**
 * El lint de las librerias comunes.
 *
 * Mismo criterio que en el backend (ARQ-04) y que en `infra/`: **toda prohibicion que pueda
 * expresarse como verificacion automatica se expresa asi.** Una prohibicion que solo vive en un
 * documento se incumple en seis meses, y nadie se entera hasta que hay que arreglar veinte sitios.
 *
 * <h2>Por que las nueve viven aqui, y no en cada sistema (#4)</h2>
 *
 * Porque el codigo de estos paquetes **entra al bundle de los cuatro sistemas y no lo lintaba
 * nadie**: `rentas/frontend/eslint.config.js:51` ignora `node_modules` entero, que es donde el
 * `link:` deja los paquetes. El resultado medido era un hueco de cobertura, no un fallo: codigo
 * que formatea dinero y compone peticiones, sin las cuatro prohibiciones de importes (regla 1,
 * RNF-055), sin la del `municipalidadId` (regla 2) y sin la del token en almacenamiento. Sin rojo
 * en ningun lado, y sin que fuera a haberlo.
 *
 * Las prohibiciones NO estan aqui: estan en `paquetes/verificaciones/prohibiciones.mjs`, porque
 * las lee tambien `reglas-de-eslint.test.ts`, que exige de cada una su muestra que la viola.
 * **Una regla que no puede fallar no protege nada.**
 */

/** Las prohibiciones que valen en todo el arbol. */
const EN_TODAS_PARTES = PROHIBICIONES.map(({ selector, message }) => ({ selector, message }));

/**
 * Las excepciones, una por directorio exceptuado.
 *
 * Se derivan de los `salvo` en vez de escribirse: una excepcion escrita a mano se olvida de la
 * prohibicion que se anadio ayer, y la deja apagada en un directorio entero.
 */
const EXCEPCIONES = [...new Set(PROHIBICIONES.flatMap((p) => p.salvo ?? []))];

/** @type {import('eslint').Linter.Config[]} */
const bloquesDeExcepcion = EXCEPCIONES.map((directorio) => ({
  files: [`${directorio}**/*.{ts,tsx}`],
  rules: {
    'no-restricted-syntax': [
      'error',
      ...PROHIBICIONES.filter((p) => !(p.salvo ?? []).includes(directorio)).map(
        ({ selector, message }) => ({ selector, message }),
      ),
    ],
  },
}));

export default tseslint.config(
  {
    // Las muestras violan las reglas A PROPOSITO: se lintan desde la prueba, con su texto y una
    // ruta sintetica. Aqui no tienen nada que hacer.
    ignores: ['node_modules/**', 'dist/**', 'paquetes/verificaciones/muestras/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'no-restricted-syntax': ['error', ...EN_TODAS_PARTES],
    },
  },
  ...bloquesDeExcepcion,
  {
    // En las pruebas la prohibicion se apaga, y no por comodidad: varias NOMBRAN lo que
    // verifican —un `localStorage.setItem('token', …)` que tiene que salir rojo, un importe
    // convertido a numero— y con la regla encendida el arnes no se podria escribir.
    //
    // `verificaciones/*.ts` y no `**`: las muestras cuelgan de `muestras/`, que ya esta en
    // `ignores`, y ensanchar esto a `**` apagaria la regla en cualquier archivo que alguien
    // meta ahi dentro manana.
    files: ['**/*.test.{ts,tsx}', 'paquetes/verificaciones/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
