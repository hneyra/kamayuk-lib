/**
 * El catalogo de errores de `@kamayuk/api`, aparte del cliente que los lanza.
 *
 * <h2>Por que viven en su propio archivo desde que hay subida</h2>
 *
 * Estaban dentro de `cliente.ts`, y ahi habrian seguido si la subida no necesitara **dos cosas a
 * la vez**: que `cliente.ts` la importe —para que `crearCliente` la ofrezca junto a `solicitar` y
 * `descargar`— y que ella importe `ErrorDeLaApi` —para lanzar una subclase suya—. Eso es un ciclo
 * entre modulos, y con clases no es inofensivo: en ESM los `import` se evaluan antes que el cuerpo
 * del modulo que los pide, asi que `subir.ts` se evaluaria **antes** de que `cliente.ts` definiera
 * `ErrorDeLaApi`, y un `class … extends` en su cuerpo reventaria al cargar el paquete.
 *
 * **Medido, y no supuesto** (2026-09-14): puesta una clase en `cliente.ts` y derivada en
 * `subir.ts`, importar `index.ts` no llega ni a la primera prueba —
 *
 *     TypeError: Class extends value undefined is not a constructor or null
 *      ❯ paquetes/api/subir.ts:357:31
 *      ❯ paquetes/api/cliente.ts:38:1
 *
 * — un rojo de carga del modulo, en el consumidor, que nombra las dos lineas pero no dice «ciclo».
 * Y ni siquiera es el `ReferenceError` de la zona muerta que uno espera, porque el enlazado deja
 * el binding en `undefined` antes de evaluar el cuerpo. Con las clases aqui el grafo queda
 * `cliente.ts -> subir.ts -> errores.ts`, sin vuelta.
 *
 * `cliente.ts` las reexporta tal cual, asi que quien las importaba de ahi las sigue teniendo.
 */

/**
 * La cifra normativa que hay que publicar, cuando eso es lo que falta.
 *
 * Es el miembro `parametroQueFalta` **tal como lo compone el backend**, y aqui no se interpreta:
 * quien decide que significa es la pantalla. Medido el 2026-09-20 sobre `ParametroQueFalta.java`
 * de los cinco sistemas —`comoMiembro()`, identico en los cinco—: `ejercicio` va siempre; `llave`
 * **desaparece del cuerpo** cuando lo que falta es el conjunto sellado del ano entero, y no llega
 * como `null` a proposito, porque un `null` es un valor y el cliente que preguntara por el lo
 * veria presente.
 *
 * `ejercicio` es un ano y no un importe: por eso es `number` y no texto decimal (regla 1).
 */
export interface ParametroQueFalta {
  readonly ejercicio: number;
  /** `TIPO:CLAVE` si falta una fila, `TIPO` si falta el bloque; ausente si falta el conjunto. */
  readonly llave?: string;
}

/**
 * Los miembros del `problem+json` que el backend publica, tal como los publica.
 *
 * Son los de `ManejadorDeErrores.cuerpoDe`: los cuatro de RFC 9457 —`type`, `title`, `status`,
 * `detail`— mas **las CINCO extensiones del contrato**, que son las mismas en los cinco sistemas.
 * Medido el 2026-09-20 sobre los cinco `ManejadorDeErrores.java`: `CAMPO_CODIGO`, `CAMPO_MENSAJE`,
 * `CAMPO_DETALLES`, `CAMPO_INCIDENCIA` y `CAMPO_PARAMETRO_QUE_FALTA`, en `:46-60` en `identidad`,
 * `catastro`, `caja` y `normativa`, y en `:47-61` en `rentas`.
 *
 * **Hasta #52 aqui solo estaban dos, y las otras tres se tiraban en el constructor** —con lo que
 * la interfaz no podia distinguir dos 404 que llegan con el mismo `codigo`, ni decir el numero de
 * incidencia de un 500, ni nombrar el campo por el que se pidio ordenar—.
 *
 * **Y llegan de a pocos:** medido contra la instalacion, el 401 de la cadena de identidad trae
 * CUATRO —`status`, `title`, `codigo`, `mensaje`— y ni `type` ni `detail`, mientras que el 404 de
 * una ruta que no existe trae los seis mas `instance`. Por eso todos son opcionales aqui: dar por
 * hecho que viene `detail` dejaria la explicacion de la pantalla en `undefined` justo en el
 * peldano mas comun. Lo mismo vale para las tres nuevas — `detalles` **no se escribe cuando la
 * lista esta vacia** (`ManejadorDeErrores.java:65-67` y `:307-309`), `incidencia` solo la lleva lo
 * que cae en el catch-all (`:288-296`) y `parametroQueFalta` solo sale cuando el problema lo trae.
 */
