import { describe, expect, it } from 'vitest';

import { accesosDe, type Destino } from './catalogo.ts';
import { aplicarElCambio, escribirLaRuta, leerLaRuta, rutaDeLaHoja } from './ruta.ts';

/**
 * **La ruta de una hoja, sin montar nada** (#67, `estado-en-la-ruta`).
 *
 * La mitad montada —recargar, compartir, el aviso— esta en `estado-en-la-ruta.test.tsx`. Aqui van
 * las reglas: como se parte, como se codifica, que se ignora y que se escribe.
 */

const SIN_ESTADO: Destino = { clave: 'panel', rotulo: 'Panel', seEscribe: false };
const CON_ESTADO: Destino = {
  clave: 'registros',
  rotulo: 'Registros',
  seEscribe: false,
  enLaRuta: { sujeto: true, parametros: ['ver', 'filtro'] },
};

describe('leer', () => {
  it('`#/<slug>` es la de hoy: sin sujeto y sin parametros', () => {
    expect(leerLaRuta('/panel', '')).toEqual({ slug: 'panel', sujeto: null, parametros: {} });
  });

  it('el sujeto es TODO lo que va detras de la primera barra, descodificado', () => {
    expect(leerLaRuta('/registros/A%2F07%20b', '?ver=historial')).toEqual({
      slug: 'registros',
      sujeto: 'A/07 b',
      parametros: { ver: 'historial' },
    });
    // Una barra sin codificar tambien es del sujeto: se parte por la PRIMERA y el resto se queda.
    expect(leerLaRuta('/registros/A/07', '')?.sujeto).toBe('A/07');
  });

  it('un tramo mal codificado NO revienta: se queda tal cual', () => {
    expect(leerLaRuta('/registros/%E0%A4%A', '')?.sujeto).toBe('%E0%A4%A');
  });

  it('un parametro vacio no esta', () => {
    expect(leerLaRuta('/registros', '?ver=&filtro=x')?.parametros).toEqual({ filtro: 'x' });
  });

  it('la barra SIN sujeto no es ninguna de las formas (#20): `null`', () => {
    expect(leerLaRuta('/entradas/', '')).toBeNull();
  });
});

describe('escribir', () => {
  it('una hoja sin estado escribe `/<slug>`, exactamente lo de antes de #67', () => {
    expect(escribirLaRuta('panel', { sujeto: null, parametros: {} })).toBe('/panel');
  });

  it('el sujeto se codifica ENTERO, y leer lo escrito devuelve lo mismo', () => {
    const escrita = escribirLaRuta('registros', { sujeto: 'A/07 b%', parametros: { ver: 'más', filtro: 'x y' } });
    expect(escrita).toBe('/registros/A%2F07%20b%25?filtro=x+y&ver=m%C3%A1s');
    const [camino = '', consulta = ''] = escrita.split('?');
    expect(leerLaRuta(camino, `?${consulta}`)).toEqual({
      slug: 'registros',
      sujeto: 'A/07 b%',
      parametros: { ver: 'más', filtro: 'x y' },
    });
  });

  it('los parametros van en orden: la misma hoja da la misma direccion se llegue como se llegue', () => {
    expect(escribirLaRuta('r', { sujeto: null, parametros: { b: '2', a: '1' } })).toBe(
      escribirLaRuta('r', { sujeto: null, parametros: { a: '1', b: '2' } }),
    );
  });
});

describe('lo que la hoja no declara, se ignora', () => {
  it('una hoja sin `enLaRuta` no recibe ni sujeto ni parametros, y se dice cuales se ignoraron', () => {
    expect(rutaDeLaHoja(SIN_ESTADO, { sujeto: '42', parametros: { ver: 'x' } })).toEqual({
      ruta: { sujeto: null, parametros: {} },
      ignorados: ['/42', '?ver'],
    });
  });

  it('una que declara, recibe lo suyo y NADA mas', () => {
    expect(rutaDeLaHoja(CON_ESTADO, { sujeto: '42', parametros: { ver: 'h', otro: '1' } })).toEqual({
      ruta: { sujeto: '42', parametros: { ver: 'h' } },
      ignorados: ['?otro'],
    });
  });

  it('un parametro llamado `sujeto` no se puede declarar: es el nombre del tramo del camino', () => {
    const raro: Destino = { ...CON_ESTADO, enLaRuta: { parametros: ['sujeto'] } };
    expect(rutaDeLaHoja(raro, { sujeto: null, parametros: { sujeto: '1' } }).ignorados).toEqual(['?sujeto']);
  });
});

describe('un cambio', () => {
  const antes = { sujeto: '42', parametros: { ver: 'historial', filtro: 'x' } };

  it('lo que no se nombra se queda', () => {
    expect(aplicarElCambio(CON_ESTADO, antes, { parametros: { ver: 'vigente' } }).ruta).toEqual({
      sujeto: '42',
      parametros: { ver: 'vigente', filtro: 'x' },
    });
  });

  it('`null` lo quita, y `\'\'` tambien', () => {
    expect(aplicarElCambio(CON_ESTADO, antes, { sujeto: null, parametros: { filtro: null, ver: '' } }).ruta).toEqual({
      sujeto: null,
      parametros: {},
    });
  });

  it('lo no declarado se ignora igual que al leer', () => {
    expect(aplicarElCambio(CON_ESTADO, antes, { parametros: { otro: '1' } })).toEqual({
      ruta: antes,
      ignorados: ['?otro'],
    });
  });
});

describe('acceso-por-hoja', () => {
  it('`accesosDe` da el que protege primero, despues los demas, sin repetir', () => {
    expect(accesosDe({ ...SIN_ESTADO, acceso: 'consulta', tambien: ['detalle', 'consulta', 'otro'] })).toEqual([
      'consulta',
      'detalle',
      'otro',
    ]);
    expect(accesosDe(SIN_ESTADO)).toEqual([]);
    expect(accesosDe({ ...SIN_ESTADO, tambien: ['detalle'] })).toEqual(['detalle']);
  });
});
