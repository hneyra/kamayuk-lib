import type { Fecha, Importe } from './valores.ts';

/**
 * **Como se lee lo que el backend sirve**: un importe y una fecha, partidos en sus piezas de texto.
 *
 * Es interno: `index.ts` no lo exporta, y la API publica de `@kamayuk/formato` no cambia (#108).
 * Existe porque el analisis de un importe servido estaba **escrito tres veces** —medido sobre
 * `origin/main@2530761`—: `IMPORTE_SERVIDO` declarado en `aritmetica.ts` y en `formato.ts`, y
 * recortar, comprobar, separar el signo, partir y rellenar a dos digitos repetido en `centimosDe`,
 * en `formatearImporte` y en el `parteDe` de `compararImportes`; y el de una fecha, dos. Tres
 * copias de una regla de dinero son tres sitios donde se puede arreglar una y olvidar las otras:
 * la que se queda vieja acepta lo que las demas rechazan, y esa diferencia no la ve nadie hasta
 * que un importe se pinta y no se suma.
 *
 * Aqui todo es texto, como en el resto del paquete (regla 1): ni un `Number` ni un `Date`, y lo
 * vigila `formato-sin-number-ni-date`.
 */

/** Un importe servido por el backend: opcionalmente negativo, con 0..2 decimales. */
const IMPORTE_SERVIDO = /^-?\d+(\.\d{1,2})?$/;

/** Una fecha ISO sin hora. */
const FECHA_SERVIDA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Un importe servido, en sus tres piezas. */
export interface ImportePartido {
  readonly negativo: boolean;
  /** Los digitos enteros, sin ceros a la izquierda salvo el ultimo: `'0007'` -> `'7'`, `'0'` -> `'0'`. */
  readonly entera: string;
  /** Siempre dos digitos: `'5'` -> `'50'`, sin decimales -> `'00'`. */
  readonly decimales: string;
}

/**
 * `'-0007.5'` -> `{ negativo: true, entera: '7', decimales: '50' }`.
 *
 * Falla ruidosamente con cualquier otra forma, **y nombra el valor**: devolverlo tal cual pinta
 * «412880.005» en una columna de importes y nadie lo mira dos veces; recortarlo pierde el
 * centimo en silencio. `para` es la frase que dice que no se pudo hacer con el, y va al final
 * del mensaje.
 */
export function partirImporte(valor: Importe, para: string): ImportePartido {
  const limpio = valor.trim();

  if (!IMPORTE_SERVIDO.test(limpio)) {
    throw new Error(
      `Importe con una forma que el backend no sirve: «${valor}». ` +
        'Se espera texto decimal con dos decimales como mucho, sin separador de miles. ' +
        para,
    );
  }

  const negativo = limpio.startsWith('-');
  const sinSigno = negativo ? limpio.slice(1) : limpio;
  const [entera, decimales] = sinSigno.split('.');

  // `?? ''` y no `!`: con `noUncheckedIndexedAccess` el compilador no da por hecho que `split`
  // devolvio algo, y tiene razon aunque la expresion regular ya lo garantice.
  return {
    negativo,
    entera: (entera ?? '').replace(/^0+(?=\d)/, ''),
    decimales: `${decimales ?? ''}00`.slice(0, 2),
  };
}

/** Una fecha servida, en sus tres piezas de texto, cada una con sus ceros. */
export interface FechaPartida {
  readonly anio: string;
  readonly mes: string;
  readonly dia: string;
}

/**
 * `'2026-09-06'` -> `{ anio: '2026', mes: '09', dia: '06' }`.
 *
 * Falla con cualquier otra forma. No comprueba que el mes o el dia existan: eso lo dice quien
 * los usa, y `formatearFecha` los copia tal cual.
 */
export function partirFecha(fecha: Fecha): FechaPartida {
  const partes = FECHA_SERVIDA.exec(fecha.trim());

  if (partes === null) {
    throw new Error(
      `Fecha con una forma que el backend no sirve: «${fecha}». Se espera ISO 8601 sin hora, «2026-09-06».`,
    );
  }

  const [, anio = '', mes = '', dia = ''] = partes;
  return { anio, mes, dia };
}
