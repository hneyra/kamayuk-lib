/**
 * El unico sitio de una interfaz del producto donde se llama a `fetch`.
 *
 * No es una preferencia de estilo: es lo que sostiene todo lo que viene encima. El token
 * (ADR-0030 §3), la clave de idempotencia de las escrituras y el formato de error del
 * backend —`problem+json`— se enchufan en un sitio o en veinte. Un `fetch` suelto en una
 * pantalla no se salta una convencion: se salta las tres, y sobrevive a la integracion como un
 * caso aparte que nadie recuerda. Por eso la excepcion de la prohibicion `fetch-fuera-del-cliente`
 * es este paquete y solo este.
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
 * anade cabeceras propias mas alla de las tres de abajo, y el cuerpo es el que le pasan. El
 * inquilino sale del token y lo fija el backend con `SET LOCAL`. Lo vigilan tres cosas a la vez:
 * la prohibicion `municipalidad-en-el-cliente` de ESLint, que ni siquiera deja escribir el
 * identificador; una prueba que espia lo que sale por el cable; y esta propiedad de que aqui no
 * se compone nada.
 */

/**
 * Los miembros del `problem+json` que el backend publica, tal como los publica.
 *
 * Son los de `ManejadorDeErrores.cuerpoDe`: los cuatro de RFC 9457 —`type`, `title`, `status`,
 * `detail`— mas las dos extensiones del contrato, `codigo` y `mensaje`. **Y llegan de a pocos:**
 * medido contra la instalacion, el 401 de la cadena de identidad trae CUATRO —`status`, `title`,
 * `codigo`, `mensaje`— y ni `type` ni `detail`, mientras que el 404 de una ruta que no existe
 * trae los seis mas `instance`. Por eso todos son opcionales aqui: dar por hecho que viene
 * `detail` dejaria la explicacion de la pantalla en `undefined` justo en el peldano mas comun.
 */
export interface CuerpoDeProblema {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly codigo?: string;
  readonly mensaje?: string;
}

/**
 * Lo que el backend contesta cuando algo va mal, en `problem+json` (RFC 9457).
 *
 * <h2>Por que el `codigo` es un campo y no una linea de texto</h2>
 *
 * Antes esta clase guardaba **solo el estado y «VERBO /ruta»**, y tiraba `codigo` y `mensaje`,
 * que ya llegaban. Con eso, los tres primeros peldanos de la escalera de identidad —401
 * `NO_AUTENTICADO`, 403 `SIN_MUNICIPALIDAD`, 403 `SIN_PRIVILEGIO`— eran **indistinguibles**
 * entre si desde la pantalla, y ninguno se podia explicar a quien atiende. Y son tres
 * situaciones con tres remedios distintos: volver a identificarse, pedirle al administrador que
 * asigne la municipalidad, y pedir el permiso que falta.
 *
 * La interfaz reacciona al **codigo**, que es estable, y no al texto en castellano, que se
 * reescribe en cuanto alguien lo lee en voz alta.
 *
 * <h2>Es UNA clase para los cuatro sistemas, y ese es el punto</h2>
 *
 * Medido el 2026-09-12 sobre los cuatro clones: habia **tres clases de error incompatibles**
 * —`ErrorDeLaApi(estado, operacion, cuerpo)` en `rentas`, `ErrorDeLaApi(codigo, mensaje, estado,
 * extras)` en `normativa`, `ErrorDeApi` sin «La» en `catastro`— y los tres clientes compartian
 * 45 lineas de 135. Por eso este paquete **no se extrajo: se diseno**. La escalera de peldanos
 * lee cuatro campos de aqui, y con tres formas distintas no podia viajar a ningun sitio.
 */
export class ErrorDeLaApi extends Error {
  readonly estado: number;
  /** La extension `codigo` del contrato —`NO_AUTENTICADO`, `SIN_MUNICIPALIDAD`…—, o `null`. */
  readonly codigo: string | null;
  /** La extension `mensaje`: lo que el backend dice que paso, en castellano. */
  readonly mensaje: string | null;
  /** El `title` de RFC 9457. */
  readonly titulo: string | null;
  /** El `detail` de RFC 9457. Puede no venir: la cadena de identidad no lo manda. */
  readonly detalle: string | null;
  /** `VERBO /ruta`, lo que se pidio. Es lo que se ensena cuando el cuerpo no dice nada. */
  readonly operacion: string;

