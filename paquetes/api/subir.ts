import {
  ArchivoRechazado,
  ErrorDeLaApi,
  type CuerpoDeProblema,
  type MotivoDelRechazo,
} from './errores.ts';

/**
 * La subida de un archivo: `multipart/form-data` con barra de avance y con cancelacion.
 *
 * <h2>Por que hacia falta, medido</h2>
 *
 * Porque hasta hoy **ninguna interfaz del producto podia subir un archivo**, y no por descuido
 * sino por tres cosas que encajan: el endpoint es `multipart/form-data`; `solicitar()` hace
 * `JSON.stringify` de todo cuerpo y fija `Content-Type: application/json`; y un `fetch` suelto
 * en una pantalla esta prohibido por `fetch-fuera-del-cliente`, cuya lista de excepciones en el
 * arbol de `catastro` esta **vacia a proposito** (`catastro`#110). Medido el 2026-09-14 sobre los
 * tres frontends que existen (`rentas`, `catastro`, `normativa`): **cero** `FormData`, **cero**
 * `XMLHttpRequest`, **cero** `<input type="file">`. No habia por donde, y la pantalla de carga
 * masiva de `catastro` lo dejo escrito en su cabecera en vez de abrirse un agujero.
 *
 * El remedio no es exceptuar a nadie de la prohibicion: es que la libreria publique la operacion.
 *
 * <h2>Por que `XMLHttpRequest` y no `fetch`</h2>
 *
 * **Por el avance de subida, y es la unica razon.** `fetch` no lo puede dar: su promesa se
 * resuelve cuando llega la respuesta, y lo unico que expone mientras tanto es el cuerpo de
 * BAJADA (`respuesta.body`). Para el de subida haria falta mandar un `ReadableStream` como
 * cuerpo, que exige `duplex: 'half'`, va solo sobre HTTP/2 y hoy solo lo implementa Chromium
 * —Firefox y Safari no—; y aun asi mediria lo que el cliente ha **escrito**, no lo que el
 * servidor ha recibido. `XMLHttpRequest.upload` da el evento `progress` en todos los navegadores
 * desde hace quince anos, con `loaded` y `total`, y es lo que usan todas las librerias que
 * ensenan una barra.
 *
 * No es una vuelta atras: es la herramienta que tiene la capacidad que aqui hace falta. Y queda
 * **encerrada en este archivo**, que es lo mismo que se hace con `fetch`: lo vigila
 * `el-xhr-vive-en-un-solo-sitio.test.ts`.
 *
 * **La alternativa que se descarto** era no dar avance y decirlo. No se eligio porque el caso de
 * uso que la pide es una hoja de calculo de miles de filas sobre la conexion de una
 * municipalidad: un minuto de pantalla quieta se lee como «se colgo», y quien atiende vuelve a
 * pulsar. Lo que cuesta darlo son treinta lineas en un solo archivo de la libreria.
 *
 * <h2>El `Content-Type` NO se fija a mano. NUNCA.</h2>
 *
 * Es el defecto clasico de toda subida, y no da un fallo legible: escribir
 * `setRequestHeader('Content-Type', 'multipart/form-data')` manda la cabecera **sin el
 * `boundary`**, que es la cadena que separa las partes y que solo conoce quien las serializa. El
 * servidor recibe un cuerpo bien formado que dice no tener separador, y contesta un 400 o un 500
 * que habla de «no multipart boundary found» — un mensaje que manda a mirar el backend cuando el
 * defecto esta en una linea del cliente.
 *
 * Con un `FormData` como cuerpo, **el navegador pone la cabecera con su `boundary`**. Por eso
 * aqui se manda `Accept` y `Authorization` y ni una mas, y por eso hay una prueba que se pone
 * roja en cuanto alguien anada esa linea «para arreglarlo».
 */

/** Lo que se sabe de la subida mientras va. */
export interface AvanceDeLaSubida {
  /** Bytes ya enviados. */
  readonly bytesEnviados: number;
  /**
   * Bytes que se van a enviar en total, o `null` si el navegador no lo sabe.
   *
   * No se llama `total` a proposito: la prohibicion `aritmetica-con-importes` lee `total…` como
   * un campo de dinero —y hace bien, porque `totalAPagar` lo es— y aqui son bytes.
   */
  readonly bytesDeLaSubida: number | null;
  /** De 0 a 1, o `null` cuando no se sabe cuanto queda. Es lo que la barra dibuja. */
  readonly fraccion: number | null;
}

