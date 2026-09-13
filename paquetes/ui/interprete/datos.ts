/**
 * Lo que el interprete sabe de los datos de una pantalla — **y lo poco que puede saber** (#27).
 *
 * Sube tal cual de `rentas/frontend/src/pantallas/datos.ts` (`rentas`#97).
 *
 * <h2>Por que esto entra por parametro y no lo averigua el interprete</h2>
 *
 * Porque saber si una pantalla tiene backend exige saber **que operaciones declara esa hoja** y
 * **cuales sirve el sistema que la dibuja**, y las dos cosas son de ese sistema. Esta libreria no
 * puede nombrarlas —lo vigila `verificaciones/sin-suponer-un-sistema.test.ts`—, asi que el
 * interprete recibe **el resultado**: hay dato, o no lo hay y por este motivo. Quien lo calcula es
 * la costura de cada sistema, que si puede saberlo.
 *
 * <h2>Por que la ausencia trae DOS frases y no una</h2>
 *
 * Medido en `rentas` sobre sus cuarenta pantallas: 33 no tenian ninguna operacion servida. O sea que
 * el caso normal es el hueco, no el dato, y un hueco con una raya y nada mas no distingue «esto
 * todavia no esta conectado» de «esto esta roto» de «aqui no hay nada que ver». Por eso van dos:
 *
 *   · **`enElCampo`** — lo corto, en el hueco de cada campo. Se lee muchas veces por pantalla.
 *   · **`explicacion`** — la frase entera, UNA vez arriba. Dice por que.
 */

/** Por que no hay dato, dicho de las dos formas que la pantalla necesita. */
export interface Ausencia {
  /** Lo corto, dentro del hueco de un campo. Una o dos palabras. */
  readonly enElCampo: string;
  /** La frase que lo explica, una sola vez por pantalla. */
  readonly explicacion: string;
  /** `info` cuando es esperado; `atencion` cuando alguien deberia mirarlo. */
  readonly tono: 'info' | 'atencion';
}

/** La coordenada de un campo dentro de una pantalla: `bloque|campo`. */
export type Coordenada = `${number}|${number}`;

/** Lo que se sabe de los datos de una pantalla. */
export interface DatosDeLaPantalla {
  /** El valor de cada campo de solo lectura que SI se sabe. */
  readonly valores?: ReadonlyMap<Coordenada, string>;
  /** Las filas de la tabla de cada bloque que SI se sabe, por indice de bloque. */
  readonly filas?: ReadonlyMap<number, readonly (readonly string[])[]>;
  /** El conteo del encabezado de una tabla. Sin el, se cuentan las filas que haya. */
  readonly conteos?: ReadonlyMap<number, string>;
  /** Que decir donde no hay. Obligatorio: un hueco sin motivo es peor que el hueco. */
  readonly ausencia: Ausencia;
  /**
   * La palabra del hueco para campos CONCRETOS, cuando su motivo no es el de la pantalla.
   *
   * El caso que lo justifica: una pantalla que SI pidio sus datos y los recibio, y de la que la
   * operacion **no publica** algunos campos. Decir ahi «sin conectar» —el motivo de la pantalla—
   * seria falso: si esta conectada. Lo que falta es el dato.
   */
  readonly ausenciaPorCampo?: ReadonlyMap<Coordenada, string>;
}

/** La coordenada de un campo. */
export const coordenada = (bloque: number, campo: number): Coordenada => `${bloque}|${campo}`;
