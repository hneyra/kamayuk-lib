import { describe, expect, it } from 'vitest';

import {
  aLaVista,
  contraste,
  distanciaDeLuminosidad,
  hexAOklch,
  oklchAHex,
  ratio,
  ratioQueNoLlega,
} from './color.ts';

/**
 * El color, contra valores CONOCIDOS y no contra si mismo.
 *
 * Una prueba de ida y vuelta —convertir y volver— pasa con cualquier par de funciones inversas,
 * aunque las dos esten mal. Lo que se comprueba aqui son puntos que se pueden verificar fuera:
 * los ratios que WCAG publica, los extremos de la escala y los tonos de colores conocidos.
 */

describe('el ratio de contraste es el de WCAG 2.1', () => {
  it('negro sobre blanco es 21:1, el maximo', () => {
    expect(ratio('#000000', '#ffffff')).toBe('21.00');
  });

  it('un color contra si mismo es 1:1, el minimo', () => {
    expect(ratio('#005284', '#005284')).toBe('1.00');
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
    expect(ratio('#93a3af', '#ffffff')).toBe('2.59');
  });
});

/**
 * **El redondeo es para el MENSAJE, y nunca para decidir** (#48).
 *
 * <h2>El defecto del que viene</h2>
 *
 * `ratio()` devolvia un NUMERO ya redondeado a dos decimales y las cuatro guardas de color lo
 * comparaban contra su umbral. Eso no deja el umbral en los 4.5:1 que pide WCAG 1.4.3: lo deja en
 * **4.495**, y movido hacia el lado malo. Una pareja a **4.4973:1** se escribe `4.50` y satisface
 * el `>=`, asi que pasa en verde.
 *
 * Salio midiendo #41: el avatar sobre la barra con hover en `institucional/claro` daba exactamente
 * 4.4973 y la guarda lo daba por bueno. El issue conto «falla en cuatro de las seis» cuando eran
 * **cinco**, y la sexta pasaba por el redondeo.
 *
 * <h2>Por que esta pareja y no la de #41</h2>
 *
 * Porque la de #41 **ya esta arreglada** —desde aquel issue da 4.64— y una guarda cuyo sujeto se
 * arreglo no vigila nada. `#017dbd` sobre blanco es una pareja construida a proposito para caer
 * dentro de la franja, y se queda ahi para siempre: no es un token de ningun tema y nada la va a
 * mover.
 */
describe('el redondeo es para el mensaje, no para decidir (#48)', () => {
  /** Azul de enlace, elegido por su cifra: 4.497210:1 sobre papel blanco. */
  const CASI = '#017dbd';
  const PAPEL = '#ffffff';

  it('4.497:1 NO llega a los 4.5:1 de WCAG 1.4.3, y quien lo dice es la cifra cruda', () => {
    expect(contraste(CASI, PAPEL)).toBeLessThan(4.5);
    expect(contraste(CASI, PAPEL)).toBeCloseTo(4.4972, 4);
  });

  it('y escrita SI dice 4.50, que es justo lo que la escondia', () => {
    expect(ratio(CASI, PAPEL)).toBe('4.50');
  });

  it('y un rojo que la nombra afloja el redondeo, para no leerse como una contradiccion', () => {
    // «4.50:1, y texto pide 4.5:1» manda a quien lo lee a buscar el defecto en la guarda. Los dos
    // decimales siguen siendo lo normal —se aflojan SOLO donde dejarian de explicar el rojo—.
    expect(ratioQueNoLlega(CASI, PAPEL, 4.5)).toBe('4.4972');
    expect(ratioQueNoLlega('#93a3af', PAPEL, 4.5)).toBe('2.59');
  });

  it('EL CENTINELA: lo redondeado es TEXTO, para que no se pueda comparar sin que `tsc` lo diga', () => {
    // Es la mitad estructural del arreglo. Mientras `ratio()` devolvia un numero, escribir
    // `ratio(a, b) >= 4.5` compilaba y pasaba en verde — que es exactamente como llego el
    // defecto. Devolviendo texto, esa linea no existe: la escribe `tsc` en rojo.
    expect(typeof ratio(CASI, PAPEL)).toBe('string');
    expect(typeof contraste(CASI, PAPEL)).toBe('number');
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
    expect(distanciaDeLuminosidad('#000000', '#ffffff')).toBeCloseTo(1, 6);
    expect(distanciaDeLuminosidad('#005284', '#005284')).toBe(0);
    expect(distanciaDeLuminosidad('#16232c', '#93a3af')).toBe(
      distanciaDeLuminosidad('#93a3af', '#16232c'),
    );
  });

  it('y NO es el ratio de contraste: dos tintas pueden leerse igual de bien y verse iguales', () => {
    // `--tinta-2` y `--tinta-3` de `alto-contraste/oscuro`. Las dos pasan AAA sobre su papel y
    // aun asi estan a 0.0538 una de otra, que es lo que hace que un dia de fuera del calendario
    // apenas se distinga de uno del mes (#39). El contraste entre ellas —1.18:1— no dice eso.
    expect(aLaVista(distanciaDeLuminosidad('#e4eaee', '#d3d8dd'), 4)).toBe('0.0538');
    expect(ratio('#e4eaee', '#d3d8dd')).toBe('1.18');
  });

  it('un color translucido no se deriva: revienta en vez de adivinar', () => {
    // Los cinco tokens de la barra y los dos velos son `rgba()`. Derivarlos exigiria saber
    // sobre que se pintan, y eso no lo dice el token: lo dice la pantalla.
    expect(() => hexAOklch('rgba(255, 255, 255, 0.09)')).toThrow(/no es un color opaco/);
  });
});