export interface OpcionesDeSubida {
  /** El archivo. Un `File` de un `<input type="file">`, o cualquier `Blob`. */
  readonly archivo: Blob;
  /**
   * El nombre con el que viaja el archivo. Por omision, el del `File`.
   *
   * Un `Blob` no tiene nombre, y `FormData` le pone `blob`: el backend veria un archivo llamado
   * asi y sin extension, que es justo lo que miran las validaciones de formato. Si lo que se
   * sube no salio de un `<input type="file">`, hay que decir como se llama.
   */
  readonly nombre?: string;
  /**
   * El nombre de la parte del `multipart` donde va el archivo. Por omision, `'archivo'`.
   *
   * La omision no se adivino: los dos endpoints de subida que hay hoy en el producto declaran
   * `@RequestParam("archivo") MultipartFile archivo` (medido el 2026-09-14). Si un backend la
   * nombra de otra forma, se dice aqui — y no acertar da un 400 o un 422 de «falta el parametro».
   */
  readonly campo?: string;
  /**
   * Las demas partes del formulario, que son texto.
   *
   * Es por donde viaja la **observacion** que la regla 10 exige en toda modificacion: el acto de
   * subir un archivo que cambia el padron no es una excepcion a esa regla.
   */
  readonly campos?: Readonly<Record<string, string>>;
  readonly metodo?: 'POST' | 'PUT' | 'PATCH';
  /** Corta la subida. Lo mismo que en `solicitar()` y en `descargar()`. */
  readonly senal?: AbortSignal;
  /** Se llama cada vez que el navegador dice cuanto lleva enviado. */
  readonly alAvanzar?: (avance: AvanceDeLaSubida) => void;
  /**
   * El tamano maximo que se admite, en bytes. Sin el, no se comprueba nada aqui.
   *
   * Lo declara quien llama porque el limite es del servidor y no de esta libreria. Por que
   * conviene declararlo —y que contesta hoy el backend si no se declara— esta en el docblock de
   * `ArchivoRechazado`.
   */
  readonly limiteDeBytes?: number;
  /**
   * Que tipos se admiten, con **la misma gramatica del atributo `accept` de HTML**: un tipo de
   * medio (`'application/pdf'`), un tipo con comodin (`'image/*'`) o una extension (`'.xlsx'`).
   *
   * Las tres formas y no solo la primera porque el tipo de medio de un `.xlsx` **no es fiable**:
   * segun el sistema y el navegador llega como
   * `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, como
   * `application/octet-stream` o como cadena vacia. Con solo tipos de medio, la comprobacion
   * rechazaria archivos buenos, que es peor que no comprobar.
   *
   * Si se declara y no casa ninguna entrada, se lanza `ArchivoRechazado` **sin mandar nada**.
   */
  readonly admite?: readonly string[];
}

/** El nombre de un `File`, o `null` si lo que llego es un `Blob` pelado. */
function nombreDel(archivo: Blob): string | null {
  const posible: unknown = (archivo as { name?: unknown }).name;
  return typeof posible === 'string' && posible !== '' ? posible : null;
}

/** El tipo de medio sin sus parametros: `'text/csv;charset=utf-8'` da `'text/csv'`. */
function tipoPelado(tipo: string): string {
  return (tipo.split(';')[0] ?? '').trim().toLowerCase();
}

/**
 * Si el archivo casa con alguna entrada de `admite`, con la gramatica del `accept` de HTML.
 *
 * Una entrada de extension solo puede casar si se sabe como se llama el archivo. Un `Blob` sin
 * `nombre` contra `['.xlsx']` se rechaza, y es lo correcto: nadie puede decir que es.
 */
function loAdmite(admite: readonly string[], tipo: string, nombre: string | null): boolean {
  const suTipo = tipoPelado(tipo);
  const suNombre = (nombre ?? '').toLowerCase();

  return admite.some((entrada) => {
    const clausula = entrada.trim().toLowerCase();
    if (clausula === '') return false;
    if (clausula.startsWith('.')) return suNombre.endsWith(clausula);
    if (clausula.endsWith('/*')) return suTipo.startsWith(clausula.slice(0, -1));
    return suTipo === clausula;
  });
}

