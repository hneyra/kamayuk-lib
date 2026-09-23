import { centimosDe } from './aritmetica.ts';
import { partirFecha, partirImporte } from './partir.ts';
import type { Fecha, Importe } from './valores.ts';

/**
 * Como se escriben un importe y una fecha en la pantalla.
 *
 * Las dos funciones son **puras y trabajan sobre texto**. Ninguna construye un
 * `Number` ni un `Date`, y no es una preferencia de estilo:
 *
 *   · Un `Number` pierde centimos (regla 1). `Number("0.1") + Number("0.2")` no
 *     es `0.3`, y aunque aqui no se sume, convertir y volver a escribir ya
 *     redondea: `String(Number("412880.005"))` da `"412880.005"` hoy y no hay
 *     nada que prometa que seguira dando eso con quince digitos por delante.
 *   · Un `Date` arrastra la zona horaria del puesto. `new Date("2026-09-06")` se
 *     interpreta en UTC y se imprime en local: en Lima sale el **5**. Un estado
 *     de cuenta que cambia de dia segun donde este el navegador no es un detalle
 *     de formato.
 *
 * Y ninguna redondea. Si llega un importe con tres decimales, esta funcion
 * **falla** en vez de recortarlo: recortar es aritmetica, la decide el backend
 * con su `NUMERIC(x,2)`, y un centimo que desaparece al pintarlo no deja rastro
 * en ningun sitio.
 */

/** El separador de miles del artboard: `S/ 1,842.60`. */
const MILES = ',';

/** El separador decimal: el mismo que trae el dato, asi que no se traduce. */
const DECIMAL = '.';

/** Los soles, como el artboard los escribe: simbolo, espacio, cifra. */
const MONEDA = 'S/';

/**
 * `"1842.6"` -> `"S/ 1,842.60"`.
 *
 * Agrupa de tres en tres y completa a dos decimales. Lo hace con texto, asi que
 * un importe de quince digitos sale igual de exacto que uno de tres.
 */
export function formatearImporte(valor: Importe): string {
  // Si no es un importe servido, `partirImporte` falla y nombra el valor: ni se devuelve tal cual
  // ni se recorta.
  const { negativo, entera, decimales } = partirImporte(
    valor,
    'Redondear aqui seria aritmetica sobre dinero (regla 1, RNF-055).',
  );
  const agrupada = entera.replace(/\B(?=(\d{3})+(?!\d))/g, MILES);

  return `${negativo ? '-' : ''}${MONEDA} ${agrupada}${DECIMAL}${decimales}`;
}

/**
 * `"2026-09-06"` -> `"06/09/2026"`, que es como el artboard escribe las fechas.
 */
export function formatearFecha(fecha: Fecha): string {
  const { anio, mes, dia } = partirFecha(fecha);
  return `${dia}/${mes}/${anio}`;
}

/**
 * Ordena dos importes **sin convertirlos a numero**.
 *
 * Ordenar una lista por deuda es lo que pide el artboard, y la manera obvia —`Number(a) -
 * Number(b)`— es la prohibida (regla 1, y la prohibicion `importe-convertido-a-number` de
 * ESLint): en coma flotante dos importes que se diferencian en un centimo a partir de
 * diecisiete digitos comparan iguales, y ordenar por una comparacion que a veces dice «iguales»
 * cuando no lo son cambia el orden de la lista segun por donde se empiece.
 *
 * Se comparan **centimos enteros en `bigint`**, con el mismo `centimosDe` que suma (#108), y sale
 * exacto a cualquier longitud. Hasta #108 se comparaba como texto —signo, longitud de la parte
 * entera, lexicografico, decimales— con un tercer analisis del importe escrito aqui dentro; ahora
 * lo que es un importe servido lo decide `partir.ts` y solo alli. Por lo mismo, `'-0.00'` y
 * `'0.00'` pesan igual: son la misma cifra, como dice `mismosCentimos`.
 *
 * Devuelve el negativo/cero/positivo que espera `Array.prototype.sort`.
 */
export function compararImportes(a: Importe, b: Importe): number {
  const para = 'No se puede ordenar por el.';
  const uno = centimosDe(a, para);
  const otro = centimosDe(b, para);

  if (uno === otro) {
    return 0;
  }
  return uno < otro ? -1 : 1;
}

/** Un mes como lo sirve una fecha ISO: dos digitos, del `01` al `12`. */
type Mes = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';

/**
 * Los doce meses, en minuscula, como los escribe el artboard: «al 31 de agosto».
 *
 * **Por su clave de dos digitos, y no por posicion** (#108): la lista por posicion obligaba a
 * convertir `'08'` en el numero 7 para indexarla, y eso era un `Number` en el unico paquete que
 * promete no tener ninguno. Con la clave tal cual llega no hay nada que convertir.
 */
const MESES: Readonly<Record<Mes, string>> = {
  '01': 'enero',
  '02': 'febrero',
  '03': 'marzo',
  '04': 'abril',
  '05': 'mayo',
  '06': 'junio',
  '07': 'julio',
  '08': 'agosto',
  '09': 'septiembre',
  '10': 'octubre',
  '11': 'noviembre',
  '12': 'diciembre',
};

function esMes(texto: string): texto is Mes {
  return Object.hasOwn(MESES, texto);
}

/**
 * `"2026-08-31"` -> `"31 de agosto"`.
 *
 * **Sin el ano, y a proposito**: es la fecha de corte de un panel que ya dice de que ejercicio
 * es, y asi la escribe el artboard. Donde haga falta la fecha completa esta `formatearFecha`.
 *
 * Sin `Date` y sin `Intl`, por lo mismo que el resto de este archivo: `Intl.DateTimeFormat`
 * necesita construir un `Date`, y `new Date("2026-08-31")` se interpreta en UTC y se imprime en
 * local — en Lima sale el 30 de agosto—. Una tabla de doce nombres no tiene ese problema.
 */
export function formatearFechaEnPalabras(fecha: Fecha): string {
  const { mes, dia } = partirFecha(fecha);
  if (!esMes(mes)) {
    throw new Error(`Fecha con un mes que no existe: «${fecha}».`);
  }

  // Sin el cero de la izquierda: «1 de enero», no «01 de enero». Uno solo, y con texto: el dia
  // siempre trae dos digitos, asi que `'01'` da `'1'` y `'10'` se queda como esta.
  return `${dia.replace(/^0/, '')} de ${MESES[mes]}`;
}
