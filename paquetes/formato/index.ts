/**
 * `@kamayuk/formato` — el vocabulario del dominio que toda interfaz del producto necesita.
 *
 * Fechas, importes y documento de identidad. Es lo que ADR-0030 §4 llama `@kamayuk/formato`, y
 * es **la hoja limpia del grafo**: no importa nada de ningun otro paquete, de ninguna libreria
 * y de ningun sistema. Por eso es el primero que se extrae y el que no puede romper a nadie.
 *
 * <h2>Lo que NO tiene todavia, dicho aqui y no descubierto luego</h2>
 *
 * ADR-0030 §4 le encarga tambien **codigo predial** y **placa**. Ninguno de los dos existe:
 * `rentas` los trata como texto sin forma y `catastro` no ha publicado la suya. No se inventan
 * aqui —una regla de formato inventada es peor que no tenerla, porque parece autoridad— y
 * entran el dia que el sistema dueno del dato diga cual es su forma.
 *
 * <h2>De donde viene</h2>
 *
 * De `rentas/frontend/src/dominio/`, copiado entero el 2026-09-12 al crear `kamayuk-lib`
 * (ADR-0038). El codigo va **verbatim**: lo unico reescrito es la prosa que citaba archivos de
 * `rentas` que la reimplantacion sobre RentasV8 borra, porque un comentario que manda a mirar
 * un archivo que no existe cuesta una busqueda y no dice nada.
 */

export { sumarImportes, mismosCentimos } from './aritmetica.ts';
export {
  TIPOS_DE_DOCUMENTO,
  TIPO_POR_OMISION,
  longitudDe,
  soloDigitos,
  documentoCompleto,
} from './documento.ts';
export {
  formatearImporte,
  formatearFecha,
  formatearFechaEnPalabras,
  compararImportes,
} from './formato.ts';
export type { Importe, Fecha, Tono } from './valores.ts';
