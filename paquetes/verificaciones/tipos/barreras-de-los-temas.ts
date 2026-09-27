import type { Combinacion, Identidad, Modo, ReglasDeLosTemas } from '../../ui/temas/derivar.ts';
import type { Modo as ModoPublicado } from '../../ui/index.ts';

/**
 * LAS BARRERAS DE TIPO de los temas (#124). Son pruebas DEL COMPILADOR, como las de
 * `barreras-de-tipos.tsx`: cada `@ts-expect-error` esta sobre algo que hoy no compila, y si manana
 * compilara, `yarn typecheck` sale rojo por la directiva no usada (TS2578).
 *
 * <h2>Lo que vigilan</h2>
 *
 * Hasta #124 `REGLAS` era un `Record<string, …>`, las combinaciones una lista de cadenas escrita a
 * mano y el modo se leia mirando si la clave acababa en `/oscuro`. Una combinacion sin sus reglas
 * compilaba, y la decia un `throw` al derivar (medido: sin `sepia/oscuro`, `tsc` RC=0). Ahora la
 * clave es `Combinacion` —`${Identidad}/${Modo}`— y las reglas son de todas las que no son un
 * origen. Estas barreras dicen que eso sigue siendo cierto.
 */

/** Unas reglas cualesquiera, para quitarles o anadirles una entrada sin escribir las cinco. */
declare const reglas: ReglasDeLosTemas;

/**
 * Las de UNA combinacion, como tipo y no leidas de `reglas`: leidas, con `noUncheckedIndexedAccess`
 * y unas reglas aflojadas a `Record<string, …>`, darian `… | undefined`, y ese error ajeno
 * satisfaria las directivas de abajo sin que la barrera midiera nada. Medido al romperla.
 */
declare const unaRegla: ReglasDeLosTemas['sepia/oscuro'];

/** Las reglas sin las de `sepia/oscuro`: lo que quedaria al borrarlas. */
declare const sinSepiaOscuro: Omit<ReglasDeLosTemas, 'sepia/oscuro'>;

// @ts-expect-error sin las reglas de `sepia/oscuro`, esa combinacion no tendria de donde derivarse
export const faltaUnaCombinacion: ReglasDeLosTemas = sinSepiaOscuro;

export const barrerasDeLasReglas: readonly ReglasDeLosTemas[] = [
  // @ts-expect-error `institucional/claro` ES un origen: no se deriva, y unas reglas suyas lo moverian
  { ...reglas, 'institucional/claro': unaRegla },
  // @ts-expect-error `clasico/claro` tampoco (#56): es el otro origen
  { ...reglas, 'clasico/claro': unaRegla },
  // @ts-expect-error una combinacion que no existe: un tercer modo no lo dibuja nadie
  { ...reglas, 'sepia/penumbra': unaRegla },
];

/** Una combinacion es una identidad y un modo, y nada mas. */
export const barrerasDeLaCombinacion: readonly Combinacion[] = [
  'sepia/oscuro',
  // @ts-expect-error una identidad que no es de las cuatro
  'verde/claro',
  // @ts-expect-error sin la barra no es una combinacion
  'sepia',
];

/** Igualdad EXACTA de dos tipos: ni mas ancho ni mas estrecho. */
type Igual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * **Un solo `Modo`, y es el publicado**: el que exporta `index.ts` —desde `ProveedorDeTema`— y el de
 * las reglas son el mismo tipo, y es exactamente `'claro' | 'oscuro'`. Hasta #124 eran dos
 * declaraciones que coincidian por costumbre. Sin `@ts-expect-error`: esto TIENE que compilar.
 */
export const unSoloModo: Igual<Modo, ModoPublicado> = true;
export const elModoEsElDeSiempre: Igual<ModoPublicado, 'claro' | 'oscuro'> = true;

/** Y la identidad, la de siempre: los sistemas la pasan como `identidadPorOmision`. */
export const laIdentidadEsLaDeSiempre: Igual<Identidad, 'institucional' | 'alto-contraste' | 'sepia' | 'clasico'> =
  true;
