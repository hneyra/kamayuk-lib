/**
 * El unico sitio de una interfaz del producto donde se llama a `fetch`.
 *
 * No es una preferencia de estilo: es lo que sostiene todo lo que viene encima. El token
 * (ADR-0030 §3), la clave de idempotencia de las escrituras —hoy `claveDeIdempotencia`, que sale
 * como `Idempotency-Key`— y el formato de error del backend —`problem+json`— se enchufan en un
 * sitio o en veinte. Un `fetch` suelto en una pantalla no se salta una convencion: se salta las
 * tres, y sobrevive a la integracion como un caso aparte que nadie recuerda. Por eso la excepcion
 * de la prohibicion `fetch-fuera-del-cliente` es este paquete y solo este.
 *
 * `solicitar()` y `solicitarRespuesta()` son **la misma peticion** —la compone `pedir()`, ahi
 * abajo— y se diferencian solo en lo que hacen con la respuesta: la primera la interpreta, la
 * segunda devuelve el estado, las cabeceras y los bytes tal cual, que es lo que necesita un cuerpo
 * firmado con una huella.
 *
 * La cuarta operacion, `subir()`, no cabe por `fetch`: necesita decir cuanto lleva enviado, y eso
 * solo lo da `XMLHttpRequest`. Vive en `subir.ts`, encerrada igual que esto, y el porque entero
 * esta en su cabecera.
 *
 * <h2>Lo que cambia al vivir en `kamayuk-lib` y no en un sistema</h2>
 *
 * Dos cosas, y las dos eran las unicas que lo ataban a uno:
 *
 *   · **El prefijo.** Estaba escrito `'/rentas/api/v1'`. Ahora es un parametro, porque ADR-0030
 *     §2 pone el sistema delante de la ruta precisamente para que **la ruta diga quien
 *     responde**: `catastro/api/v1/predios`, `caja/api/v1/cobros`. Un prefijo fijo aqui haria
 *     que los otros tres pidieran al sistema equivocado.
 *   · **El token.** Lo importaba de su vecino `identidad.ts`. Ahora entra como funcion, y ese
 *     giro es lo que rompe el ciclo: `@kamayuk/sesion` depende de este paquete por su clase de
 *     error, y si este dependiera de aquel por el token, los dos se necesitarian a la vez.
 *
 * <h2>El `municipalidadId` no se manda, y no se puede mandar (regla 2, ADR-0005)</h2>
 *
 * Esta funcion compone **la ruta que se le da y nada mas**: no anade parametros de consulta, no
 * anade cabeceras propias mas alla de las cuatro de abajo —y la cuarta, `Idempotency-Key`, solo
 * si quien llama declaro su clave—, y el cuerpo es el que le pasan. El inquilino sale del token y
 * lo fija el backend con `SET LOCAL`. Lo vigilan cuatro cosas a la vez: la prohibicion
 * `municipalidad-en-el-cliente` de ESLint, que ni siquiera deja escribir el identificador; una
 * prueba que espia lo que sale por el cable, para cada operacion; **`OpcionesDeSolicitud`, que no
 * tiene ninguna cabecera libre** —con un `cabeceras` cualquiera colaria el inquilino, o borraria
 * el `Authorization`—; y esta propiedad de que aqui no se compone nada.
 */

import { ErrorDeLaApi, NoEsUnDocumento, type CuerpoDeProblema } from './errores.ts';
import { subirElArchivo, type OpcionesDeSubida } from './subir.ts';

/**
 * El catalogo de errores se reexporta desde aqui, que es de donde se ha importado siempre.
 *
 * Se mudo a `errores.ts` cuando llego la subida, y solo por eso: `subir.ts` tiene que lanzar una
 * subclase de `ErrorDeLaApi` y este archivo tiene que importar `subir.ts`, que juntos son un ciclo
 * entre modulos que revienta al cargar el paquete. El motivo entero, con su rojo exacto, esta en
 * la cabecera de `errores.ts`.
 */
