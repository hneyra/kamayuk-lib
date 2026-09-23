// @vitest-environment node
//
// El reductor es puro: ni un DOM, ni React, ni el enrutador (#119, AC2).

import { describe, expect, it } from 'vitest';

import type { LoTecleado } from '../ui/index.ts';

import { REGISTRO_VACIO, cambiarElRegistro, type CambioDelRegistro, type RegistroDeHojas } from './registro-de-hojas.ts';

/**
 * **El registro de las hojas, transición por transición** (#119, AC2).
 *
 * Lo que las suites de #86 (`lo-tecleado-sobrevive.test.tsx`) prueban montando el armazón entero,
 * aquí se prueba sobre el reductor solo: `marcar`, `limpiar`, `teclear` y `dejar`, cada una con lo
 * que cambia, lo que NO cambia y cuándo devuelve el mismo objeto. La que más importa es la opción C
 * de #86: **dejar una hoja olvida lo tecleado sólo si no está sucia**.
 */

const ESCRITO: LoTecleado = { campos: { apunte: 'lo escrito' }, actos: {} };
const OTRO: LoTecleado = { campos: { apunte: 'otra cosa' }, actos: {} };

/** Aplica los cambios en orden, desde el registro vacío. */
function tras(...cambios: readonly CambioDelRegistro[]): RegistroDeHojas {
  return cambios.reduce(cambiarElRegistro, REGISTRO_VACIO);
}

const teclear = (clave: string, lo: LoTecleado = ESCRITO): CambioDelRegistro => ({
  tipo: 'teclear',
  clave,
  cambio: () => lo,
});

/** Una hoja `a` sucia y con lo tecleado, y una `b` con lo tecleado y limpia. */
const A_SUCIA_B_LIMPIA = tras({ tipo: 'marcar', clave: 'a' }, teclear('a'), teclear('b', OTRO));

describe('`marcar`', () => {
  it('pone la hoja en `sucias` y no toca lo tecleado', () => {
    const despues = tras({ tipo: 'marcar', clave: 'a' });
    expect([...despues.sucias]).toEqual(['a']);
    expect(despues.tecleado).toBe(REGISTRO_VACIO.tecleado);
  });

  it('sobre una hoja ya sucia devuelve EL MISMO registro: React no vuelve a pintar', () => {
    expect(cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'marcar', clave: 'a' })).toBe(A_SUCIA_B_LIMPIA);
  });
});

describe('`teclear`', () => {
  it('guarda lo que devuelve el cambio, que recibe lo que habia', () => {
    const recibido: (LoTecleado | undefined)[] = [];
    const cambio = (antes: LoTecleado | undefined): LoTecleado => {
      recibido.push(antes);
      return OTRO;
    };
    const despues = tras(teclear('a'), { tipo: 'teclear', clave: 'a', cambio });
    expect(recibido).toEqual([ESCRITO]);
    expect(despues.tecleado.get('a')).toBe(OTRO);
  });

  it('no ensucia la hoja: eso lo decide la pantalla con `marcar` (#86, `suciaAlTeclear`)', () => {
    expect(tras(teclear('a')).sucias.size).toBe(0);
  });

  it('no toca lo de otra hoja', () => {
    expect(cambiarElRegistro(A_SUCIA_B_LIMPIA, teclear('a', OTRO)).tecleado.get('b')).toBe(OTRO);
  });
});

describe('`limpiar`: se guardó o se descartó', () => {
  it('saca la hoja de `sucias` Y olvida lo tecleado', () => {
    const despues = cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'limpiar', clave: 'a' });
    expect(despues.sucias.has('a')).toBe(false);
    expect(despues.tecleado.has('a'), 'guardada, la hoja sigue guardando lo tecleado').toBe(false);
  });

  it('olvida lo tecleado aunque la hoja no estuviera sucia: guardar SIN salir (la (5) de #86)', () => {
    const despues = cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'limpiar', clave: 'b' });
    expect(despues.tecleado.has('b'), 'guardada, la hoja sigue guardando lo tecleado').toBe(false);
    expect(despues.sucias).toBe(A_SUCIA_B_LIMPIA.sucias);
  });

  it('no toca la otra hoja', () => {
    const despues = cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'limpiar', clave: 'a' });
    expect(despues.tecleado.get('b')).toBe(OTRO);
  });

  it('sobre una hoja sin nada devuelve EL MISMO registro', () => {
    expect(cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'limpiar', clave: 'z' })).toBe(A_SUCIA_B_LIMPIA);
  });
});

describe('`dejar`: se salió de la hoja por cualquier camino (#86, opción C)', () => {
  it('SUCIA: lo tecleado se conserva —el árbol dice «SIN GUARDAR» y tiene razón al volver—', () => {
    const despues = cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'dejar', clave: 'a' });
    expect(despues.tecleado.get('a'), 'se olvido lo tecleado de una hoja SUCIA').toBe(ESCRITO);
    expect(despues, 'dejar una hoja sucia no cambia nada').toBe(A_SUCIA_B_LIMPIA);
  });

  it('LIMPIA: lo tecleado se olvida —la `key` por destino sirve de algo—', () => {
    const despues = cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'dejar', clave: 'b' });
    expect(despues.tecleado.has('b'), 'una hoja limpia conservo lo tecleado').toBe(false);
    expect(despues.tecleado.get('a')).toBe(ESCRITO);
    expect(despues.sucias).toBe(A_SUCIA_B_LIMPIA.sucias);
  });

  it('una hoja sin nada devuelve EL MISMO registro', () => {
    expect(cambiarElRegistro(A_SUCIA_B_LIMPIA, { tipo: 'dejar', clave: 'z' })).toBe(A_SUCIA_B_LIMPIA);
  });
});

describe('el reductor no muta lo que recibe', () => {
  it('ninguna transición toca el registro de antes', () => {
    const sucias = [...A_SUCIA_B_LIMPIA.sucias];
    const tecleado = [...A_SUCIA_B_LIMPIA.tecleado];
    for (const cambio of [
      { tipo: 'marcar', clave: 'c' },
      { tipo: 'limpiar', clave: 'a' },
      teclear('a', OTRO),
      { tipo: 'dejar', clave: 'b' },
    ] satisfies readonly CambioDelRegistro[]) {
      cambiarElRegistro(A_SUCIA_B_LIMPIA, cambio);
    }
    expect([...A_SUCIA_B_LIMPIA.sucias]).toEqual(sucias);
    expect([...A_SUCIA_B_LIMPIA.tecleado]).toEqual(tecleado);
    expect(REGISTRO_VACIO.sucias.size + REGISTRO_VACIO.tecleado.size).toBe(0);
  });
});
