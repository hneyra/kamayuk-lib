import { describe, expect, it } from 'vitest';

import * as ui from '../index.ts';
import { PIEZA_POR_TIPO, TIPOS_DE_CAMPO, anchoCompleto, seEscribe, tipoDe } from './campos.ts';

/**
 * **Los siete tipos de campo tienen pieza, y la pieza existe** (#11, AC3).
 *
 * La correspondencia es lo unico que puede fallar en silencio: un tipo que cae al «campo de texto»
 * por omision convierte un desplegable de lista cerrada en un cuadro donde se teclea cualquier
 * cosa, y la pantalla se ve perfecta.
 */

describe('los siete tipos de campo y su pieza', () => {
  it('EL CENTINELA: la tabla tiene los siete y ni uno mas', () => {
    // Sin esto, quitar seis entradas dejaria las comprobaciones de abajo recorriendo una tabla de
    // uno y pasando en verde.
    expect(TIPOS_DE_CAMPO).toEqual(['', 't', 's', 'd', 'r', 'c', 'a']);
  });

  it('cada tipo nombra una pieza que `@kamayuk/ui` publica de verdad', () => {
    // Que el nombre este escrito no basta: «Desplegable» mal tecleado sigue siendo una cadena.
    const ausentes = TIPOS_DE_CAMPO.map((t) => PIEZA_POR_TIPO[t]).filter(
      (pieza) => !(pieza in ui),
    );
    expect(
      ausentes,
      `La tabla nombra piezas que el paquete no exporta: ${ausentes.join(', ')}`,
    ).toEqual([]);
  });

  it('los dos nombres del campo de texto dan la MISMA pieza', () => {
    // El artboard usa `''` y `'t'` indistintamente. No se normaliza: se aceptan los dos.
    expect(PIEZA_POR_TIPO['']).toBe(PIEZA_POR_TIPO.t);
  });

  it('solo el de solo lectura no se escribe, y de eso depende que la pantalla se guarde', () => {
    expect(seEscribe('r')).toBe(false);
    for (const tipo of TIPOS_DE_CAMPO.filter((t) => t !== 'r')) {
      expect(seEscribe(tipo), `«${tipo}» deberia escribirse`).toBe(true);
    }
  });

  it('el `1` estira el campo y NO cambia el control', () => {
    expect(anchoCompleto('s1')).toBe(true);
    expect(anchoCompleto('s')).toBe(false);
    expect(tipoDe('s1')).toBe('s');
    expect(tipoDe('a1')).toBe('a');
    // El texto de ancho completo se escribe `'1'` a secas: la letra vacia mas el modificador.
    expect(tipoDe('1')).toBe('');
  });

  it('un tipo que no esta en la tabla REVIENTA en vez de salir como campo de texto', () => {
    // Es la decision que hace que la tabla sirva: caer en «texto» esconderia la definicion mal
    // escrita detras de una pantalla que se ve bien.
    expect(() => tipoDe('x')).toThrow(/«x» no es un tipo de campo/);
    expect(() => tipoDe('select')).toThrow(/Los siete son/);
  });
});
