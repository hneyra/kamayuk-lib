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
  /**
   * Que decir donde no hay. Obligatorio: un hueco sin motivo es peor que el hueco.
   *
   * Con `explicacion: ''` no se dibuja la alerta de arriba (#44): una hoja cuyos estados van por
   * lectura no tiene una sola frase para la pantalla entera, y una caja de color vacia es
   * exactamente el hueco en blanco que esto existe para evitar.
   */
  readonly ausencia: Ausencia;
  /**
   * La palabra del hueco para campos CONCRETOS, cuando su motivo no es el de la pantalla.
   *
   * El caso que lo justifica: una pantalla que SI pidio sus datos y los recibio, y de la que la
   * operacion **no publica** algunos campos. Decir ahi «sin conectar» —el motivo de la pantalla—
   * seria falso: si esta conectada. Lo que falta es el dato.
   */
  readonly ausenciaPorCampo?: ReadonlyMap<Coordenada, string>;
  /** El estado de cada lectura, por la `clave` con que la nombra la definicion (#44). */
  readonly lecturas?: ReadonlyMap<string, EstadoDeUnaLectura>;
  /**
   * Los datos que las piezas leen por su nombre (#44). Los nombres los elige el sistema —con
   * puntos, si quiere: `marco.ejercicio`—, y un dato que todavia no llego **no se pone**.
   */
  readonly nombrados?: ReadonlyMap<string, DatoConNombre>;
}

/** La coordenada de un campo. */
export const coordenada = (bloque: number, campo: number): Coordenada => `${bloque}|${campo}`;

/**
 * **Lo que el interprete dibuja de un fallo**: el peldano que el sistema YA resolvio (#44, AC-3).
 *
 * <h2>Por que es un subconjunto ESTRUCTURAL y no el `Peldano` de `@kamayuk/sesion`</h2>
 *
 * Porque `@kamayuk/ui` no importa `@kamayuk/sesion`, y porque #52 cambia `peldanoDe` a la vez que
 * esto: gana un peldano para el 409, otro para `ORDEN_NO_ADMITIDO`, la `incidencia` y sus textos
 * como dato. Lo que la pieza necesita son **cuatro campos de texto**, y los cuatro tienen el mismo
 * nombre alli: un `Peldano` de hoy y el de despues de #52 se pasan tal cual, porque TypeScript
 * compara la forma y los campos de mas no estorban.
 *
 * **Nada de esto pasa por `traducir`**: el titulo y el remedio ya vienen en el idioma de la sesion
 * —del saco de `@kamayuk/sesion`— y el `detalle` es lo que dijo el servidor.
 */
export interface PeldanoDeUnFallo {
  readonly titulo: string;
  /** Lo que paso. Cuando el backend lo dijo, es lo que el backend dijo. */
  readonly detalle: string;
  /** Que hacer para salir de aqui. */
  readonly remedio?: string;
  /** El identificador con el que soporte encuentra la causa de un 5xx. Ver #52. */
  readonly incidencia?: string | null;
}

/**
 * Los cuatro estados de UNA lectura (#44, `estados-de-una-lectura`).
 *
 * <table>
 *   <tr><td>`en-espera`</td><td>falta el sujeto para poder pedir: no hay nada que pedir todavia. Es
 *     el «vacio» del AC-3, y el `enEspera` del `<Lectura>` de la V6 de `catastro`</td></tr>
 *   <tr><td>`pidiendo`</td><td>se esta pidiendo. **Nunca una cifra**: barras y una palabra</td></tr>
 *   <tr><td>`fallo`</td><td>fallo, con su peldano ya resuelto</td></tr>
 *   <tr><td>`con-datos`</td><td>contesto: la pieza se dibuja con lo que haya en los datos</td></tr>
 * </table>
 *
 * La lectura que contesta **una lista vacia** no es un quinto estado: contesto, y lo que esta
 * vacio es su tabla, que dice por que con su propia frase (`tabla-con-vacio`, #65).
 */
export type EstadoDeUnaLectura =
  | { readonly estado: 'en-espera' }
  | { readonly estado: 'pidiendo' }
  | {
      readonly estado: 'fallo';
      readonly peldano: PeldanoDeUnFallo;
      /** Las lineas que el servidor da ademas del mensaje: los `detalles` del problema. */
      readonly detalles?: readonly string[];
      /** Lo que falta publicar o sellar para que esto conteste, ya dicho en una frase por el sistema. */
      readonly loQueFalta?: string;
      /** `mal` por omision. `atencion` cuando no es una averia: lo decide el sistema con su peldano. */
      readonly tono?: 'mal' | 'atencion';
      /**
       * Presente **solo si reintentar puede cambiar algo**. Un privilegio que falta sale igual las
       * veces que se pulse, y ofrecer el boton ahi manda a insistir sobre algo ya imposible.
       */
      readonly reintentar?: () => void;
    }
  | { readonly estado: 'con-datos' };

/**
 * Un dato con nombre, que leen `cuando` y `Texto` (#44).
 *
 * **Sin `number`**: una cifra llega ya formateada por el sistema, igual que `valores`. En coma
 * flotante un importe pierde el centimo antes de llegar a la pantalla (regla 1), y el formato de
 * una cifra es de `@kamayuk/formato`, no de quien la dibuja.
 */
export type DatoConNombre = string | boolean | null;