export { ArchivoRechazado, ErrorDeLaApi, NoEsUnDocumento } from './errores.ts';
export type { CuerpoDeProblema, MotivoDelRechazo, ParametroQueFalta } from './errores.ts';
export type { AvanceDeLaSubida, OpcionesDeSubida } from './subir.ts';

/**
 * Lo que se puede decir de una peticion. **No hay ninguna cabecera libre, y es a proposito.**
 *
 * Ni `cabeceras` ni `headers`: con una de las dos, cualquier pantalla podria sobrescribir
 * `Authorization` —mandando otro token, o ninguno— o colar el inquilino por una cabecera propia,
 * que es justo lo que la regla 2 (ADR-0005) impide en todas partes menos ahi. Lo que haga falta
 * mandar entra como opcion con nombre, como `claveDeIdempotencia`, y entonces se ve en el tipo
 * quien lo manda y cuando. Lo vigila una barrera de tipo en
 * `paquetes/verificaciones/tipos/barreras-de-tipos.tsx`.
 */
export interface OpcionesDeSolicitud {
  readonly metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly cuerpo?: unknown;
  readonly senal?: AbortSignal;
  /**
   * La clave con la que el backend reconoce un reintento de ESTA escritura, tal cual va a la
   * cabecera `Idempotency-Key`.
   *
   * Quien la genera y cuando se renueva lo decide la pantalla: aqui solo se manda. Sin ella la
   * cabecera **no sale** —mandar una vacia es peor que no mandar ninguna, ver abajo—, y con ella
   * sale igual en `solicitar` y en `solicitarRespuesta`.
   *
   * **En blanco lanza antes de llamar a `fetch`.** El backend trata una clave en blanco como si no
   * hubiera clave —`EmitirCertificado.java:151` de `rentas`—, asi que una cadena vacia por un
   * estado que todavia no cargo no da error en ningun sitio: da una segunda emision. El unico
   * momento en que eso se puede decir es antes de que salga la peticion.
   */
  readonly claveDeIdempotencia?: string;
}

/**
 * Las cabeceras que llegaron, **de solo lectura**: son un `Headers` sin `set`, `append` ni
 * `delete`.
 *
 * Un `Headers` a secas se puede modificar, y una pantalla que le escribiera encima estaria
 * cambiando lo que dice haber recibido. Aqui lo que importa es justo lo contrario: que lo que se
 * lee es lo que el servidor mando.
 */
export type CabecerasDeLaRespuesta = Omit<Headers, 'append' | 'delete' | 'set'>;

/**
 * La respuesta **tal como llego**: su estado, sus cabeceras y su cuerpo sin interpretar.
 *
 * Es lo que `solicitar()` no puede dar, porque termina en `respuesta.json()` y ahi se pierden las
 * tres cosas: el estado exacto, las cabeceras y —la que importa— **los bytes**. Un cuerpo que se
 * firma con una huella se verifica sobre lo que llego, no sobre lo que salga de volver a
 * serializar el objeto: `JSON.parse` y `JSON.stringify` no son inversas —`1.0` vuelve `1`, un
 * escape `ó` vuelve la letra, los espacios se van— y el resultado *casi siempre* coincide,
 * que es la peor de las propiedades.
 */
export interface RespuestaTalCual {
  readonly estado: number;
  readonly cabeceras: CabecerasDeLaRespuesta;
  /** `await respuesta.text()` tal cual: sin `JSON.parse`, sin `JSON.stringify` y sin `trim`. */
  readonly texto: string;
}

export interface OpcionesDeDescarga {
  /**
   * El nombre con el que se guarda **si el backend no propone uno**.
   *
   * Manda `Content-Disposition` cuando viene, y no este argumento: el nombre del archivo lo decide
   * quien lo genera, que es quien sabe si es un `.pdf`, un `.xls` o un `.rtf`. Una pantalla que
   * escribe `'resumen.pdf'` y pide el formato XLS guardaria una hoja de calculo con extension de
   * PDF.
   */
  readonly nombre?: string;
  readonly senal?: AbortSignal;
}

