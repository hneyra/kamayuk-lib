/**
 * **Como viaja una fecha, y como se lee** (#94).
 *
 * <h2>Las dos no son la misma cadena, y hasta #94 lo eran</h2>
 *
 * El campo de fecha guardaba lo elegido con `dia.toLocaleDateString('es-PE')` —`20/9/2026`— y eso
 * era a la vez lo que se veia y lo que valia el campo. Mientras nadie podia leer el valor de un
 * campo —que es justo lo que #94 abre— daba igual. En cuanto lo elegido viaja en una ruta y de ahi
 * a un `?fecha=`, deja de dar igual:
 *
 *   · `20/9/2026` no lo lee ningun backend del producto —los cuatro parsean ISO—, y las barras hay
 *     que escaparlas para meterlas en una direccion;
 *   · `9` y `09` son la misma fecha escrita de dos maneras, asi que dos direcciones distintas
 *     piden lo mismo y parten la cache de quien pide;
 *   · y ordenado como texto, `9/2026` va despues de `10/2026`.
 *
 * Asi que **lo que viaja es ISO** (`aaaa-mm-dd`) y **lo que se lee es `dd/mm/aaaa`**, que es la
 * misma separacion que la libreria ya hace entre el `valor` y el `rotulo` de una opcion: lo que se
 * envia no puede cambiar porque cambie como se muestra.
 *
 * <h2>Por que la conversion se hace con las partes locales y nunca con `Date`</h2>
 *
 * `new Date('2026-09-20')` es medianoche **UTC**, y en Lima —UTC-5— eso es el 19 a las siete de la
 * tarde: leerlo de vuelta con `getDate()` da un dia menos. Un error de un dia en una conciliacion
 * es el peor de los errores posibles, porque la cifra sale bien formada. Por eso se compone y se
 * descompone por partes locales, y por eso `diaDeUnaFecha` construye `new Date(a, m - 1, d)`.
 */

/** Una fecha como viaja: `aaaa-mm-dd`. Lo que no case con esto no es una fecha de esta casa. */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const dosCifras = (n: number): string => String(n).padStart(2, '0');

/** El dia elegido en el calendario, como viaja. Con sus partes LOCALES: ver el docblock. */
export function fechaDeUnDia(dia: Date): string {
  return `${String(dia.getFullYear())}-${dosCifras(dia.getMonth() + 1)}-${dosCifras(dia.getDate())}`;
}

/**
 * El dia que el calendario tiene que ensenar marcado, o `undefined` si el valor no es una fecha.
 *
 * Un valor que no es ISO no se adivina: el calendario abre sin nada marcado, que es exactamente lo
 * que se sabe de el.
 */
export function diaDeUnaFecha(valor: string): Date | undefined {
  const partes = ISO.exec(valor);
  if (partes === null) return undefined;
  const [, anno, mes, dia] = partes;
  const fecha = new Date(Number(anno), Number(mes) - 1, Number(dia));
  // Un `2026-02-31` cae en marzo: se rechaza en vez de correr el dia sin decirlo.
  return fechaDeUnDia(fecha) === valor ? fecha : undefined;
}

/**
 * Lo que se LEE en el campo: `20/09/2026`.
 *
 * Lo que no es ISO sale **tal cual**, y es deliberado: el valor de un campo de fecha tambien puede
 * venir de `DatosDeLaPantalla.valores`, y ahi lo pone el sistema ya formateado como quiera. Una
 * conversion que se aplicara a ciegas reescribiria lo que otro decidio.
 */
export function fechaLeida(valor: string): string {
  const partes = ISO.exec(valor);
  if (partes === null) return valor;
  const [, anno, mes, dia] = partes;
  return `${String(dia)}/${String(mes)}/${String(anno)}`;
}
