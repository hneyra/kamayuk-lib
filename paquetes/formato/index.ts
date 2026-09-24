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
 * (ADR-0038). **Ese dia** el codigo fue verbatim: lo unico reescrito fue la prosa que citaba
 * archivos de `rentas` que la reimplantacion sobre RentasV8 borra, porque un comentario que manda a
 * mirar un archivo que no existe cuesta una busqueda y no dice nada.
 *
 * **Desde #108 ya no lo es, y la copia de `rentas` no es la de aqui.** `documento.ts` y
 * `valores.ts` siguen como llegaron; `formato.ts` y `aritmetica.ts` se reescribieron: el analisis
 * de lo servido vive en `partir.ts` —que `rentas` no tiene—, `centimosDe` sale de alli,
 * `compararImportes` compara centimos en `bigint` —devuelve `-1`/`0`/`1`, y `'-0.00'` pesa lo
 * mismo que `'0.00'`—, `MESES` se indexa por su clave de dos digitos y el dia pierde su cero con
 * texto: eran los dos `Number` del paquete.
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
