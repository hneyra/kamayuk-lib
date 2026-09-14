import type { ComponentProps } from 'react';

import type { Insignia } from '../Insignia.tsx';
import type { TipoDeCampo } from '../shadcn/campos.ts';

/**
 * Los tipos de **una pantalla como dato**: lo que el interprete lee (#27).
 *
 * Suben de `rentas/frontend/src/pantallas/tipos.ts` (UI-5, `rentas`#85), donde nacieron para las
 * cuarenta pantallas de V8. Sube **la mitad que el interprete lee** —campo, tabla, bloque y
 * pantalla— y se queda en cada sistema la otra mitad —el arbol, sus hojas y sus operaciones—: el
 * arbol es de quien tiene los modulos, y la regla de ADR-0030 §4 no deja que una libreria comun
 * sepa cuales son.
 *
 * <h2>Por que dato y no un componente por pantalla</h2>
 *
 * Porque el artboard no dibuja cuarenta pantallas: dibuja **una** que interpreta una tabla, en un
 * solo `bloques(clave)`. Cuarenta componentes escritos a mano divergen a la tercera semana y nadie
 * puede decir cuales; cuarenta definiciones sobre un interprete no pueden.
 *
 * <h2>Por que se llaman `Definicion…` y no `Campo` o `Tabla`</h2>
 *
 * Porque este paquete ya exporta `Campo` y `Tabla`, y son **las piezas** que las dibujan. Un
 * consumidor que importara las dos cosas del mismo sitio tendria dos `Campo` distintos, y el que
 * gana depende del orden del `import`. El sistema que prefiera los nombres cortos los reexporta con
 * alias en su propio arbol, que es lo que hace `rentas`.
 *
 * <h2>Por que los tipos son ESTRECHOS, y no `string`</h2>
 *
 * El tipo de un campo no es texto libre: son **siete** —y su variante de ancho completo—, y el
 * interprete no sabe hacer nada con un octavo. Con `string`, `{ tipo: 'select' }` compilaria y se
 * dibujaria como una caja de texto vacia, en silencio. Con la union no llega ni al `yarn build`.
 *
 * Y el campo es una **union discriminada**: lo que acompana a un desplegable son sus opciones, a
 * una casilla su etiqueta y a un campo que se escribe su ayuda, asi que cada rama nombra lo suyo.
 * Lo vigilan las barreras de `verificaciones/tipos/barreras-de-tipos.tsx`.
 */

/**
 * El mismo tipo con la marca de **ancho completo**.
 *
 * Un `1` al final es lo que el interprete busca —ver `anchoCompleto()`— para sacar el campo de la
 * rejilla y darle la fila entera. Por eso `''` y `'1'` son el mismo control con distinto ancho, y no
 * dos tipos.
 */
export type ConAnchoCompleto<T extends string> = T | `${T}1`;

/** Los catorce valores que un `tipo` puede tomar: los siete de `TipoDeCampo`, con y sin ancho. */
export type TipoDeCampoConAncho = ConAnchoCompleto<TipoDeCampo>;

/** Un desplegable de lista cerrada. Sus opciones son el dato; sin ellas no dibuja nada. */
export interface CampoDeLista {
  readonly etiqueta: string;
  readonly tipo: ConAnchoCompleto<'s'>;
  /** Las opciones, en su orden. La primera es la que el interprete deja seleccionada. */
  readonly opciones: readonly string[];
}

/**
 * Un campo que solo se muestra: lo calcula el backend y la pantalla no lo escribe.
 *
 * **No lleva su valor, y ese es el punto** (`rentas`#97). Una cifra de ejemplo dentro de la
 * definicion viaja en el paquete que se sirve, y en un sistema que maneja dinero una cifra asi
 * **se lee como real**: es peor que un hueco. El valor entra por `DatosDeLaPantalla`, y cuando no
 * esta el hueco dice por que.
 */
export interface CampoDeSoloLectura {
  readonly etiqueta: string;
  readonly tipo: ConAnchoCompleto<'r'>;
}

/** Una casilla. Su texto no es ayuda: es lo que se lee AL LADO de la marca. */
export interface CampoDeCasilla {
  readonly etiqueta: string;
  readonly tipo: ConAnchoCompleto<'c'>;
  /** La etiqueta de la marca. */
  readonly casilla: string;
}

/** Los tipos que se escriben: texto, fecha y area. */
export type TipoDeEntrada = ConAnchoCompleto<'' | 'd' | 'a' | 't'>;

/** Un campo que se escribe, con su ayuda opcional debajo. */
export interface CampoDeEntrada {
  readonly etiqueta: string;
  readonly tipo: TipoDeEntrada;
  /** La linea de ayuda. La mayoria no la lleva. Si dice «opcional», el campo se marca como tal. */
  readonly ayuda?: string;
}

/** Un campo de un bloque, discriminado por su `tipo`. */
export type DefinicionDeCampo = CampoDeLista | CampoDeSoloLectura | CampoDeCasilla | CampoDeEntrada;

/** Una columna de la tabla de un bloque. */
export interface ColumnaDeTabla {
  readonly rotulo: string;
  /**
   * Si la columna va pegada a la derecha.
   *
   * No es cosmetico: son las columnas de cifras, y una cifra alineada a la izquierda no se puede
   * comparar de un vistazo con la de la fila de arriba.
   */
  readonly alineadoDerecha: boolean;
}

/**
 * La tabla que acompana a un bloque.
 *
 * **Sin filas y sin conteo**, por lo mismo que un campo de solo lectura no lleva su valor: lo que
 * se conserva es la FORMA —que columnas hay, cual va a la derecha, cual es la insignia—, que es lo
 * que el interprete necesita para dibujar la tabla con dato o sin el.
 */
export interface DefinicionDeTabla {
  readonly titulo: string;
  readonly columnas: readonly ColumnaDeTabla[];
  /** La linea de debajo: lo que hay que saber para leer la tabla sin equivocarse. */
  readonly nota?: string;
  /** El indice de la columna que se dibuja como insignia, si hay una. */
  readonly columnaDeInsignia?: number;
  /** El rotulo del boton de alta, si la lista admite anadir una fila. */
  readonly accion?: string;
}

/** Un grupo de campos con su titulo, su nota y —a veces— su tabla. */
export interface DefinicionDeBloque {
  readonly titulo: string;
  /** Que ES esta parte de la pantalla. Vacia cuando el titulo ya lo dice todo. */
  readonly nota: string;
  /** Los campos del grupo. Vacio en los bloques que solo traen una tabla. */
  readonly campos: readonly DefinicionDeCampo[];
  readonly tabla?: DefinicionDeTabla;
}

/** Una pantalla. */
export interface DefinicionDePantalla {
  /**
   * La linea de la barra de instruccion: **que hay que hacer aqui**.
   *
   * Va dentro de la pantalla y no en un registro aparte: dos registros paralelos por clave se
   * desincronizan, y una pantalla nueva sin instruccion no daria ningun error. La dibuja
   * `@kamayuk/shell`, no el interprete: el sistema la pasa al catalogo.
   */
  readonly instruccion: string;
  readonly bloques: readonly DefinicionDeBloque[];
}

/**
 * Los tonos de una insignia, **derivados de la pieza** y no copiados.
 *
 * Escribir aqui `'ok' | 'atencion' | 'mal' | 'info'` seria una segunda lista que, el dia que la
 * pieza cambie, se queda vieja **en verde**. Sacandolo de la pieza, no puede.
 */
export type TonoDeInsignia = ComponentProps<typeof Insignia>['tono'];
