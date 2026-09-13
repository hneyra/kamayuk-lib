/**
 * `@kamayuk/api` — `solicitar()`, `descargar()` y el catalogo de errores emparejado con el backend.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/api`. **Aqui no se nombra ningun sistema**: el prefijo
 * de la ruta es un parametro, porque ADR-0030 §2 pone el sistema delante precisamente para que
 * la ruta diga quien responde. Un `'/rentas/api/v1'` escrito en esta libreria haria que los
 * otros tres preguntaran al backend equivocado, y lo vigila la guarda `sin-suponer-un-sistema`.
 */

export { ErrorDeLaApi, NoEsUnDocumento, crearCliente } from './cliente.ts';
export { entregarAlNavegador } from './entregar.ts';
export type {
  Cliente,
  ConfiguracionDelCliente,
  CuerpoDeProblema,
  DocumentoDescargado,
  OpcionesDeDescarga,
  OpcionesDeSolicitud,
} from './cliente.ts';
