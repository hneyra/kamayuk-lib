import { describe, expect, it } from 'vitest';

import { contraste, distanciaDeLuminosidad, hexAOklch, oklchAHex, ratio } from './color.ts';

/**
 * El color, contra valores CONOCIDOS y no contra si mismo.
 *
 * Una prueba de ida y vuelta —convertir y volver— pasa con cualquier par de funciones inversas,
 * aunque las dos esten mal. Lo que se comprueba aqui son puntos que se pueden verificar fuera:
 * los ratios que WCAG publica, los extremos de la escala y los tonos de colores conocidos.
 */

describe('el ratio de contraste es el de WCAG 2.1', () => {
  it('negro sobre blanco es 21:1, el maximo', () => {
    expect(ratio('#000000', '#ffffff')).toBe(21);
  });

  it('un color contra si mismo es 1:1, el minimo', () => {
    expect(ratio('#005284', '#005284')).toBe(1);
  });

  it('y es simetrico: el orden no cambia el ratio', () => {
    expect(ratio('#005284', '#ffffff')).toBe(ratio('#ffffff', '#005284'));
  });

  it('el gris 118 sobre blanco roza el 4.5:1 de WCAG 1.4.3', () => {
    // `#767676` es el gris mas oscuro que la documentacion de WCAG usa como ejemplo de «justo
    // en el limite» sobre blanco. Si esto se moviera, la aritmetica estaria mal.
    expect(contraste('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#777777', '#ffffff')).toBeLessThan(4.5);
  });

  it('y el `--tinta-4` del artboard da 2.59:1 sobre papel blanco, como dice su comentario', () => {
    // El artboard lo escribe en su propio comentario y es el motivo de que ese token NO sea
    // color de texto: WCAG 1.4.3 pide 4.5:1. Aqui se comprueba que la cifra es la que dice.
    expect(ratio('#93a3af', '#ffffff')).toBe(2.59);
  });
});

describe('OKLCH', () => {
  it('el blanco tiene luminosidad 1 y croma 0', () => {
    const { l, c } = hexAOklch('#ffffff');
    expect(l).toBeCloseTo(1, 3);
    expect(c).toBeCloseTo(0, 3);
  });

  it('el negro tiene luminosidad 0', () => {
    expect(hexAOklch('#000000').l).toBeCloseTo(0, 3);
  });

  it('un gris no tiene croma, mire el tono que mire', () => {
    expect(hexAOklch('#808080').c).toBeCloseTo(0, 3);
  });

  it('el tono de los primarios cae donde tiene que caer', () => {
    // Los tres de sRGB, con los valores que publica la especificacion de OKLab. Son puntos
    // externos: si la matriz estuviera mal, estos tres se moverian.
    expect(hexAOklch('#ff0000').h).toBeCloseTo(29.23, 1);
    expect(hexAOklch('#00ff00').h).toBeCloseTo(142.5, 1);
    expect(hexAOklch('#0000ff').h).toBeCloseTo(264.05, 1);
  });

  it('ida y vuelta devuelve el mismo color', () => {
    // Esto solo NO probaria nada —dos funciones inversas mal hechas tambien cuadran— pero con
    // los puntos de arriba fijados, si dice que no se pierde precision por el camino.
    for (const hex of ['#005284', '#f2f6f9', '#16232c', '#52bdef', '#8f2a17', '#fff4d9']) {
      expect(oklchAHex(hexAOklch(hex))).toBe(hex);
    }
  });

  it('la distancia de luminosidad va de 0 a 1, y es simetrica', () => {
    // Los dos extremos son puntos externos: el blanco esta en L=1 y el negro en L=0, asi que su
    // distancia es la escala entera. Si la aritmetica se moviera, esto no daria 1.
    expect(distanciaDeLuminosidad('#000000', '#ffffff')).toBe(1);
    expect(distanciaDeLuminosidad('#005284', '#005284')).toBe(0);
    expect(distanciaDeLuminosidad('#16232c', '#93a3af')).toBe(
      distanciaDeLuminosidad('#93a3af', '#16232c'),
    );
  });

  it('y NO es el ratio de contraste: dos tintas pueden leerse igual de bien y verse iguales', () => {
    // `--tinta-2` y `--tinta-3` de `alto-contraste/oscuro`. Las dos pasan AAA sobre su papel y
    // aun asi estan a 0.0538 una de otra, que es lo que hace que un dia de fuera del calendario
    // apenas se distinga de uno del mes (#39). El contraste entre ellas —1.18:1— no dice eso.
    expect(distanciaDeLuminosidad('#e4eaee', '#d3d8dd')).toBe(0.0538);
    expect(ratio('#e4eaee', '#d3d8dd')).toBe(1.18);
  });

  it('un color translucido no se deriva: revienta en vez de adivinar', () => {
    // Los cinco tokens de la barra y los dos velos son `rgba()`. Derivarlos exigiria saber
    // sobre que se pintan, y eso no lo dice el token: lo dice la pantalla.
    expect(() => hexAOklch('rgba(255, 255, 255, 0.09)')).toThrow(/no es un color opaco/);
  });
});