export interface CuerpoDeProblema {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly codigo?: string;
  readonly mensaje?: string;
  /** Las cifras del rechazo, como dato y no dentro de la frase. Ausente cuando no hay ninguna. */
  readonly detalles?: readonly string[];
  /** El identificador con el que soporte encuentra la causa en el registro. Solo en los 5xx. */
  readonly incidencia?: string;
  readonly parametroQueFalta?: ParametroQueFalta;
}

/**
 * **La unica lectura del `problem+json`** de este paquete, sin dejar que leerlo tape el fallo.
 *
 * Un `JSON.parse` sobre un cuerpo vacio —o sobre el HTML de un proxy mal configurado— lanza, y esa
 * excepcion sustituiria al `ErrorDeLaApi` que se estaba construyendo: la pantalla acabaria
 * ensenando «Unexpected token < in JSON» en lugar de «no tienes permiso». Lo que no es un objeto
 * —un `null`, un numero, una lista— cuenta como un cuerpo que no dijo nada.
 *
 * Recibe **texto** y no un `Response` porque las dos puertas del paquete lo tienen de formas
 * distintas: `cliente.ts` lo saca con `respuesta.text()` y `subir.ts` lo lee de
 * `XMLHttpRequest.response`. Hasta #121 cada una tenia su copia —`problemaDe` y
 * `problemaDelTexto`, con el mismo cuerpo—, y una correccion en una no llegaba a la otra: medido,
 * romper la de `subir.ts` dejaba `cliente.test.ts` en verde.
 */
export function cuerpoDeProblema(texto: string): CuerpoDeProblema {
  try {
    const cuerpo: unknown = JSON.parse(texto);
    return typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as CuerpoDeProblema) : {};
  } catch {
    return {};
  }
}

/**
 * `VERBO /ruta`: lo que se pidio, tal como lo guarda `ErrorDeLaApi.operacion`.
 *
 * Las cuatro operaciones la escriben por aqui —`solicitar` y `solicitarRespuesta` desde `pedir()`,
 * `descargar` al lanzar `NoEsUnDocumento` y `subir` en `subir.ts`—, porque la pantalla y
 * `peldanoDe()` la comparan: si una puerta la escribiera distinto, el mismo fallo diria dos cosas.
 */
export function operacionDe(metodo: string, ruta: string): string {
  return `${metodo} ${ruta}`;
}

/**
 * Lo que el backend dijo que paso, en el orden en que se prefiere: `mensaje`, `detail`, `title`;
 * o `null` si no dijo nada.
 *
 * Un miembro que llega como `null` cuenta como no dicho, igual que uno ausente. Hasta #121 el orden
 * se escribia dos veces en este archivo y las dos no coincidian en eso: medido, un 413 con
 * `{"mensaje": null}` daba `ErrorDeLaApi` «no dijo nada» y a `ArchivoRechazado` «dijo algo», con lo
 * que su `message` se quedaba en `VERBO /ruta` sin el motivo.
 */
