import { describe, expect, it } from 'vitest';

import { accionesDelPie, avisoDelPie } from './acciones.ts';
import type { Destino } from './catalogo.ts';

/**
 * **Las acciones al pie las decide el dato** (#13, AC8).
 *
 * Las dos formas del dato, y las dos listas que salen. Es la prueba que el AC8 pide con todas las
 * letras: «una pantalla sin campos editables ofrece exportar e imprimir, y una con ellos ofrece
 * limpiar y guardar».
 */

const DE_CONSULTA: Destino = { clave: 'c', rotulo: 'Consulta', seEscribe: false };
const DE_ESCRITURA: Destino = { clave: 'e', rotulo: 'Alta', seEscribe: true };

describe('las acciones al pie', () => {
  it('una pantalla que se ESCRIBE ofrece limpiar y guardar, con guardar de principal', () => {
    expect(accionesDelPie(DE_ESCRITURA).map((a) => a.rotulo)).toEqual(['Limpiar', 'Guardar']);
    expect(accionesDelPie(DE_ESCRITURA).filter((a) => a.principal).map((a) => a.acto)).toEqual([
      'guardar',
    ]);
  });

  it('una de solo CONSULTA ofrece exportar e imprimir, con imprimir de principal', () => {
    expect(accionesDelPie(DE_CONSULTA).map((a) => a.rotulo)).toEqual(['Exportar', 'Imprimir']);
    expect(accionesDelPie(DE_CONSULTA).filter((a) => a.principal).map((a) => a.acto)).toEqual([
      'imprimir',
    ]);
  });

  it('y las dos listas no se solapan en nada', () => {
    // Es lo que hace que el fallo sea visible: si una pantalla de consulta ofreciera «Guardar», el
    // boton no tendria nada que guardar; y si una que se escribe ofreciera «Imprimir», el trabajo
    // se quedaria SIN forma de guardarse. Ninguna de las dos se ve como un error en la pantalla.
    const escritura = new Set(accionesDelPie(DE_ESCRITURA).map((a) => a.acto));
    const consulta = accionesDelPie(DE_CONSULTA).map((a) => a.acto);
    expect(consulta.filter((acto) => escritura.has(acto))).toEqual([]);
  });

  it('hay EXACTAMENTE una accion principal en cada forma', () => {
    for (const destino of [DE_CONSULTA, DE_ESCRITURA]) {
      expect(accionesDelPie(destino).filter((a) => a.principal)).toHaveLength(1);
    }
  });
});

describe('el aviso del pie', () => {
  it('lo decide el mismo dato', () => {
    expect(avisoDelPie(DE_ESCRITURA)).toBe('Nada se escribe hasta que pulse Guardar.');
    expect(avisoDelPie(DE_CONSULTA)).toBe('Los datos son los que figuran a la fecha de hoy.');
  });
});
