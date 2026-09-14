/**
 * **Lo que el interprete necesita del marco para leer y escribir la ruta de una hoja** (#67).
 *
 * <h2>Por que estos tipos viven en `@kamayuk/ui` y no en `@kamayuk/shell`</h2>
 *
 * Porque el grafo va en un solo sentido: `@kamayuk/shell` importa `@kamayuk/ui` y no al reves. El
 * interprete no puede nombrar `useHoja()`, asi que declara **la forma** de lo que necesita —la ruta
 * de la hoja, los parametros del marco y como mover la ruta— y el marco la cumple. `HojaAbierta`
 * de `@kamayuk/shell` es un superconjunto estructural de `HojaDelMarco`, y por eso el sistema
 * cablea las dos cosas en una linea: `<Pantalla hoja={useHoja()} … />`. Lo vigila una barrera de
 * tipo en `shell/estado-en-la-ruta.test.tsx`.
 *
 * <h2>La forma de la ruta</h2>
 *
 * `#/<slug>/<sujeto>?<parametro>=<valor>&…`. El slug es del catalogo; el sujeto es lo que la hoja
 * mira —un identificador, un codigo—, y los parametros, lo que se eligio en ella —la pestana, un
 * filtro—. Las dos cosas solo existen si el destino las declara (`Destino.enLaRuta`): lo que no
 * declara, el marco lo ignora con aviso.
 */

/** Lo que la ruta guarda de una hoja. **Solo lo declarado**: lo demas ya lo quito el marco. */
export interface RutaDeLaHoja {
  /** `null` sin sujeto. Nunca `''`: una direccion con la barra y sin sujeto no es de esta forma. */
  readonly sujeto: string | null;
  /** Los parametros, ya descodificados. Uno vacio no esta. */
  readonly parametros: Readonly<Record<string, string>>;
}

/**
 * Un cambio de la ruta de la MISMA hoja. **Lo que no se nombra se queda**; `null` lo quita.
 *
 * Es un cambio y no una ruta entera a proposito: la pestana no sabe que filtro hay puesto, y si
 * tuviera que reescribir la ruta entera para cambiarse a si misma, borraria el filtro al pasar.
 */
export interface CambioDeLaRuta {
  readonly sujeto?: string | null;
  readonly parametros?: Readonly<Record<string, string | null>>;
}

/** Lo que `<Pantalla hoja>` lee del marco. `useHoja()` de `@kamayuk/shell` ya lo cumple. */
export interface HojaDelMarco {
  readonly ruta: RutaDeLaHoja;
  /**
   * Los parametros globales del marco (`parametro-del-marco`): el ejercicio de la barra, por
   * ejemplo. Los pone el sistema; el interprete los lee como `marco.<clave>`.
   */
  readonly marco?: Readonly<Record<string, string>>;
  readonly moverLaRuta: (cambio: CambioDeLaRuta) => void;
}

/**
 * Donde guarda una pieza lo que se elige en ella: `'sujeto'` es el tramo del camino, y cualquier
 * otro nombre es un parametro. Por eso un destino no puede declarar un parametro llamado `sujeto`.
 */
export type EnLaRuta = string;

/** El sitio de `enLaRuta` que es el tramo del camino y no un parametro. */
export const EL_SUJETO = 'sujeto';

/** Lo que vale `enLaRuta` en una ruta, o `null` si no esta. */
export function valorEnLaRuta(ruta: RutaDeLaHoja, enLaRuta: EnLaRuta): string | null {
  if (enLaRuta === EL_SUJETO) return ruta.sujeto;
  return Object.hasOwn(ruta.parametros, enLaRuta) ? (ruta.parametros[enLaRuta] ?? null) : null;
}

/** El cambio que pone `valor` en `enLaRuta`, y nada mas. */
export function cambioEn(enLaRuta: EnLaRuta, valor: string | null): CambioDeLaRuta {
  return enLaRuta === EL_SUJETO ? { sujeto: valor } : { parametros: { [enLaRuta]: valor } };
}