/** Lo que `descargar()` devuelve. Todavia no esta en el disco de nadie: eso es `entregarAlNavegador`. */
export interface DocumentoDescargado {
  /** De `Content-Disposition`; si no viene, el de las opciones; si tampoco, el ultimo tramo de la ruta. */
  readonly nombre: string;
  /** El `Content-Type` de la respuesta, tal cual llego. */
  readonly tipoDeMedio: string;
  readonly contenido: Blob;
}

/** Lo que cada sistema tiene que decir para tener cliente. */
export interface ConfiguracionDelCliente {
  /**
   * El prefijo de TODAS las rutas de ese sistema, empezando por `/` y sin barra final:
   * `'/rentas/api/v1'`, `'/catastro/api/v1'`, `'/caja/api/v1'`, `'/normativa/api/v1'`.
   *
   * ADR-0030 §2: el primer segmento enruta sin mirar mas, y —lo que importa mas— dice quien
   * responde.
   */
  readonly prefijo: string;
  /**
   * De donde sale el token de esta pestana, o `null` si todavia no hay.
   *
   * Entra como funcion y no como valor porque el token cambia dentro de la vida de la pagina:
   * un valor leido al construir el cliente seria `null` para siempre, y la primera peticion
   * despues del canje saldria sin cabecera.
   */
  readonly token: () => string | null;
}

export interface Cliente {
  solicitar<T>(ruta: string, opciones?: OpcionesDeSolicitud): Promise<T>;
  solicitarRespuesta(ruta: string, opciones?: OpcionesDeSolicitud): Promise<RespuestaTalCual>;
  descargar(ruta: string, opciones?: OpcionesDeDescarga): Promise<DocumentoDescargado>;
  subir<T>(ruta: string, opciones: OpcionesDeSubida): Promise<T>;
}

/**
 * La cabecera de la clave de idempotencia, o ninguna.
 *
 * **Una clave en blanco lanza aqui**, y no se manda vacia ni se omite en silencio. Omitirla seria
 * lo mismo que mandar una en blanco —el backend de `rentas` las trata igual,
 * `EmitirCertificado.java:151`— y entonces el reintento de una escritura se cobraria dos veces sin
 * que nada lo dijera: ni un error en la pantalla, ni una linea en el registro. Una excepcion aqui
 * la ve quien escribe la pantalla, la primera vez que la prueba.
 */
function idempotencia(clave: string | undefined): Record<string, string> {
  if (clave === undefined) return {};
  if (clave.trim() === '') {
    throw new Error(
      'La clave de idempotencia esta en blanco. El backend trata una clave en blanco como si no ' +
        'hubiera clave, asi que el reintento de esta escritura se aplicaria dos veces: o se manda ' +
        'una clave con contenido, o no se declara la opcion.',
    );
  }
  return { 'Idempotency-Key': clave };
}

/**
 * Lee el `problem+json` de una respuesta fallida, sin dejar que su lectura tape el fallo.
 *
 * Un `await respuesta.json()` sobre un cuerpo vacio —o sobre el HTML de un proxy mal
 * configurado— lanza, y esa excepcion sustituiria al `ErrorDeLaApi` que se estaba construyendo:
 * la pantalla acabaria ensenando «Unexpected token < in JSON» en lugar de «no tienes permiso».
 */
async function problemaDe(respuesta: Response): Promise<CuerpoDeProblema> {
  try {
    const cuerpo: unknown = await respuesta.json();
    return typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as CuerpoDeProblema) : {};
  } catch {
    return {};
  }
}

