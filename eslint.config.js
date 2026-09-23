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
    // **LA EXHAUSTIVIDAD, TAMBIEN EN EL LINT** (#111).
    //
    // Un `switch` sobre una union que se deja una rama sin `case` lo senala
    // `switch-exhaustiveness-check`, que necesita los tipos: por eso este bloque —y solo este— lleva
    // `projectService`. Cubre lo que el compilador no ve: un `switch` en una funcion que no devuelve
    // nada (el `pulsar` de `GrupoDeAcciones`) o que admite `undefined` (`motivoDeLaAccion`), donde la
    // rama que falta no es TS2366 sino un boton que no hace nada o una accion que «se puede pulsar».
    //
    // **NO es una prohibicion de `PROHIBICIONES`, y es a proposito**, por lo mismo que el XHR: cada
    // sistema le exige a cada clave su muestra en SU arbol, y una regla nueva ahi es un cambio
    // coordinado en cinco repositorios. Ademas no es `no-restricted-syntax` —es una regla con tipos—,
    // y `PROHIBICIONES` solo sabe llevar selectores. Vive en el config de este repositorio; su muestra
    // esta en `verificaciones/muestras/switch-sin-agotar.ts` y la juzga `reglas-de-eslint.test.ts`.
    //
    // A los consumidores los protege otra cosa, que si viaja: los tipos de retorno anotados y los
    // `never` de `CampoDelBloque`, `EstadoDeLaLectura`, `PiezaDeLaPantalla` y `claseDe`, que dan su
    // rojo con el `tsconfig` de cada uno.
    files: ['paquetes/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        // Explicitas, aunque sean las de omision: con `true`, un `default` daria por agotada una
        // union a la que le falta un `case`, que es justo lo que se viene a cazar.
        { considerDefaultExhaustiveForUnions: false, allowDefaultCaseForExhaustiveSwitch: true },
      ],
    },
  },
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
