import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

import type { FilaDeLaTabla } from './datos.ts';
import type { SitioDeLaHoja } from './hoja.ts';
import { valorDeLaFila } from './reglas-de-las-tablas.ts';
import { destinoDeLaTecla, EN_UNA_LISTA } from './teclado.ts';
import type { EleccionDeLaFila } from './tipos.ts';

/**
 * **La fila elegible de una tabla: cual esta elegida, cual tiene el foco, y que hacen el raton y el
 * teclado sobre ella** (#95; aparte desde #120).
 *
 * Salio de `TablaDelBloque`, donde eran cincuenta lineas de la misma funcion que dibujaba las
 * celdas. El patron, el teclado y por que un boton de la fila no la elige, en el docblock de
 * `EleccionDeLaFila` (`tipos.ts`). Lo que queda aqui es la mecanica:
 *
 * · **La elegida es la que dice el sitio** —la ruta, o el estado de la tabla sin `hoja`—: recargar
 *   la conserva. Elegir escribe en UN movimiento, y elegir la que ya esta elegida no lo mueve.
 * · **El foco se sigue por el VALOR de la fila, y no por su indice**: la pagina cambia, y el indice
 *   3 de otra pagina es otra fila. A donde va con cada tecla lo dice `destinoDeLaTecla`, el mismo
 *   del maestro y las pestanas.
 * · **El tabulador entra por una sola**: la que tiene el foco si sigue a la vista; si no, la
 *   elegida; si no, la primera elegible.
 *
 * Sin `eleccion`, `elige` es `false` y la fila no gana ni un atributo: se llama igual, porque es un
 * hook.
 */
export interface EleccionDeLasFilas {
  /** Si la tabla elige filas. Sin `eleccion`, nada de lo demas se usa. */
  readonly elige: boolean;
  /** Lo que la fila escribe en la ruta, o `null` si no es elegible. */
  readonly valorDe: (fila: FilaDeLaTabla) => string | null;
  /** La elegida, por su valor. */
  readonly elegida: string | null;
  /** La que lleva el tabulador (`tabIndex=0`). */
  readonly activa: string | undefined;
  readonly alPulsar: (evento: KeyboardEvent<HTMLTableRowElement>, valor: string) => void;
  readonly alClicar: (evento: MouseEvent<HTMLTableRowElement>, valor: string) => void;
  /** La referencia de una fila elegible: es a donde se lleva el foco. */
  readonly anotar: (valor: string) => (elemento: HTMLTableRowElement | null) => void;
}

export function useEleccionDeLaFila(
  eleccion: EleccionDeLaFila | undefined,
  dibujadas: readonly FilaDeLaTabla[] | undefined,
  sitio: SitioDeLaHoja,
): EleccionDeLasFilas {
  // La fila con el foco del tabulador itinerante, por su valor y no por su indice: la pagina cambia.
  const [foco, fijarFoco] = useState<string | null>(null);
  const filasElegibles = useRef(new Map<string, HTMLTableRowElement>());

  const valorDe = (fila: FilaDeLaTabla): string | null => (eleccion === undefined ? null : valorDeLaFila(eleccion, fila));
  const elegida = eleccion === undefined ? null : sitio.leer(eleccion.enLaRuta);
  const elegibles = (dibujadas ?? []).flatMap((fila) => {
    const valor = valorDe(fila);
    return valor === null ? [] : [valor];
  });
  const activa = [foco, elegida].find((valor) => valor !== null && elegibles.includes(valor)) ?? elegibles[0];

  const elegir = (valor: string): void => {
    if (eleccion === undefined || valor === elegida) return;
    sitio.fijar({ [eleccion.enLaRuta]: valor });
  };

  return {
    elige: eleccion !== undefined,
    valorDe,
    elegida,
    activa,
    alPulsar: (evento, valor) => {
      // Una tecla que nace en un boton de la fila es de ese boton: Intro sobre «Anular» no elige.
      if (evento.target !== evento.currentTarget) return;
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        elegir(valor);
        return;
      }
      const destino = destinoDeLaTecla(evento.key, elegibles.indexOf(valor), elegibles.length, EN_UNA_LISTA);
      if (destino === null) return;
      evento.preventDefault();
      const hacia = elegibles[destino];
      if (hacia === undefined) return;
      fijarFoco(hacia);
      filasElegibles.current.get(hacia)?.focus();
    },
    alClicar: (evento, valor) => {
      // Un clic en un mando de la fila —una accion, tambien la impedida— es de ese mando.
      if (nacioEnUnMando(evento.target, evento.currentTarget)) return;
      fijarFoco(valor);
      elegir(valor);
    },
    anotar: (valor) => (elemento) => {
      if (elemento === null) filasElegibles.current.delete(valor);
      else filasElegibles.current.set(valor, elemento);
    },
  };
}

/** Los mandos que pueden ir dentro de una fila: lo que se pulsa en ellos es suyo, no de la fila. */
const MANDOS = 'button, a[href], input, select, textarea, summary, [role="button"], [role="link"]';

/** Si el evento nacio en un mando DENTRO de la fila, y no en la fila o en una de sus celdas (#95). */
function nacioEnUnMando(objetivo: EventTarget, fila: HTMLElement): boolean {
  if (!(objetivo instanceof Element)) return false;
  const mando = objetivo.closest(MANDOS);
  return mando !== null && mando !== fila && fila.contains(mando);
}
