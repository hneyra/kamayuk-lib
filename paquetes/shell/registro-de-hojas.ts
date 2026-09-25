import { useEffect, useReducer, useRef } from 'react';

import type { CambioDeLoTecleado, LoTecleado } from '../ui/index.ts';

/**
 * **El registro de las hojas**: cuáles están sucias y qué se tecleó en cada una (#119).
 *
 * Vivía repartido por `Cascara` en dos `useState`, un `useCallback`, un `useRef` y un `useEffect`,
 * con quitar una clave escrito dos veces —en línea para el `Set` y como `sinElDestino` para el
 * `Map`—. Aquí es un **reductor puro**, y eso es lo que deja probar cada transición sin montar nada
 * (`registro-de-hojas.test.ts`).
 *
 * <h2>La regla de #86, opción C, en una línea</h2>
 *
 * **Lo tecleado de una hoja se conserva mientras esa hoja esté en `sucias`.** Las dos colecciones
 * llevan la misma clave —`destino.clave`— y por eso:
 * - `limpiar` borra las dos cosas: una hoja limpia no guarda nada que conservar.
 * - `dejar` olvida lo tecleado **sólo si la hoja no está sucia**: salir sucia por un camino que no
 *   pasa por el aviso —la dirección escrita a mano, el botón de atrás— lo guarda, y el árbol, que
 *   dice «SIN GUARDAR», tiene razón al volver.
 *
 * Cada transición que no cambia nada devuelve **el mismo objeto**: React no vuelve a pintar por un
 * `marcar` sobre una hoja que ya estaba sucia.
 */

export interface RegistroDeHojas {
  /** Las hojas con cambios sin guardar, por `destino.clave`. */
  readonly sucias: ReadonlySet<string>;
  /** Lo tecleado de cada hoja, con la misma clave. El marco no lo lee: lo guarda y lo devuelve. */
  readonly tecleado: ReadonlyMap<string, LoTecleado>;
}

export type CambioDelRegistro =
  /** La hoja tiene cambios sin guardar. */
  | { readonly tipo: 'marcar'; readonly clave: string }
  /** Ya no los tiene: se guardó o se descartó. Olvida también lo tecleado. */
  | { readonly tipo: 'limpiar'; readonly clave: string }
  /** Lo tecleado de la hoja, a partir de lo que había. */
  | { readonly tipo: 'teclear'; readonly clave: string; readonly cambio: CambioDeLoTecleado }
  /** Se salió de la hoja. Olvida lo tecleado **sólo si no está sucia**. */
  | { readonly tipo: 'dejar'; readonly clave: string };

export const REGISTRO_VACIO: RegistroDeHojas = { sucias: new Set(), tecleado: new Map() };

/** La colección sin `clave`. La misma si no la tenía: no hay nada que pintar. */
function sinLaClave(coleccion: ReadonlySet<string>, clave: string): ReadonlySet<string>;
function sinLaClave<T>(coleccion: ReadonlyMap<string, T>, clave: string): ReadonlyMap<string, T>;
function sinLaClave<T>(
  coleccion: ReadonlySet<string> | ReadonlyMap<string, T>,
  clave: string,
): ReadonlySet<string> | ReadonlyMap<string, T> {
  if (!coleccion.has(clave)) return coleccion;
  const queda = coleccion instanceof Map ? new Map<string, T>(coleccion) : new Set(coleccion.keys());
  queda.delete(clave);
  return queda;
}

/** El registro sin lo tecleado de `clave`. El mismo si no había nada. */
function sinLoTecleado(registro: RegistroDeHojas, clave: string): RegistroDeHojas {
  const tecleado = sinLaClave(registro.tecleado, clave);
  return tecleado === registro.tecleado ? registro : { ...registro, tecleado };
}

export function cambiarElRegistro(registro: RegistroDeHojas, cambio: CambioDelRegistro): RegistroDeHojas {
  const { clave } = cambio;
  switch (cambio.tipo) {
    case 'marcar':
      return registro.sucias.has(clave) ? registro : { ...registro, sucias: new Set(registro.sucias).add(clave) };
    case 'limpiar': {
      const sucias = sinLaClave(registro.sucias, clave);
      return sinLoTecleado(sucias === registro.sucias ? registro : { ...registro, sucias }, clave);
    }
    case 'teclear':
      return {
        ...registro,
        tecleado: new Map(registro.tecleado).set(clave, cambio.cambio(registro.tecleado.get(clave))),
      };
    case 'dejar':
      return registro.sucias.has(clave) ? registro : sinLoTecleado(registro, clave);
  }
}

export interface RegistroDeHojasEnUso extends RegistroDeHojas {
  readonly cambiar: (cambio: CambioDelRegistro) => void;
}

/**
 * El registro, con el olvido al salir ya puesto.
 *
 * **El olvido va en un efecto sobre la hoja abierta**, y no dentro de la navegación, porque se sale
 * de una hoja también por caminos que no pasan por ella. Mira `sucias` **dentro del reductor**, con
 * el registro de ese momento y no con el de la última pintada.
 */
export function useRegistroDeHojas(claveAbierta: string | null): RegistroDeHojasEnUso {
  const [registro, cambiar] = useReducer(cambiarElRegistro, REGISTRO_VACIO);
  const laAnterior = useRef<string | null>(null);
  useEffect(() => {
    const dejada = laAnterior.current;
    laAnterior.current = claveAbierta;
    if (dejada !== null && dejada !== claveAbierta) cambiar({ tipo: 'dejar', clave: dejada });
  }, [claveAbierta]);
  return { ...registro, cambiar };
}
