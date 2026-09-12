import { describe, expect, it } from 'vitest';

import {
  cuantosDestinos,
  destinoDeSlug,
  destinosOfrecidos,
  indiceDelCatalogo,
  slugDe,
  type Catalogo,
} from './catalogo.ts';

/**
 * **El catálogo entra por parámetro** (#13, AC3) y **el hash se valida contra él** (AC4).
 *
 * Los catálogos de aquí están inventados a propósito, y no son un decorado: son la única forma de
 * demostrar que este paquete no sabe de qué sistema es. Si alguna de estas funciones leyera una
 * constante propia —un árbol, una lista de slugs, un mapa de módulos—, ninguna de estas pruebas
 * pasaría, porque ninguno de estos nombres está escrito en ninguna parte del paquete.
 */

const DOS_MODULOS: Catalogo = [
  {
    clave: 'almacen',
    rotulo: 'Almacen',
    nota: 'Lo que entra y lo que sale',
    icono: 'capas',
    destinos: [
      { clave: 'alm-panel', rotulo: 'Panel', seEscribe: false },
      { clave: 'alm-entradas', rotulo: 'Entradas', seEscribe: true, slug: 'entradas' },
    ],
  },
  {
    clave: 'flota',
    rotulo: 'Flota',
    nota: 'Los vehiculos y sus turnos',
    icono: 'vehiculo',
    destinos: [{ clave: 'flo-turnos', rotulo: 'Turnos', seEscribe: true }],
  },
];

describe('el slug de un destino', () => {
  it('es su clave cuando no declara otro', () => {
    expect(slugDe({ clave: 'alm-panel', rotulo: 'Panel', seEscribe: false })).toBe('alm-panel');
  });

  it('y el que declara cuando lo declara', () => {
    // La clave puede ser corta y opaca —pensada para no chocar con otras cuarenta— y la barra de
    // direcciones la lee una persona.
    expect(
      slugDe({ clave: 'alm-entradas', rotulo: 'Entradas', seEscribe: true, slug: 'entradas' }),
    ).toBe('entradas');
  });
});

describe('el indice del catalogo', () => {
  it('lleva todas las hojas, cada una con SU modulo', () => {
    const indice = indiceDelCatalogo(DOS_MODULOS);
    expect([...indice.keys()]).toEqual(['alm-panel', 'alm-entradas', 'flo-turnos']);
    // El modulo es lo que la miga y el arbol necesitan, y lo que se pierde si el indice fuera solo
    // de hojas: una hoja suelta no sabe bajo que rama cuelga.
    expect(indice.get('flo-turnos')?.modulo.rotulo).toBe('Flota');
    expect(indice.get('alm-entradas')?.destino.seEscribe).toBe(true);
  });

  it('cuenta las hojas de todos los modulos, no las de uno', () => {
    expect(cuantosDestinos(DOS_MODULOS)).toBe(3);
    expect(cuantosDestinos([])).toBe(0);
  });
});

describe('EL AC4: del slug solo sale un destino que el catalogo ofrece', () => {
  it('un slug del catalogo devuelve su clave', () => {
    expect(destinoDeSlug(DOS_MODULOS, 'alm-panel')).toBe('alm-panel');
    expect(destinoDeSlug(DOS_MODULOS, 'entradas')).toBe('alm-entradas');
  });

  it('la CLAVE de un destino que enlaza por otro slug NO abre nada', () => {
    // `alm-entradas` existe, pero se enlaza como `entradas`. Aceptar tambien la clave daria dos
    // direcciones para la misma pantalla, y entonces «la direccion de esta pantalla» deja de ser
    // una: el enlace que alguien guarda y el que la aplicacion escribe dejan de coincidir.
    expect(destinoDeSlug(DOS_MODULOS, 'alm-entradas')).toBeNull();
  });

  it('y un destino que el catalogo NO trae no abre nada', () => {
    // Es la mitad del AC4 que de verdad muerde: las tres listas se dibujan recorriendo el
    // catalogo, asi que esconder una hoja de ellas es automatico. El hash lo escribe cualquiera.
    const sinFlota = DOS_MODULOS.filter((modulo) => modulo.clave !== 'flota');
    expect(destinoDeSlug(DOS_MODULOS, 'flo-turnos')).toBe('flo-turnos');
    expect(destinoDeSlug(sinFlota, 'flo-turnos')).toBeNull();
  });

  it('los destinos ofrecidos son los del catalogo y ni uno mas', () => {
    expect([...destinosOfrecidos(DOS_MODULOS)]).toEqual([
      'alm-panel',
      'alm-entradas',
      'flo-turnos',
    ]);
    expect(destinosOfrecidos([]).size).toBe(0);
  });
});
