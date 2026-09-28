import { describe, expect, it } from 'vitest';

import { rutaTrasElCambio } from './arnes-del-interprete.tsx';
import type { RutaDeLaHoja } from './hoja.ts';

/**
 * **Lo que el arnes del interprete dice que hace con la ruta, comprobado** (#127).
 *
 * `ConHoja` imita al marco con `rutaTrasElCambio`, y su docblock promete tres cosas. La tercera
 * —un parametro que llega a `null` se QUITA— no la observaba ninguna suite: medido por la
 * verificacion independiente de #127, cambiar el filtro por uno que lo deja todo pasaba las 595
 * pruebas del interprete, porque quien lee la ruta trata un `null` como ausente. Pero una ruta con
 * `{ fila: null }` no es la que escribe el marco, y el dia que una pieza enumere sus parametros el
 * arnes le mentiria. Esto lo fija.
 */

const RUTA: RutaDeLaHoja = { sujeto: 'G-01', parametros: { fila: '3', pestana: 'datos' } };

describe('`rutaTrasElCambio`: el marco sin el hash', () => {
  it('un parametro que llega a `null` se QUITA, no se guarda como `null`', () => {
    const despues = rutaTrasElCambio(RUTA, { parametros: { fila: null } });
    expect(despues).toStrictEqual({ sujeto: 'G-01', parametros: { pestana: 'datos' } });
    expect(Object.keys(despues.parametros), 'la clave sigue ahi, con `null`').toEqual(['pestana']);
  });

  it('los parametros se funden: el nuevo se anade y el que ya estaba cambia', () => {
    expect(rutaTrasElCambio(RUTA, { parametros: { fila: '7', orden: 'fecha' } })).toStrictEqual({
      sujeto: 'G-01',
      parametros: { fila: '7', pestana: 'datos', orden: 'fecha' },
    });
  });

  it('el sujeto: sin el, se queda el de antes; con `null`, se va; con otro, lo sustituye', () => {
    expect(rutaTrasElCambio(RUTA, { parametros: {} }).sujeto).toBe('G-01');
    expect(rutaTrasElCambio(RUTA, { sujeto: null }).sujeto).toBeNull();
    expect(rutaTrasElCambio(RUTA, { sujeto: 'G-02' })).toStrictEqual({ ...RUTA, sujeto: 'G-02' });
  });
});
