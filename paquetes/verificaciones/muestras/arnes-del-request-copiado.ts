/**
 * LA MUESTRA de `el-arnes-del-request-se-publica`. Viola la regla A PROPOSITO.
 *
 * Es el arnes del `Request` escrito a mano, tal cual estaba copiado en el `vitest.setup.ts` de
 * esta libreria y en el de otro sistema hasta #92 —sin su docblock, que es lo unico que se
 * recorta—. Si alguien "arregla" este archivo, la guarda se queda sin demostracion y sale roja
 * sola.
 *
 * Y lleva a proposito una linea de comentario que NOMBRA la asignacion sin hacerla, abajo: es lo
 * que demuestra que la guarda mira el codigo y no la prosa.
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

// Aqui abajo iba `globalThis.Request = RequestQueAceptaLaSenalDelDocumento;` cuando esto se
// copiaba a mano, y esta linea es comentario: no cuenta.
globalThis.Request = RequestQueAceptaLaSenalDelDocumento;