/**
 * Lee el `problem+json` de una respuesta fallida sin dejar que su lectura tape el fallo.
 *
 * Es lo mismo que hace `problemaDe` en `cliente.ts`, sobre el texto que devuelve `XMLHttpRequest`
 * en vez de sobre un `Response`: un cuerpo vacio —o el HTML de un proxy mal configurado— haria
 * que `JSON.parse` lanzara, y esa excepcion sustituiria al `ErrorDeLaApi` que se estaba
 * construyendo. La pantalla acabaria ensenando «Unexpected token <» en lugar de «no tienes
 * permiso».
 */
function problemaDelTexto(texto: string): CuerpoDeProblema {
  try {
    const cuerpo: unknown = JSON.parse(texto);
    return typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as CuerpoDeProblema) : {};
  } catch {
    return {};
  }
}

/**
 * Los dos estados que hablan del archivo y no de quien lo manda.
 *
 * Se traducen a `ArchivoRechazado` para que la pantalla los pueda decir con sus palabras. Sin
 * esto caen en el ultimo peldano de la escalera de identidad —«El sistema no pudo contestar…
 * avise a soporte»— y eso es mentira dos veces: el sistema contesto, y soporte no puede hacer
 * nada con un archivo que pesa de mas.
 */
const POR_EL_ARCHIVO: Readonly<Record<number, MotivoDelRechazo>> = {
  413: 'demasiado-grande',
  415: 'tipo-no-admitido',
};

/**
 * Manda un archivo por `multipart/form-data` y devuelve el cuerpo de la respuesta ya
 * interpretado.
 *
 * No se exporta desde `index.ts`: lo que se publica es `Cliente.subir`, que es donde viven el
 * prefijo del sistema y el token. Vive aparte de `cliente.ts` para que `XMLHttpRequest` quepa en
 * un solo archivo vigilado.
 *
 * @param prefijo el del sistema, tal como lo puso `crearCliente`
 * @param autorizacion la MISMA funcion que usan `solicitar()` y `descargar()`, leida en cada
 *   llamada: si la sesion se refresca, esta operacion se entera como se enteran las otras dos
 * @param ruta relativa al prefijo, empezando por `/`
 */
