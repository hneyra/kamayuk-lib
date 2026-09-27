/**
 * **El tabulador itinerante: a donde va el foco con cada tecla** (#120).
 *
 * Tres piezas mueven el foco entre sus hijas con las flechas, Inicio y Fin: la tabla con filas
 * elegibles (#95), la lista del maestro (#67) y las pestanas (#67). Hasta #120 cada una lo
 * escribia con su cadena de ternarios, y solo cambiaban tres cosas: el **eje** —↑/↓ en una lista,
 * ←/→ en unas pestanas—, si al pasar del extremo **se da la vuelta** —las pestanas si, como pide
 * WAI-ARIA; una lista no— y si la pieza sigue a su hija por el indice o por su valor. Lo ultimo es
 * de quien llama: esto contesta con un indice, y la tabla lo traduce a su valor.
 *
 * Pura, y sin `KeyboardEvent`: se prueba con una tabla de casos, sin montar nada. `null` es «esta
 * tecla no mueve el foco», y entonces quien llama no hace `preventDefault`.
 */

/** Como se mueve el foco en una pieza. */
export interface ComoSeMueveElFoco {
  /** `vertical`: ↑ y ↓. `horizontal`: ← y →. Inicio y Fin valen en los dos. */
  readonly eje: 'vertical' | 'horizontal';
  /** Si pasar del ultimo lleva al primero, y al reves. Sin ella, el extremo se queda donde esta. */
  readonly vuelta: boolean;
}

/** Las filas de una tabla y la lista del maestro: arriba y abajo, y el extremo se queda. */
export const EN_UNA_LISTA: ComoSeMueveElFoco = { eje: 'vertical', vuelta: false };

/** Las pestanas: a los lados, y dando la vuelta. */
export const EN_UNAS_PESTANAS: ComoSeMueveElFoco = { eje: 'horizontal', vuelta: true };

/**
 * El indice al que va el foco desde `indice` con `tecla`, entre `cuantas` hijas; o `null` si la tecla
 * no es de las que lo mueven, o si no hay ninguna hija.
 */
export function destinoDeLaTecla(
  tecla: string,
  indice: number,
  cuantas: number,
  { eje, vuelta }: ComoSeMueveElFoco,
): number | null {
  if (cuantas <= 0) return null;
  const ultima = cuantas - 1;
  const siguiente = eje === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  const anterior = eje === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  switch (tecla) {
    case siguiente:
      return vuelta ? (indice + 1) % cuantas : Math.min(indice + 1, ultima);
    case anterior:
      return vuelta ? (indice - 1 + cuantas) % cuantas : Math.max(indice - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return ultima;
    default:
      return null;
  }
}