function loQueDijo(cuerpo: CuerpoDeProblema): string | null {
  return cuerpo.mensaje ?? cuerpo.detail ?? cuerpo.title ?? null;
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
 * <h2>Y desde #52 conserva las otras TRES extensiones, por el mismo motivo</h2>
 *
 * `incidencia`, `detalles` y `parametroQueFalta` llegaban y se tiraban aqui. Cada una tapaba una
 * distincion que solo se puede hacer con ella:
 *
 *   · **`incidencia`** — la lleva todo 500 (`ManejadorDeErrores.java:288-296`) y es lo unico con
 *     lo que quien atiende encuentra la causa. Sin ella el peldano de averia dice «avise a
 *     soporte con este mensaje» y el mensaje es «No se pudo completar la operacion (500)», que es
 *     el mismo para todos los 500 de todos los sistemas.
 *   · **`detalles`** — es donde viaja el campo de un 422 `ORDEN_NO_ADMITIDO` («Campo pedido: …»,
 *     `ManejadorDeErrores.java:75-81`), porque el `mensaje` de ese codigo es fijo.
 *   · **`parametroQueFalta`** — separa dos 404 que llegan los dos con `codigo: 'NO_ENCONTRADO'`:
 *     «esa ruta no existe» y «ese ejercicio no esta publicado». Medido desde `normativa` al
 *     conectar su hoja de Publicacion (`normativa`#67): sin este miembro, distinguirlos obligaba
 *     a leer el `mensaje` en castellano, que es justo lo que el catalogo de errores prohibe.
 *
 * **Aqui se conservan y no se interpretan.** No hay ningun `faltaUnaCifraNormativa` ni ningun
 * `reintentable` en esta clase: decidir que significa cada una es de quien dibuja, y la escalera
 * de `@kamayuk/sesion` es quien lo hace.
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
  /**
   * La extension `incidencia`: el identificador con el que soporte encuentra la causa, o `null`.
   *
   * Solo lo lleva lo que cayo en el catch-all del backend, o sea los 500. Un 4xx no lo trae, y
   * eso significa algo: no hay nada en el registro del servidor que buscar.
   */
  readonly incidencia: string | null;
  /**
   * La extension `detalles`: las cifras del rechazo, como dato y no dentro de la frase.
   *
   * **Vacio cuando no llega**, y no `null`: el backend no escribe el miembro con la lista vacia
   * (`ManejadorDeErrores.java:65-67`), asi que la ausencia significa «este rechazo no publica
   * ninguna cifra» y nunca «no se sabe».
   */
  readonly detalles: readonly string[];
  /** La extension `parametroQueFalta`, tal como llego y sin interpretar, o `null`. */
  readonly parametroQueFalta: ParametroQueFalta | null;

  constructor(estado: number, operacion: string, cuerpo: CuerpoDeProblema = {}) {
    // El `message` de `Error` es lo que acaba en pantalla por el camino corto, asi que lleva lo
    // mas util que haya llegado: lo que el backend dijo, y si no dijo nada, que se pidio.
    super(loQueDijo(cuerpo) ?? operacion);
    this.name = 'ErrorDeLaApi';
    this.estado = estado;
    this.codigo = cuerpo.codigo ?? null;
    this.mensaje = cuerpo.mensaje ?? null;
    this.titulo = cuerpo.title ?? null;
    this.detalle = cuerpo.detail ?? null;
    this.operacion = operacion;
    this.incidencia = cuerpo.incidencia ?? null;
    this.detalles = cuerpo.detalles ?? [];
    this.parametroQueFalta = cuerpo.parametroQueFalta ?? null;
  }
}

/**
 * Un 200 que no trae un documento, sino datos.
 *
 * **Es un `ErrorDeLaApi`**, y a proposito: la pantalla que baja un documento atrapa UNA clase de
 * error, la misma que atrapa en una lectura. `peldanoDe()` lo reconoce por su clase —desde #109;
 * antes lo clasificaba por su estado 200 y lo mandaba a soporte—. Va en su propia subclase —y no con un `codigo` inventado aqui— porque `codigo` es la
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

/** Por que no se admitio el archivo. Es lo que la pantalla lee para elegir que frase decir. */
export type MotivoDelRechazo = 'demasiado-grande' | 'tipo-no-admitido';

/**
 * El archivo no se admitio: pesa mas de lo permitido, o no es de un tipo que se acepte.
 *
 * **Es un `ErrorDeLaApi`**, por lo mismo que `NoEsUnDocumento`: la pantalla atrapa UNA clase, y
 * `peldanoDe()` la reconoce por su clase y no por su estado —desde #109: antes caia en «averia ·
 * avise a soporte», con 0, 413 o 415—. Lo que esta subclase anade es **poder
 * distinguirlo sin leer una frase**: `motivo` dice cual de las dos cosas paso, y `bytes`,
 * `limiteDeBytes` y `tipo` traen las cifras con las que se escribe el aviso.
 *
 * <h2>Llega por dos caminos, y el `estado` dice por cual</h2>
 *
 *   · **`estado === 0`** — lo rechazo el cliente **antes de mandar nada**, porque quien llamo
 *     declaro un `limiteDeBytes` o un `admite`. Cero no es un codigo de estado: es la verdad de
 *     que no hubo respuesta porque no hubo peticion, y es la misma convencion con la que
 *     `NoEsUnDocumento` guarda el 200 que de verdad llego.
 *   · **413 o 415** — lo rechazo el servidor. Entonces viene con su `problem+json`, si lo trajo,
 *     y `codigo` y `mensaje` valen lo que el backend dijo.
 *
 * <h2>Por que el rechazo local no es un lujo, medido</h2>
 *
 * En el backend de este producto no hay ningun manejador de `MaxUploadSizeExceededException`:
 * medido el 2026-09-14 sobre `catastro`, el enum `CodigoDeError` no tiene ningun 413 y no hay
 * `@ExceptionHandler` para `MultipartException` en ningun sitio, asi que pasarse del limite cae
 * en el catch-all y contesta **500 `ERROR_INTERNO` «No se pudo completar la operacion»**. Y como
 * el `application.yaml` tampoco declara `spring.servlet.multipart`, el limite vigente es el de
 * Spring Boot por omision: **1 MB por archivo y 10 MB por peticion**. O sea que hoy, sin esta
 * comprobacion, una hoja de calculo grande se sube entera por una conexion municipal para acabar
 * en un 500 generico que manda a avisar a soporte por algo que soporte no puede arreglar.
 */
export class ArchivoRechazado extends ErrorDeLaApi {
  readonly motivo: MotivoDelRechazo;
  /** Lo que pesa el archivo, en bytes. */
  readonly bytes: number;
  /** El limite que se declaro al llamar, en bytes, o `null` si lo rechazo el servidor. */
  readonly limiteDeBytes: number | null;
  /** El tipo de medio del archivo, tal como lo dio el navegador. Puede ser cadena vacia. */
  readonly tipo: string;

  constructor(
    estado: number,
    operacion: string,
    rechazo: {
      readonly motivo: MotivoDelRechazo;
      readonly bytes: number;
      readonly limiteDeBytes: number | null;
      readonly tipo: string;
    },
    cuerpo: CuerpoDeProblema = {},
  ) {
    super(estado, operacion, cuerpo);
    this.name = 'ArchivoRechazado';
    this.motivo = rechazo.motivo;
    this.bytes = rechazo.bytes;
    this.limiteDeBytes = rechazo.limiteDeBytes;
    this.tipo = rechazo.tipo;

    // Si el backend explico el rechazo, manda lo que dijo: es lo unico que puede nombrar SU
    // limite. Si no dijo nada —o si el rechazo es local, que es el caso normal— el `message`
    // queda tecnico a proposito, como el de `NoEsUnDocumento`: la frase para quien mira la
    // pantalla se escribe alli, desde `motivo` y las cifras, y no aqui (regla del texto visible).
    if (loQueDijo(cuerpo) === null) {
      this.message = `${operacion} -> ${rechazo.motivo}`;
    }
  }
}