export async function subirElArchivo<T>(
  prefijo: string,
  autorizacion: () => Record<string, string>,
  ruta: string,
  opciones: OpcionesDeSubida,
): Promise<T> {
  const metodo = opciones.metodo ?? 'POST';
  const operacion = `${metodo} ${ruta}`;
  const archivo = opciones.archivo;
  const nombre = opciones.nombre ?? nombreDel(archivo);
  const senal = opciones.senal;

  // Un rechazo de aqui NO sale al cable, y por eso el estado es 0. Primero el tipo: un archivo
  // del formato equivocado se rechaza por lo que de verdad le pasa, aunque ademas pese de mas.
  if (opciones.admite !== undefined && !loAdmite(opciones.admite, archivo.type, nombre)) {
    throw new ArchivoRechazado(0, operacion, {
      motivo: 'tipo-no-admitido',
      bytes: archivo.size,
      limiteDeBytes: opciones.limiteDeBytes ?? null,
      tipo: archivo.type,
    });
  }

  if (opciones.limiteDeBytes !== undefined && archivo.size > opciones.limiteDeBytes) {
    throw new ArchivoRechazado(0, operacion, {
      motivo: 'demasiado-grande',
      bytes: archivo.size,
      limiteDeBytes: opciones.limiteDeBytes,
      tipo: archivo.type,
    });
  }

  const formulario = new FormData();
  // El tercer argumento solo si hay nombre: pasar `undefined` lo escribe como el literal
  // «undefined» en la cabecera de la parte, que es peor que el `blob` por omision.
  if (nombre === null) {
    formulario.append(opciones.campo ?? 'archivo', archivo);
  } else {
    formulario.append(opciones.campo ?? 'archivo', archivo, nombre);
  }
  for (const [clave, valor] of Object.entries(opciones.campos ?? {})) {
    formulario.append(clave, valor);
  }

  return await new Promise<T>((resolver, rechazar) => {
    // Ya cancelada antes de empezar: se contesta lo mismo que si se hubiera cancelado a mitad, y
    // no se abre ninguna conexion. Es lo que hace `fetch` con una senal ya abortada.
    if (senal?.aborted === true) {
      rechazar(motivoDeLaCancelacion(senal));
      return;
    }

    const peticion = new XMLHttpRequest();
    peticion.open(metodo, `${prefijo}${ruta}`);
    peticion.responseType = 'text';

    // `Accept` y el token, y NADA MAS. El `Content-Type` lo pone el navegador con su `boundary`
    // porque el cuerpo es un `FormData`; escribirlo aqui manda la cabecera sin separador y el
    // servidor contesta un error que habla del backend. Ver la cabecera de este archivo.
    peticion.setRequestHeader('Accept', 'application/json');
    for (const [clave, valor] of Object.entries(autorizacion())) {
      peticion.setRequestHeader(clave, valor);
    }

    const alAvanzar = opciones.alAvanzar;
    if (alAvanzar !== undefined) {
      peticion.upload.addEventListener('progress', (evento: ProgressEvent) => {
        // Se le pone nombre al leerlo: `evento.total` con ese nombre cae bajo la prohibicion
        // `aritmetica-con-importes`, que lee `total…` como dinero. Aqui son bytes.
        const { lengthComputable: seSabe, loaded: enviados, total: deLaSubida } = evento;
        alAvanzar({
          bytesEnviados: enviados,
          bytesDeLaSubida: seSabe ? deLaSubida : null,
          fraccion: seSabe && deLaSubida > 0 ? enviados / deLaSubida : null,
        });
      });
    }

    const cancelar = (): void => {
      peticion.abort();
    };
    senal?.addEventListener('abort', cancelar);
    peticion.addEventListener('loadend', () => {
      senal?.removeEventListener('abort', cancelar);
    });

    peticion.addEventListener('abort', () => {
      rechazar(motivoDeLaCancelacion(senal));
    });

    // Un corte de red lanza aqui lo mismo que lanzaria `fetch`: un `TypeError`, que es lo que
    // `peldanoDe()` clasifica como averia sin saber de donde viene. Un `ErrorDeLaApi` con un
    // estado inventado diria que el servidor contesto algo, y no contesto nada.
    peticion.addEventListener('error', () => {
      rechazar(new TypeError(`No se pudo enviar «${operacion}»`));
    });

    peticion.addEventListener('load', () => {
      const estado = peticion.status;
      const texto = typeof peticion.response === 'string' ? peticion.response : '';

      if (estado < 200 || estado >= 300) {
        const problema = problemaDelTexto(texto);
        const motivo = POR_EL_ARCHIVO[estado];
        rechazar(
          motivo === undefined
            ? new ErrorDeLaApi(estado, operacion, problema)
            : new ArchivoRechazado(
                estado,
                operacion,
                {
                  motivo,
                  bytes: archivo.size,
                  // El limite es el del servidor y no llega en ningun campo del contrato: lo que
                  // se sabe es que se paso, no de cuanto.
                  limiteDeBytes: null,
                  tipo: archivo.type,
                },
                problema,
              ),
        );
        return;
      }

      // Un 201 o un 204 sin cuerpo es una respuesta normal a una subida, y `JSON.parse('')`
      // lanzaria un `SyntaxError` que parece un fallo del servidor. Con cuerpo se interpreta como
      // en `solicitar()`, y un 200 que no trae JSON lanza el mismo `SyntaxError` que alli.
      if (texto.trim() === '') {
        resolver(undefined as T);
        return;
      }
      try {
        resolver(JSON.parse(texto) as T);
      } catch (fallo) {
        rechazar(fallo);
      }
    });

    peticion.send(formulario);
  });
}

/**
 * Con que se rechaza una subida cancelada.
 *
 * `senal.reason` y no un error propio: es exactamente lo que `fetch` entrega al abortar, asi que
 * una pantalla que ya distingue «lo cancele yo» de «fallo» en una lectura no necesita aprender un
 * segundo caso para las subidas. El respaldo cubre el aborto sin senal, que aqui no puede pasar
 * pero que el tipo no impide.
 */
function motivoDeLaCancelacion(senal: AbortSignal | undefined): unknown {
  if (senal !== undefined && senal.aborted) return senal.reason;
  return new DOMException('La subida se cancelo', 'AbortError');
}
