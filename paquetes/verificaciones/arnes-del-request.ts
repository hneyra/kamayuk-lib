/**
 * **EL `Request` DEL ARNES ACEPTA LA SENAL QUE CREA EL DOCUMENTO.** Dos realms, y solo en pruebas.
 *
 * Se enchufa con UNA linea en el `vitest.setup.ts` del que lo consume:
 *
 *     import '@kamayuk/verificaciones/arnes-del-request';
 *
 * ...y dentro de esta libreria, por ruta relativa, que es lo unico que resuelve igual a los dos
 * lados: `import './paquetes/verificaciones/arnes-del-request.ts';`.
 *
 * <h2>Que arregla</h2>
 *
 * En un navegador hay UN realm: el `AbortSignal` que fabrica `new AbortController()` y el
 * `Request` que lo recibe son del mismo sitio. Bajo Vitest no: el `Request` es el de `undici`, que
 * viene dentro de Node, y el `AbortController`/`AbortSignal` globales son los que instala jsdom al
 * montar el documento.
 *
 * Desde **Node 24** eso revienta, y esta medido en la fuente de `undici`:
 *
 *     webidl.util.MakeTypeAssertion = (I) => (O) => FunctionPrototypeSymbolHasInstance(I, O)
 *     webidl.is.AbortSignal = webidl.util.MakeTypeAssertion(AbortSignal)
 *
 * El `AbortSignal` de esa ultima linea se resuelve **cuando arranca Node**, antes de que exista
 * jsdom, asi que es el nativo; y `FunctionPrototypeSymbolHasInstance` es el `instanceof` de
 * siempre —recorre la cadena de prototipos— y **no se puede enganar** con un `Symbol.hasInstance`
 * propio. La senal de jsdom no esta en esa cadena, y `new Request(url, { signal })` lanza
 * `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal`.
 *
 * **No es ruido.** Quien construye ese `Request` es `createClientSideRequest` de `react-router`, en
 * CADA navegacion del enrutador de datos: con Node 24 y sin esto, la navegacion muere ahi dentro,
 * el hash se queda como estaba y salen **21 pruebas rojas** de `paquetes/shell` mas **1658
 * rechazos sin atender**. Lo que se rompe es el arnes, no el marco: en el navegador este camino no
 * existe, y por eso esto vive en `@kamayuk/verificaciones` —que no viaja a ningun navegador— y no
 * dentro de la pieza que se prueba.
 *
 * <h2>Por que el `Request`, y NO los globales del documento</h2>
 *
 * Es la pregunta que se contesta una vez y no se vuelve a hacer, asi que va aqui y no solo en el
 * PR. Los dos caminos que parecen mas naturales estan medidos y los dos son peores:
 *
 * · **Devolverle a jsdom el `AbortSignal` nativo de Node** no se puede: jsdom lo sustituyo al
 *   montar el documento y **ninguna API publica devuelve el de antes** —medido con
 *   `--expose-internals`—. No hay a que volver.
 * · **Darle a jsdom otro `AbortController`** —el nativo— rompe la otra mitad, al reves: el propio
 *   jsdom valida la senal de `addEventListener(…, { signal })` contra SU `AbortSignal`, y una
 *   senal nativa deja de valer ahi. Se cambia un realm cruzado por el contrario.
 *
 * La costura esta en el `Request`, que es el unico punto por el que la senal de un realm entra en
 * la comprobacion del otro. Aqui se quita del `init` antes de llamar a `super` —que es lo que
 * `undici` mira— y se vuelve a poner **tal cual** en la instancia: `react-router` lee
 * `request.signal` para cortar sus cargadores y tiene que recibir **la misma** senal que paso, no
 * una equivalente.
 *
 * <h2>Por que se monta al importarlo, y no llamando a una funcion</h2>
 *
 * Porque la segunda linea que el consumidor puede olvidar deja **exactamente el defecto de hoy sin
 * que nada lo diga**, que es la leccion ya pagada de #23 con el `@import` de los temas. Lo que se
 * publica es una linea, no un procedimiento. `montarElArnesDelRequest` se exporta igual, para
 * quien tenga que montarlo a mano —y para la prueba que lo desmonta—, y es idempotente.
 */

/**
 * El `Request` que habia antes de montar nada: el de `undici`, el que rechaza la senal del
 * documento. **Se exporta para que la prueba pueda ensenar el rojo de verdad** en vez de
 * describirlo; en codigo de produccion no tiene ningun uso.
 */
export const RequestDelEntorno = globalThis.Request;

/** El `Request` del arnes. Lo unico que cambia es por donde entra la senal. */
export class RequestQueAceptaLaSenalDelDocumento extends RequestDelEntorno {
  constructor(entrada: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal, ...sinLaSenal } = init;
      super(entrada, sinLaSenal);
      Object.defineProperty(this, 'signal', { value: signal, configurable: true });
    } else {
      super(entrada, init);
    }
  }
}

/**
 * Pone el `Request` del arnes en el global. Idempotente: montarlo dos veces no lo apila.
 *
 * **Este es el unico sitio del producto donde se escribe esta asignacion**, y lo vigila
 * `el-arnes-del-request-se-publica.test.ts` aqui y `el-arnes-del-request-no-se-copia.mjs` en el
 * arbol de quien lo consuma.
 */
export function montarElArnesDelRequest(): void {
  if (globalThis.Request === RequestQueAceptaLaSenalDelDocumento) return;
  globalThis.Request = RequestQueAceptaLaSenalDelDocumento;
}

/** Devuelve el global a lo que habia. La usa la prueba que ensena el rojo; nadie mas. */
export function desmontarElArnesDelRequest(): void {
  globalThis.Request = RequestDelEntorno;
}

montarElArnesDelRequest();
