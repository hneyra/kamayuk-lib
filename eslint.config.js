import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { PROHIBICIONES, PUERTA_DE_IDENTIDAD } from './paquetes/verificaciones/prohibiciones.mjs';

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

/**
 * `fetch` nombrado de cualquier forma: llamado, leido de un objeto (`globalThis.fetch`,
 * `window['fetch']`), prestado (`fetch.call`), con alias o como tipo (`typeof fetch`). Solo se usa
 * dentro de la puerta de identidad, fuera de `identidad.ts` (#122).
 */
const FETCH_NOMBRADO_DE_CUALQUIER_FORMA = "Identifier[name='fetch'], Literal[value='fetch']";

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
    // ruta sintetica —salvo `switch-sin-agotar.ts`, que necesita tipos y se lintea en su ruta de
    // verdad, con `ignore: false` (#111)—. Aqui no tienen nada que hacer.
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
    // **DENTRO DE LA PUERTA, `fetch` VIVE EN UN SOLO ARCHIVO** (#122).
    //
    // La excepcion de `fetch-fuera-del-cliente` es un DIRECTORIO —`PUERTA_DE_IDENTIDAD`,
    // `paquetes/sesion/`— y no cambia: cada consumidor la situa en su `SALVO_EN_ESTE_ARBOL`, y
    // tocar su valor es un cambio coordinado en cinco repositorios. Pero el sitio legitimo es UN
    // archivo, `identidad.ts`, con la sonda y el canje; y desde que la puerta se partio en piezas
    // (`pkce.ts`, `rebote.ts`), un `fetch` en cualquiera de ellas pasaba el lint entero. Medido: un
    // `fetch` anadido a `rebote.ts` daba `eslint` RC=0.
    //
    // Este bloque le devuelve la prohibicion al resto del directorio, en este arbol y solo en el:
    // la lista de excepciones de `PROHIBICIONES` es la misma, y ningun consumidor ve este config.
    // Va DESPUES de las excepciones —en el config plano, el ultimo `no-restricted-syntax` gana— y
    // ANTES del bloque de las pruebas, que la apaga.
    //
    // **Y aqui la prohibicion mira MAS que el nombre desnudo.** Su selector,
    // `CallExpression[callee.name='fetch']`, solo ve `fetch(...)`: medido, un
    // `globalThis.fetch('/x')` al final de `rebote.ts` daba `eslint` sin salida y RC=0, y lo mismo
    // `window.fetch`, `fetch.call` o un alias. Dentro de la puerta ninguna pieza tiene por que NOMBRAR
    // `fetch` —ni para llamarlo ni para recibirlo como parametro con `typeof fetch`, que es el
    // puerto que el issue descarta—, asi que aqui se prohibe el nombre entero. Fuera de la puerta
    // el selector es el de `PROHIBICIONES`, que es el que derivan los consumidores y no se toca aqui.
    files: [`${PUERTA_DE_IDENTIDAD}**/*.{ts,tsx}`],
    ignores: [`${PUERTA_DE_IDENTIDAD}identidad.ts`],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...PROHIBICIONES.map(({ clave, selector, message }) => ({
          selector: clave === 'fetch-fuera-del-cliente' ? FETCH_NOMBRADO_DE_CUALQUIER_FORMA : selector,
          message,
        })),
      ],
    },
  },
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
    // rojo con el `tsconfig` de cada uno. Eso lo vigila `verificaciones/la-exhaustividad-viaja.test.ts`,
    // que compila el interprete con las opciones minimas de un consumidor y un miembro de mas en cada
    // union; y que este bloque cubra los `.tsx` y no cuente un `default` como agotado lo vigila
    // `reglas-de-eslint.test.ts`.
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
