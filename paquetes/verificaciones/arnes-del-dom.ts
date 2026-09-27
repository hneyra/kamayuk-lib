/**
 * **LOS CUATRO REMIENDOS QUE jsdom NECESITA PARA MONTAR RADIX, `cmdk` Y `sonner`, escritos una vez**
 * (#127).
 *
 * Hasta #127 estaban copiados, unas veinticinco lineas cada vez, en **ocho** archivos de prueba: las
 * cinco suites del armazon, `piezas-del-armazon.test.tsx` y dos del interprete. Cada copia decia «los
 * mismos de `armazon.test.tsx`», que es justo la frase con la que una copia se queda vieja.
 *
 * <h2>Los cuatro, y el rojo que sale sin cada uno</h2>
 *
 * Medidos en #11, #13 y #19, y escritos donde se midieron (`ui/shadcn/piezas-del-armazon.test.tsx`
 * y `ui/el-texto-propio-es-dato.test.tsx`):
 *
 *     ReferenceError: ResizeObserver is not defined      node_modules/cmdk/dist/index.mjs:1:8384
 *     TypeError: e.scrollIntoView is not a function      node_modules/cmdk/dist/index.mjs:1:4286
 *     TypeError: window.matchMedia is not a function      node_modules/sonner/dist/index.mjs:1072
 *
 * y `requestAnimationFrame` **sincrono**: jsdom lo mueve con un temporizador de 16 ms, el bucle de
 * cuadros de una capa no se detiene solo (#11), y una prueba quiere que la maquetacion ocurra YA.
 *
 * <h2>Por que es una funcion que se LLAMA, y no se monta al importar</h2>
 *
 * Al reves que `arnes-del-request.ts`, y a proposito. Aquel arregla un defecto del arnes que en el
 * navegador no existe, y olvidarse de montarlo deja el defecto sin que nada lo diga: por eso se
 * monta al importarlo. Estos cuatro, en cambio, **tapan ausencias de verdad**: `useEsEstrecho()` del
 * armazon pregunta por `matchMedia` antes de usarla porque puede no estar, y una prueba que quiera
 * medir esa rama necesita un jsdom SIN remendar. Si esto se montara al importar —o en
 * `vitest.setup.ts`— esa prueba ya no se podria escribir. Cada suite que lo necesita lo pide, en su
 * `beforeAll`, con una linea que se lee.
 *
 * <h2>Por que vive en `@kamayuk/verificaciones`</h2>
 *
 * Por lo mismo que el arnes del `Request`: es de las pruebas y no viaja a ningun navegador, y ahi
 * no lo barre `sin-suponer-un-sistema` ni `el-texto-visible-es-dato` como si fuera codigo de
 * produccion. **No se publica por `exports`**: quien monta el `Armazon` en su suite sufre los mismos
 * remiendos, y publicarlo es un paso siguiente que #127 deja dicho y no da.
 *
 * Se importa por ruta relativa (`../verificaciones/arnes-del-dom.ts`), como todo entre paquetes.
 */

/** La `MediaQueryList` de mentira: no casa nunca, que es la pantalla ancha de siempre. */
function consultaQueNoCasa(consulta: string): MediaQueryList {
  return {
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

/**
 * Pone los cuatro remiendos en el documento de la prueba. Se llama en el `beforeAll` de la suite que
 * los necesita; llamarlo dos veces no cambia nada.
 */
export function remendarElDom(): void {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.matchMedia = consultaQueNoCasa as typeof window.matchMedia;
}