/**
 * El nombre que el backend propone en `Content-Disposition`, o `null`.
 *
 * `filename*` va primero porque RFC 6266 §4.3 le da preferencia: es la forma que admite letras
 * fuera de ASCII, y un backend que manda las dos pone en `filename` una version degradada. Y se
 * leen por separado a proposito: una expresion unica como `filename="?([^";]+)"?` casa tambien con
 * `filename*=UTF-8''…` y devuelve `*=UTF-8''ficha.pdf` como nombre.
 */
function nombrePropuesto(cabecera: string | null): string | null {
  if (cabecera === null) return null;

  const extendido = /filename\*\s*=\s*utf-8'[^']*'([^;\s]+)/i.exec(cabecera);
  if (extendido?.[1] !== undefined) {
    try {
      return decodeURIComponent(extendido[1]);
    } catch {
      // Un `%` mal formado: se sigue con `filename`, que es lo que el backend manda para esto.
    }
  }

  const entrecomillado = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/i.exec(cabecera);
  if (entrecomillado?.[1] !== undefined) return entrecomillado[1].replace(/\\(.)/g, '$1') || null;

  const suelto = /filename\s*=\s*([^;\s"]+)/i.exec(cabecera);
  return suelto?.[1] ?? null;
}

/**
 * El ultimo tramo de la ruta, sin la consulta: `/reportes/42/resumen.pdf?formato=PDF` da
 * `resumen.pdf`. Es el ultimo recurso del nombre, y sale de lo que la pantalla pidio en vez de
 * una palabra escrita en esta libreria.
 */
function ultimoTramo(ruta: string): string {
  const tramo = (ruta.split(/[?#]/)[0] ?? '').split('/').filter((t) => t !== '').pop() ?? '';
  try {
    return decodeURIComponent(tramo);
  } catch {
    return tramo;
  }
}

/** El cliente de un sistema. Cada interfaz construye el suyo una vez, con su prefijo. */
export function crearCliente(configuracion: ConfiguracionDelCliente): Cliente {
  const { prefijo, token } = configuracion;

  /**
   * La cabecera del token, la misma para las TRES operaciones. Se lee en cada llamada.
   *
   * `subir()` la recibe como funcion —y no como valor ya leido— justo por esto: si la sesion se
   * refresca a mitad de una pantalla, la subida no puede ser el unico sitio que no se entera.
   *
   * Sin token no se manda la cabecera. Un «Bearer null» es un token invalido y el backend contesta
   * 401 igual, pero el 401 diria «el token no vale» donde la verdad es «no hay token»: dos peldanos
   * distintos de la escalera confundidos en el unico sitio donde se pueden separar sin adivinar.
   */
  const autorizacion = (): Record<string, string> => {
    const credencial = token();
    return credencial === null ? {} : { Authorization: `Bearer ${credencial}` };
  };

  /**
   * La peticion que comparten `solicitar()` y `solicitarRespuesta()`, hasta el error incluido.
   *
   * Esta en un solo sitio para que compartirlo sea una propiedad del codigo y no una promesa de la
   * documentacion: el prefijo, el token leido en esta llamada, el `Accept`, el `Content-Type` del
   * cuerpo, la clave de idempotencia, la senal y el mismo `ErrorDeLaApi` por la misma `problemaDe`.
   * Lo unico que las distingue es que hace cada una con la respuesta que sale de aqui.
   *
   * Las cabeceras se componen **antes** del `await fetch` a proposito: una clave de idempotencia en
   * blanco tiene que lanzar sin que salga un byte, y no despues de que la escritura se haya hecho.
   */
  const pedir = async (ruta: string, opciones: OpcionesDeSolicitud): Promise<Response> => {
    const metodo = opciones.metodo ?? 'GET';
    const cabeceras = {
      Accept: 'application/json',
      ...autorizacion(),
      ...(opciones.cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...idempotencia(opciones.claveDeIdempotencia),
    };

    const respuesta = await fetch(`${prefijo}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
      ...(opciones.senal === undefined ? {} : { signal: opciones.senal }),
    });

    if (!respuesta.ok) {
      // El estado y el codigo viajan en el error. Una interfaz que solo recibe «fallo» no
      // puede distinguir «no tienes permiso» de «el otro sistema esta caido», y acaba
      // ensenando la misma frase inutil para las dos.
      throw new ErrorDeLaApi(respuesta.status, `${metodo} ${ruta}`, await problemaDe(respuesta));
    }

    return respuesta;
  };

  return {
    /**
     * Pide `ruta` al backend y devuelve su cuerpo ya interpretado.
     *
     * @param ruta relativa al prefijo del sistema, empezando por `/`
     */
    async solicitar<T>(ruta: string, opciones: OpcionesDeSolicitud = {}): Promise<T> {
      return (await (await pedir(ruta, opciones)).json()) as T;
    },

    /**
     * La misma peticion que `solicitar()`, pero devuelve **el estado, las cabeceras y el texto sin
     * interpretar**.
     *
     * ```ts
     * const { texto, cabeceras } = await cliente.solicitarRespuesta('/recursos/42');
     * // `texto` son los bytes que llegaron; `cabeceras.get('ETag')`, lo que el servidor anuncio.
     * ```
     *
     * Es para el cuerpo que viene firmado: el que trae una huella en una cabecera y hay que
     * comprobar **sobre lo que llego**. `solicitar()` no sirve porque termina en
     * `respuesta.json()`, y volver a serializar el objeto da otro texto —`1.0` vuelve `1`, un
     * escape vuelve la letra— con otra huella; y las cabeceras, donde viaja la que hay que
     * comparar, no salen de ahi.
     *
     * **Comprobar la huella NO es cosa de esta libreria**: aqui se entregan los bytes y las
     * cabeceras, y quien sabe que algoritmo firmo su recurso, que forma de `ETag` acepta y que
     * hacer si no cuadra es el sistema que lo pide.
     *
     * <h2>Lo que comparte con `solicitar()`, y lo que no</h2>
     *
     * Comparte todo lo que sale al cable y todo el trato de los errores: es la misma funcion. Lo
     * que no comparte es la lectura — ni `JSON.parse`, ni `JSON.stringify`, ni `trim`.
     *
     * **Y no mira el `Content-Type`.** Es lo contrario que `descargar()`, que ante un 200 con JSON
     * lanza `NoEsUnDocumento`: aqui un 200 con JSON es el caso normal, y lo dice una prueba.
     *
     * @param ruta relativa al prefijo del sistema, empezando por `/`, con su consulta si la lleva
     * @throws ErrorDeLaApi si el backend contesta un error, igual que `solicitar()`
     */
    async solicitarRespuesta(
      ruta: string,
      opciones: OpcionesDeSolicitud = {},
    ): Promise<RespuestaTalCual> {
      const respuesta = await pedir(ruta, opciones);

      return {
        estado: respuesta.status,
        cabeceras: respuesta.headers,
        texto: await respuesta.text(),
      };
    },

    /**
     * Baja un documento —un PDF, una hoja de calculo— y lo devuelve **sin tocar el DOM**.
     *
     * ```ts
     * const documento = await cliente.descargar('/reportes/42/resumen.pdf?formato=PDF', {
     *   nombre: 'resumen.pdf',
     * });
     * entregarAlNavegador(documento);
     * ```
     *
     * <h2>Por que no vale ninguno de los dos atajos</h2>
     *
     *   · **`solicitar()`** termina en `respuesta.json()`, y un PDF no cabe por ahi.
     *   · **Un `<a href>` a la misma ruta** sale sin `Authorization`: el token viaja en una
     *     cabecera y un enlace no la lleva. El navegador se baja **el 401 con nombre de PDF**.
     *
     * Y un `fetch` suelto en la pantalla tampoco: se saltaria el prefijo, el token y el trato de
     * los errores, que es lo que la prohibicion `fetch-fuera-del-cliente` impide.
     *
     * <h2>Lo que comparte con `solicitar()`, y lo que no</h2>
     *
     * El prefijo, el token y `ErrorDeLaApi`: un 500 al bajar un documento dice lo mismo que un
     * 500 al leer, porque el error SI viene en `problem+json`. Y como alli, la ruta sale tal cual
     * —la consulta la escribe quien llama— y un corte de red lanza el `TypeError` de `fetch`.
     *
     * No manda `Accept: application/json`, porque no es lo que espera. Y no entrega: devuelve el
     * `Blob` y la pantalla decide cuando llamar a `entregarAlNavegador`, que es lo que deja
     * probar esto sin un DOM.
     *
     * @param ruta relativa al prefijo del sistema, empezando por `/`, con su consulta si la lleva
     * @throws NoEsUnDocumento si el 200 trae JSON
     * @throws ErrorDeLaApi si el backend contesta un error
     */
    async descargar(ruta: string, opciones: OpcionesDeDescarga = {}): Promise<DocumentoDescargado> {
      const operacion = `GET ${ruta}`;

      const respuesta = await fetch(`${prefijo}${ruta}`, {
        method: 'GET',
        headers: autorizacion(),
        ...(opciones.senal === undefined ? {} : { signal: opciones.senal }),
      });

      if (!respuesta.ok) {
        throw new ErrorDeLaApi(respuesta.status, operacion, await problemaDe(respuesta));
      }

      // Un 200 con JSON NO es un documento, y pasa de verdad: una misma ruta puede servir datos o
      // el archivo segun lleve un parametro, y basta con olvidarlo. Sin esta guarda el navegador
      // guarda un `.pdf` con JSON dentro — el peor de los desenlaces, porque parece que funciono
      // y el error aparece al abrirlo, lejos de la pantalla que lo pidio.
      const tipoDeMedio = respuesta.headers.get('Content-Type') ?? '';
      if (/json/i.test(tipoDeMedio)) {
        throw new NoEsUnDocumento(respuesta.status, operacion, tipoDeMedio);
      }

      return {
        nombre:
          nombrePropuesto(respuesta.headers.get('Content-Disposition')) ??
          opciones.nombre ??
          ultimoTramo(ruta),
        tipoDeMedio,
        contenido: await respuesta.blob(),
      };
    },

    /**
     * Manda un archivo por `multipart/form-data`, con avance y con cancelacion.
     *
     * ```ts
     * const resultado = await cliente.subir<Resumen>('/cargas', {
     *   archivo: elArchivoDelInput,
     *   campos: { observacion: 'Carga del padron del ejercicio 2026' },
     *   limiteDeBytes: 1024 * 1024,
     *   admite: ['.xlsx'],
     *   senal: controlador.signal,
     *   alAvanzar: ({ fraccion }) => { setAvance(fraccion); },
     * });
     * ```
     *
     * Comparte con las otras dos el prefijo, el token —leido en CADA llamada, con la misma
     * funcion— y `ErrorDeLaApi`. Lo que no comparte es el transporte: por dentro va con
     * `XMLHttpRequest`, porque `fetch` no sabe decir cuanto lleva subido. El porque entero, y por
     * que el `Content-Type` no se fija a mano, estan en la cabecera de `subir.ts`.
     *
     * @param ruta relativa al prefijo del sistema, empezando por `/`
     * @throws ArchivoRechazado si el archivo no pasa el `limiteDeBytes` o el `admite` que se
     *   declararon —y entonces NO sale nada al cable—, o si el servidor contesta 413 o 415
     * @throws ErrorDeLaApi ante cualquier otro error del backend; un 422 llega con su `codigo` y
     *   su `mensaje`, que es lo que `peldanoDe()` clasifica como «no valido»
     */
    async subir<T>(ruta: string, opciones: OpcionesDeSubida): Promise<T> {
      return await subirElArchivo<T>(prefijo, autorizacion, ruta, opciones);
    },
  };
}