  constructor(estado: number, operacion: string, cuerpo: CuerpoDeProblema = {}) {
    // El `message` de `Error` es lo que acaba en pantalla por el camino corto, asi que lleva lo
    // mas util que haya llegado: lo que el backend dijo, y si no dijo nada, que se pidio.
    super(cuerpo.mensaje ?? cuerpo.detail ?? cuerpo.title ?? operacion);
    this.name = 'ErrorDeLaApi';
    this.estado = estado;
    this.codigo = cuerpo.codigo ?? null;
    this.mensaje = cuerpo.mensaje ?? null;
    this.titulo = cuerpo.title ?? null;
    this.detalle = cuerpo.detail ?? null;
    this.operacion = operacion;
  }
}

/**
 * Un 200 que no trae un documento, sino datos.
 *
 * **Es un `ErrorDeLaApi`**, y a proposito: la pantalla que baja un documento atrapa UNA clase de
 * error, la misma que atrapa en una lectura, y `peldanoDe()` lo sigue clasificando sin saber que
 * existe. Va en su propia subclase —y no con un `codigo` inventado aqui— porque `codigo` es la
 * extension del contrato que escribe el backend: meter ahi una cadena del cliente mezclaria lo que
 * el servidor dijo con lo que el cliente dedujo.
 *
 * El `estado` es el que llego, o sea 200. Parece raro en un error y es la verdad de lo que paso: el
 * servidor contesto bien a una peticion que no pedia lo que la pantalla creia.
 */
export class NoEsUnDocumento extends ErrorDeLaApi {
  /** El `Content-Type` con el que llego la respuesta, tal cual. */
  readonly tipoDeMedio: string;

  constructor(estado: number, operacion: string, tipoDeMedio: string) {
    super(estado, operacion);
    this.name = 'NoEsUnDocumento';
    this.tipoDeMedio = tipoDeMedio;
    this.message = `${operacion} -> ${tipoDeMedio}`;
  }
}

export interface OpcionesDeSolicitud {
  readonly metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly cuerpo?: unknown;
  readonly senal?: AbortSignal;
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
  descargar(ruta: string, opciones?: OpcionesDeDescarga): Promise<DocumentoDescargado>;
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
   * La cabecera del token, la misma para las dos operaciones. Se lee en cada llamada.
   *
   * Sin token no se manda la cabecera. Un «Bearer null» es un token invalido y el backend contesta
   * 401 igual, pero el 401 diria «el token no vale» donde la verdad es «no hay token»: dos peldanos
   * distintos de la escalera confundidos en el unico sitio donde se pueden separar sin adivinar.
   */
  const autorizacion = (): Record<string, string> => {
    const credencial = token();
    return credencial === null ? {} : { Authorization: `Bearer ${credencial}` };
  };

  return {
    /**
     * Pide `ruta` al backend y devuelve su cuerpo ya interpretado.
     *
     * @param ruta relativa al prefijo del sistema, empezando por `/`
     */
    async solicitar<T>(ruta: string, opciones: OpcionesDeSolicitud = {}): Promise<T> {
      const metodo = opciones.metodo ?? 'GET';

      const respuesta = await fetch(`${prefijo}${ruta}`, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...autorizacion(),
          ...(opciones.cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
        ...(opciones.senal === undefined ? {} : { signal: opciones.senal }),
      });

      if (!respuesta.ok) {
        // El estado y el codigo viajan en el error. Una interfaz que solo recibe «fallo» no
        // puede distinguir «no tienes permiso» de «el otro sistema esta caido», y acaba
        // ensenando la misma frase inutil para las dos.
        throw new ErrorDeLaApi(respuesta.status, `${metodo} ${ruta}`, await problemaDe(respuesta));
      }

      return (await respuesta.json()) as T;
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
  };
}
