import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LoTecleado } from '../ui/index.ts';

import { useRegistroDeHojas } from './registro-de-hojas.ts';

/**
 * **El olvido al salir, sobre el hook y no sobre el reductor** (#119).
 *
 * `registro-de-hojas.test.ts` prueba que `dejar` hace lo que dice; esto prueba que el efecto de
 * `useRegistroDeHojas` lo despacha **para la hoja que se deja** y no para la que se abre.
 *
 * Lo encontró la verificación independiente de #119: con el efecto despachando `dejar` para
 * `claveAbierta`, las 141 pruebas del armazón seguían verdes. La (2) de #86 no lo ve porque el
 * intérprete se resincroniza en la pintada siguiente —al volver, el efecto sí despacha `dejar` para
 * la hoja a la que se vuelve y lo borra—, pero la PRIMERA pintada de la vuelta recibe lo tecleado
 * viejo: una pantalla que siembre su estado con `useState(hoja.tecleado)` lo enseñaría en una hoja
 * que el árbol no marca «SIN GUARDAR».
 */

const ESCRITO: LoTecleado = { campos: { apunte: 'lo escrito' }, actos: {} };

function montar(inicial: string | null) {
  /** Lo tecleado de `a` en cada pintada, en orden. */
  const pintadasDeA: (LoTecleado | undefined)[] = [];
  const hook = renderHook(
    ({ abierta }: { abierta: string | null }) => {
      const registro = useRegistroDeHojas(abierta);
      pintadasDeA.push(registro.tecleado.get('a'));
      return registro;
    },
    { initialProps: { abierta: inicial } },
  );
  const teclearEnA = () =>
    act(() => {
      hook.result.current.cambiar({ tipo: 'teclear', clave: 'a', cambio: () => ESCRITO });
    });
  return { ...hook, pintadasDeA, teclearEnA };
}

describe('`useRegistroDeHojas`: el olvido es de la hoja que se DEJA', () => {
  it('LIMPIA: al pasar de `a` a `b`, lo tecleado de `a` se olvida ya, no al volver', () => {
    const { result, rerender, teclearEnA } = montar('a');
    teclearEnA();
    expect(result.current.tecleado.get('a')).toEqual(ESCRITO);

    rerender({ abierta: 'b' });
    expect(
      result.current.tecleado.has('a'),
      'se dejo `a` limpia y el registro sigue guardando lo suyo: `dejar` fue para la hoja abierta',
    ).toBe(false);
  });

  it('LIMPIA: al volver a `a`, NINGUNA pintada —tampoco la primera— ve lo tecleado de antes', () => {
    const { rerender, teclearEnA, pintadasDeA } = montar('a');
    teclearEnA();
    rerender({ abierta: 'b' });

    const desde = pintadasDeA.length;
    rerender({ abierta: 'a' });
    expect(
      pintadasDeA.slice(desde),
      'la primera pintada de la vuelta recibio lo tecleado de una hoja que el arbol no marca',
    ).toEqual(pintadasDeA.slice(desde).map(() => undefined));
  });

  it('SUCIA: al pasar de `a` a `b`, lo tecleado de `a` se conserva (#86, opcion C)', () => {
    const { result, rerender, teclearEnA } = montar('a');
    teclearEnA();
    act(() => {
      result.current.cambiar({ tipo: 'marcar', clave: 'a' });
    });

    rerender({ abierta: 'b' });
    expect(result.current.tecleado.get('a')).toEqual(ESCRITO);
  });
});
