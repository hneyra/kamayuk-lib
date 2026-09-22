/**
 * `@kamayuk/api` — `solicitar()`, `solicitarRespuesta()`, `descargar()`, `subir()` y el catalogo
 * de errores emparejado con el backend.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/api`. **Aqui no se nombra ningun sistema**: el prefijo
 * de la ruta es un parametro, porque ADR-0030 §2 pone el sistema delante precisamente para que
 * la ruta diga quien responde. Un `'/rentas/api/v1'` escrito en esta libreria haria que los
 * otros tres preguntaran al backend equivocado, y lo vigila la guarda `sin-suponer-un-sistema`.
 *
 * <h2>Cual de las cuatro</h2>
 *
 *   · **`solicitar<T>()`** — el caso normal: pide y devuelve el cuerpo ya interpretado.
 *   · **`solicitarRespuesta()`** — la misma peticion, pero devuelve `{ estado, cabeceras, texto }`.
 *     Es para el cuerpo que viene firmado con una huella en una cabecera: hay que comprobarla
 *     sobre **los bytes que llegaron**, y reserializar el objeto da otro texto. Comprobar la
 *     huella es del sistema que la pide, no de aqui.
 *   · **`descargar()`** — un PDF o una hoja de calculo, como `Blob`, y sin tocar el DOM. Ante un
 *     200 con JSON lanza `NoEsUnDocumento`, que es lo contrario de lo que hace la anterior.
 *   · **`subir()`** — un `multipart/form-data` con avance y cancelacion.
 *
 * **La clave de idempotencia se manda, y ya no es solo una frase de la documentacion.** Es
 * `claveDeIdempotencia` de `OpcionesDeSolicitud` —asi que vale para las dos primeras—, sale como
 * `Idempotency-Key`, y en blanco lanza antes de llamar a `fetch`: el backend trata una clave en
 * blanco como si no hubiera clave, y entonces el reintento duplica sin avisar. Quien la genera y
 * cuando se renueva lo decide la pantalla.
 */

export { ErrorDeLaApi, NoEsUnDocumento, ArchivoRechazado, crearCliente } from './cliente.ts';
export { entregarAlNavegador } from './entregar.ts';
export type {
  AvanceDeLaSubida,
  CabecerasDeLaRespuesta,
  Cliente,
  ConfiguracionDelCliente,
  CuerpoDeProblema,
  DocumentoDescargado,
  MotivoDelRechazo,
  OpcionesDeDescarga,
  OpcionesDeSolicitud,
  OpcionesDeSubida,
  ParametroQueFalta,
  RespuestaTalCual,
} from './cliente.ts';
