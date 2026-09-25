import { useRef, useState } from 'react';

/**
 * **Lo que esta en vuelo, dicho una vez** (#117): el patron que el acto y la fila de acciones
 * escribian cada uno a su manera, y que ya habia divergido.
 *
 * Hasta #117, `ActoDeLaPantalla` capturaba el manejador que lanzaba en sincrono —el acto decia
 * «rechazado»— y `GrupoDeAcciones` no: `const resultado = operacion();` sin `try`, la excepcion
 * salia del manejador de clic de React y la pantalla no decia nada. Medido: la prueba del `hace` que
 * lanza, en `actos.test.tsx`, salia roja con la excepcion recogida en `window`.
 *
 * <h2>Lo que pasa cuando la llamada lanza en sincrono, decidido</h2>
 *
 * **Lo mismo que cuando su promesa se rechaza**: el boton se suelta, la excepcion no sale de aqui y
 * `alAcabar(false)`. Decir «fallo» **no es de esta pieza**: el acto lo dice porque su definicion
 * tiene `alFallar` y el aviso de rechazo; una operacion del pie o de una fila no tiene ninguno, y lo
 * que haya ido mal lo pone el sistema en `lecturas`, como con la promesa rechazada. Una excepcion que
 * se escapa no lo dice mejor: sale a la consola de quien no mira, y en React 19 va a `reportError`.
 *
 * <h2>Por que un estado Y una referencia</h2>
 *
 * El estado llega una pintada tarde: la segunda pulsacion de un doble clic veria el boton libre y
 * volveria a llamar —dos pulsaciones, dos altas, y la segunda contesta «ya existe»—. La referencia no
 * espera a pintar, y es la que de verdad corta la segunda llamada; el estado es el que se dibuja.
 *
 * Interno: no sale por el indice.
 */
export interface EnVuelo<K> {
  /** Si lo de `clave` esta pendiente: lo que se dibuja (`enCurso`, `aria-busy`). */
  readonly enCurso: (clave: K) => boolean;
  /**
   * Llama a `llamar` si lo de `clave` no esta ya en vuelo. Si devuelve una promesa, `clave` queda en
   * curso hasta que acabe; si no, acaba en el acto. **Si lanza, acaba mal**, igual que una promesa
   * rechazada: `alAcabar(false)`, y la excepcion no sale.
   */
  readonly lanzar: (clave: K, llamar: () => unknown, alAcabar?: (bien: boolean) => void) => void;
}

export function useEnVuelo<K>(): EnVuelo<K> {
  const [pendientes, setPendientes] = useState<ReadonlySet<K>>(() => new Set());
  const enVuelo = useRef(new Set<K>());

  const marcar = (clave: K, esta: boolean): void => {
    if (esta) enVuelo.current.add(clave);
    else enVuelo.current.delete(clave);
    setPendientes((antes) => {
      const despues = new Set(antes);
      if (esta) despues.add(clave);
      else despues.delete(clave);
      return despues;
    });
  };

  const lanzar = (clave: K, llamar: () => unknown, alAcabar?: (bien: boolean) => void): void => {
    if (enVuelo.current.has(clave)) return;
    marcar(clave, true);
    const acabar = (bien: boolean): void => {
      marcar(clave, false);
      alAcabar?.(bien);
    };
    let resultado: unknown;
    try {
      resultado = llamar();
    } catch {
      acabar(false);
      return;
    }
    if (resultado instanceof Promise) {
      resultado.then(
        () => {
          acabar(true);
        },
        () => {
          acabar(false);
        },
      );
    } else {
      acabar(true);
    }
  };

  return { enCurso: (clave) => pendientes.has(clave), lanzar };
}
