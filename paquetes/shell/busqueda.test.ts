import { describe, expect, it } from 'vitest';

import { modulosQueCasan, pieDeLaPaleta, resultadosDelMando } from './busqueda.ts';
import type { Catalogo } from './catalogo.ts';

/**
 * Las dos búsquedas del armazón, sobre un catálogo inventado.
 *
 * Lo que se comprueba aquí no es que filtren —eso lo haría cualquier `includes`— sino las tres
 * decisiones que se pierden al reescribirlas: que un módulo que casa entra CON TODAS sus hojas, que
 * la paleta recorta pero el pie cuenta lo que casa, y que las dos leen el catálogo que se les da.
 */

const CATALOGO: Catalogo = [
  {
    clave: 'almacen',
    rotulo: 'Almacen',
    nota: 'Lo que entra y lo que sale',
    icono: 'capas',
    destinos: [
      { clave: 'alm-panel', rotulo: 'Panel', seEscribe: false },
      { clave: 'alm-entradas', rotulo: 'Entradas', seEscribe: true },
      { clave: 'alm-salidas', rotulo: 'Salidas', seEscribe: true },
    ],
  },
  {
    clave: 'flota',
    rotulo: 'Flota',
    nota: 'Los vehiculos y sus turnos',
    icono: 'vehiculo',
    destinos: [
      { clave: 'flo-panel', rotulo: 'Panel', seEscribe: false },
      { clave: 'flo-turnos', rotulo: 'Turnos', seEscribe: true },
    ],
  },
];

describe('el filtro del carril', () => {
  it('sin texto, deja el catalogo entero', () => {
    const casan = modulosQueCasan(CATALOGO, '   ');
    expect(casan.map((x) => x.modulo.clave)).toEqual(['almacen', 'flota']);
    expect(casan[0]?.destinos).toHaveLength(3);
  });

  it('si casa el MODULO, entra con TODAS sus hojas aunque ninguna case', () => {
    // Buscar el nombre de un modulo tiene que ensenar lo que hay dentro. La alternativa —dejar
    // solo las hojas que casan— daria una lista VACIA debajo de un titulo que si casaba.
    const casan = modulosQueCasan(CATALOGO, 'flota');
    expect(casan).toHaveLength(1);
    expect(casan[0]?.destinos.map((d) => d.rotulo)).toEqual(['Panel', 'Turnos']);
  });

  it('si casa solo una hoja, entra solo esa', () => {
    const casan = modulosQueCasan(CATALOGO, 'turnos');
    expect(casan).toHaveLength(1);
    expect(casan[0]?.destinos.map((d) => d.clave)).toEqual(['flo-turnos']);
  });

  it('casa sin distinguir mayusculas, y recortando los espacios', () => {
    expect(modulosQueCasan(CATALOGO, '  ENTRADAS ')).toHaveLength(1);
  });

  it('lo que no casa con nada devuelve la lista vacia, no el catalogo', () => {
    // Devolver «todo» cuando no casa nada es el fallo silencioso de un filtro: quien busca algo que
    // no existe ve la lista completa y cree que si existe.
    expect(modulosQueCasan(CATALOGO, 'coactiva')).toEqual([]);
  });
});

describe('la paleta de mando', () => {
  it('sin texto, ofrece TODOS los destinos, con su modulo al lado', () => {
    const todos = resultadosDelMando(CATALOGO, '');
    expect(todos).toHaveLength(5);
    expect(todos[0]).toEqual({ clave: 'alm-panel', rotulo: 'Panel', modulo: 'Almacen' });
    // El modulo al lado NO es adorno: hay dos hojas que se llaman «Panel», y sin el la lista
    // obliga a abrirlas para saber cual era.
    expect(todos.filter((r) => r.rotulo === 'Panel').map((r) => r.modulo)).toEqual([
      'Almacen',
      'Flota',
    ]);
  });

  it('casa por la hoja Y por el modulo', () => {
    expect(resultadosDelMando(CATALOGO, 'turnos').map((r) => r.clave)).toEqual(['flo-turnos']);
    // Quien escribe el nombre de un modulo esta pidiendo sus hojas.
    expect(resultadosDelMando(CATALOGO, 'flota').map((r) => r.clave)).toEqual([
      'flo-panel',
      'flo-turnos',
    ]);
  });

  it('recorta a doce', () => {
    const muchos: Catalogo = [
      {
        clave: 'uno',
        rotulo: 'Uno',
        nota: '',
        icono: 'capas',
        destinos: Array.from({ length: 40 }, (_, i) => ({
          clave: `d${String(i)}`,
          rotulo: `Destino ${String(i)}`,
          seEscribe: false,
        })),
      },
    ];
    expect(resultadosDelMando(muchos, '')).toHaveLength(12);
    // Y el limite es un parametro, que es lo que deja contar los que casan sin recortar.
    expect(resultadosDelMando(muchos, '', Number.POSITIVE_INFINITY)).toHaveLength(40);
  });
});

describe('el pie de la paleta', () => {
  it('cuenta los que CASAN, no los que se ven', () => {
    // Un pie que dijera «12 de 40» con treinta coincidencias estaria escondiendo que la busqueda no
    // discrimina nada, que es justo lo que la persona necesita saber.
    const muchos: Catalogo = [
      {
        clave: 'uno',
        rotulo: 'Uno',
        nota: '',
        icono: 'capas',
        destinos: Array.from({ length: 40 }, (_, i) => ({
          clave: `d${String(i)}`,
          rotulo: `Destino ${String(i)}`,
          seEscribe: false,
        })),
      },
    ];
    expect(pieDeLaPaleta(muchos, '')).toBe('40 de 40 destinos');
  });

  it('dice cuantos casan sobre el total', () => {
    expect(pieDeLaPaleta(CATALOGO, '')).toBe('5 de 5 destinos');
    expect(pieDeLaPaleta(CATALOGO, 'turnos')).toBe('1 de 5 destinos');
    expect(pieDeLaPaleta(CATALOGO, 'nada')).toBe('0 de 5 destinos');
  });

  it('el singular es singular', () => {
    const uno: Catalogo = [
      {
        clave: 'uno',
        rotulo: 'Uno',
        nota: '',
        icono: 'capas',
        destinos: [{ clave: 'd', rotulo: 'D', seEscribe: false }],
      },
    ];
    expect(pieDeLaPaleta(uno, '')).toBe('1 de 1 destino');
  });
});
