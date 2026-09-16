import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * La limpieza del DOM entre pruebas, A MANO.
 *
 * Testing Library la registra sola **solo si el ejecutor expone globales**, y aqui `globals` esta
 * en `false` a proposito: un `describe` que aparece de la nada no dice de donde sale, y el
 * compilador tampoco. El precio es este `afterEach`, y el precio de no pagarlo esta medido:
 * sin el, cada `render` se acumula en el mismo documento y `getByText` empieza a encontrar TRES
 * coincidencias de lo mismo. El rojo que sale habla de un selector ambiguo y no de que falte
 * limpiar, asi que manda a mirar la prueba en vez del arnes.
 */
afterEach(cleanup);

/**
 * EL `Request` DEL ARNES ACEPTA LA SENAL QUE CREA EL DOCUMENTO. Dos realms, y solo aqui.
 *
 * En un navegador hay UN realm: el `AbortSignal` que fabrica `new AbortController()` y el
 * `Request` que lo recibe son del mismo sitio. Bajo Vitest no: el `Request` es el de `undici`,
 * que viene dentro de Node, y el `AbortController`/`AbortSignal` globales son los que instala
 * jsdom al montar el documento.
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
 * **No es ruido.** Quien construye ese `Request` es `createClientSideRequest` de `react-router`,
 * en CADA navegacion del enrutador de datos: con Node 24 y sin esto, la navegacion muere ahi
 * dentro, el hash se queda como estaba y salen **21 pruebas rojas** de `paquetes/shell` mas
 * **1658 rechazos sin atender**. Lo que se rompe es el arnes, no el marco: en el navegador este
 * camino no existe.
 *
 * Se arregla donde esta la costura —el `Request` del arnes— y no tocando los globales del
 * documento: el nativo de Node ya no es alcanzable desde aqui (jsdom lo sustituyo, y ninguna
 * API publica lo devuelve), y ponerle a jsdom otro `AbortController` haria que su propio
 * `addEventListener(…, { signal })` rechazara la senal por el mismo motivo, al reves.
 *
 * La senal entra tal cual: `react-router` lee `request.signal` para cortar sus cargadores, y
 * tiene que recibir **la misma** que paso.
 */
const RequestDelEntorno = globalThis.Request;

class RequestQueAceptaLaSenalDelDocumento extends RequestDelEntorno {
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

globalThis.Request = RequestQueAceptaLaSenalDelDocumento;
