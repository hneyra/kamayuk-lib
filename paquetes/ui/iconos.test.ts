import { describe, expect, it } from 'vitest';

import { ICONOS } from './iconos.ts';

/**
 * Los trazos, y la divergencia que uno de ellos cierra.
 *
 * Que el `alerta` sea EXACTAMENTE el del artboard no se puede comprobar aqui —el artboard vive
 * vendorizado en el repositorio que lo consume, y una libreria comun que leyera el artboard de un
 * sistema seria `@kamayuk/ui` dependiendo de `rentas`—. Lo comprueba `rentas`, que si lo tiene.
 * Aqui se fija el valor y se deja escrito de que defecto viene.
 */

describe('los trazos', () => {
  it('EL CENTINELA: hay iconos publicados', () => {
    expect(Object.keys(ICONOS).length).toBeGreaterThan(15);
  });

  it('todos traen al menos un trazo, y ninguno esta vacio', () => {
    for (const [nombre, trazos] of Object.entries(ICONOS)) {
      expect(trazos.length, `«${nombre}» no tiene trazos`).toBeGreaterThan(0);
      for (const d of trazos) {
        expect(d.trim().length, `«${nombre}» tiene un trazo vacio`).toBeGreaterThan(0);
        // Un `d` que no empieza por un comando de movimiento no dibuja nada, y el SVG sale en
        // blanco sin un solo error en la consola.
        expect(d.trimStart()[0], `«${nombre}» tiene un trazo que no empieza por M`).toBe('M');
      }
    }
  });

  it('el `alerta` es el de tres trazos, y no el de dos', () => {
    // De que defecto viene: medido el 2026-09-12 sobre los cuatro clones, el triangulo NO era el
    // mismo en los tres sistemas que lo tenian, y los tres lo usaban para el caso `error` de su
    // `Aviso` — o sea que la misma pantalla de error se veia distinta.
    //
    //   rentas     ['M12 4.2 20.8 19.6H3.2z', 'M12 7.6V13M12 16.4h.02']     <- dos, y el raro
    //   normativa  ['M12 4.2 20.8 19.6H3.2z', 'M12 9.8v4.4', 'M12 17.1h.02']
    //   catastro   idem que normativa
    //
    // El artboard RentasV8 lo dirime: su icono de «Infracciones administrativas» es el de
    // `normativa` y `catastro`.
    expect(ICONOS.alerta).toEqual([
      'M12 4.2 20.8 19.6H3.2z',
      'M12 9.8v4.4',
      'M12 17.1h.02',
    ]);
    // Y explicitamente, el que NO es: el asta pegada al punto en un solo `d`.
    expect(ICONOS.alerta.join(' ')).not.toContain('M12 7.6V13');
  });

  it('no hay dos iconos con el mismo dibujo bajo dos nombres', () => {
    // Medido el 2026-09-12: entre los tres sistemas habia ~29 dibujos unicos en 40 definiciones.
    // Un alias duplicado es una pieza que se cambia en un sitio y se queda vieja en el otro.
    const vistos = new Map<string, string>();
    for (const [nombre, trazos] of Object.entries(ICONOS)) {
      const huella = trazos.join('|');
      const antes = vistos.get(huella);
      expect(antes, `«${nombre}» dibuja lo mismo que «${antes ?? ''}»`).toBeUndefined();
      vistos.set(huella, nombre);
    }
  });
});
