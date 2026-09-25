import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearRebote, type Rebote } from './rebote.ts';

/**
 * **El almacen del rebote, solo** (#122).
 *
 * `identidad.test.ts` lo prueba a traves de la puerta —la ida, el canje, los dos frenos—. Aqui se
 * miran sus metodos uno a uno, y sobre todo el que decide que un codigo no se canjee dos veces:
 * **`tomarIda` lee y BORRA**.
 */

const PREFIJO = 'kamayuk.rentas';
const VERIFICADOR = `${PREFIJO}.pkce.verificador`;
const ESTADO = `${PREFIJO}.pkce.estado`;
const DESTINO = `${PREFIJO}.pkce.destino`;
const IDAS = `${PREFIJO}.pkce.idas`;
const SALIDA = `${PREFIJO}.pkce.salida`;

const IDA = { verificador: 'el-verificador', estado: 'el-estado', destino: '#padron' } as const;

let rebote: Rebote;

beforeEach(() => {
  sessionStorage.clear();
  rebote = crearRebote(PREFIJO);
});

afterEach(() => {
  sessionStorage.clear();
});

describe('la ida se guarda y se toma una sola vez', () => {
  it('guardarIda deja las tres claves con el prefijo', () => {
    rebote.guardarIda(IDA);

    expect(sessionStorage.getItem(VERIFICADOR)).toBe('el-verificador');
    expect(sessionStorage.getItem(ESTADO)).toBe('el-estado');
    expect(sessionStorage.getItem(DESTINO)).toBe('#padron');
  });

  it('tomarIda LEE Y BORRA: la segunda vez no queda nada', () => {
    rebote.guardarIda(IDA);

    expect(rebote.tomarIda()).toEqual(IDA);
    expect(sessionStorage.getItem(VERIFICADOR)).toBeNull();
    expect(sessionStorage.getItem(ESTADO)).toBeNull();
    expect(sessionStorage.getItem(DESTINO)).toBeNull();
    expect(rebote.tomarIda()).toEqual({ verificador: null, estado: null, destino: null });
  });

  it('una vuelta sin ida lo dice campo por campo, sin inventar nada', () => {
    expect(rebote.tomarIda()).toEqual({ verificador: null, estado: null, destino: null });
  });

  it('tomarIda no toca los frenos: la cuenta de idas sigue', () => {
    rebote.guardarIda(IDA);
    rebote.contarIda();
    rebote.tomarIda();

    expect(rebote.idas()).toBe(1);
  });
});

describe('los dos frenos', () => {
  it('contarIda suma una, y levanta la marca de salida', () => {
    rebote.marcarSalida();
    rebote.contarIda();
    rebote.contarIda();

    expect(rebote.idas()).toBe(2);
    expect(rebote.vieneDeSalir()).toBe(false);
    expect(sessionStorage.getItem(SALIDA)).toBeNull();
  });

  it('sin ninguna ida, la cuenta es cero', () => {
    expect(rebote.idas()).toBe(0);
  });

  it('olvidarLasIdas pone la cuenta a cero y no toca nada mas', () => {
    rebote.guardarIda(IDA);
    rebote.contarIda();
    rebote.olvidarLasIdas();

    expect(rebote.idas()).toBe(0);
    expect(sessionStorage.getItem(VERIFICADOR)).toBe('el-verificador');
  });

  it('marcarSalida pone la marca y la cuenta a cero', () => {
    rebote.contarIda();
    rebote.marcarSalida();

    expect(rebote.vieneDeSalir()).toBe(true);
    expect(sessionStorage.getItem(IDAS)).toBeNull();
  });

  it('olvidarLaParada levanta los dos', () => {
    rebote.contarIda();
    rebote.marcarSalida();
    rebote.contarIda();
    rebote.marcarSalida();
    rebote.olvidarLaParada();

    expect(rebote.idas()).toBe(0);
    expect(rebote.vieneDeSalir()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('las claves', () => {
  it('son cinco, todas con el prefijo, y ninguna nombra una credencial', () => {
    rebote.guardarIda(IDA);
    rebote.contarIda();
    rebote.marcarSalida();
    rebote.contarIda();
    // `contarIda` levanta la salida; se vuelve a poner a mano para ver las cinco a la vez.
    sessionStorage.setItem(SALIDA, '1');

    const claves = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i));
    expect(new Set(claves)).toEqual(new Set([VERIFICADOR, ESTADO, DESTINO, IDAS, SALIDA]));
    for (const clave of claves) {
      expect(clave).not.toMatch(/token|jwt|bearer|credencial|contrasena|acceso|sesion/i);
    }
  });

  it('dos prefijos no se pisan: lo que toma uno no lo borra del otro', () => {
    const otro = crearRebote('kamayuk.caja');
    rebote.guardarIda(IDA);
    otro.guardarIda({ ...IDA, verificador: 'el-de-caja' });
    otro.contarIda();

    expect(rebote.tomarIda().verificador).toBe('el-verificador');
    expect(otro.tomarIda().verificador).toBe('el-de-caja');
    expect(rebote.idas()).toBe(0);
    expect(otro.idas()).toBe(1);
  });
});
