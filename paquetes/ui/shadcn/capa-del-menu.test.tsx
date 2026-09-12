import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { DisparadorDelMenu, ListaDelMenu, Menu, OpcionDelMenu } from '../index.ts';

/**
 * **El menú de sesión, y por qué es LA pieza cara del armazón** (#13, AC1).
 *
 * <h2>La regla de #11, vuelta a medir con las siete piezas del armazón</h2>
 *
 * #11 apartó a un guion propio las pruebas que abren una capa, porque abrir deja el proceso lento de
 * forma acumulativa y acaba caducando la llamada del trabajador al proceso principal
 * —`[vitest-worker]: Timeout calling "onTaskUpdate"`—, que deja **la suite en verde y
 * `yarn verificar` en rojo**. Esa medición se hizo sobre `Popover` y `Select`.
 *
 * Las siete del armazón se midieron de nuevo, una por archivo, con las librerías peladas:
 *
 *     DropdownMenu   12 409 ms de archivo   (39 s de reloj de pared)
 *     AlertDialog       208 ms
 *     Dialog            233 ms
 *     Command (cmdk)    227 ms
 *     Sonner            151 ms
 *
 * y las cuatro baratas **juntas en un archivo**, 305 ms. Así que la regla se afina con lo medido:
 * **lo caro no es «una capa», es `@radix-ui/react-popper`**. `DropdownMenu` lo lleva; `Popover` y
 * `Select` —las dos que ya estaban apartadas— también. `AlertDialog`, `Dialog` y el diálogo de
 * `cmdk` se colocan con CSS y no lo cargan: ésos viven en `piezas-del-armazon.test.tsx`, con el
 * resto.
 *
 * <h2>Y el gasto no está donde se busca</h2>
 *
 * Cronometrado por tramos con el reloj de Node —el de jsdom miente aquí— dentro del mismo `it`:
 *
 *     montar                    34.8 ms
 *     buscar el disparador      87.6 ms
 *     abrir                     79.1 ms
 *     getByRole del elemento     8.9 ms
 *     ----------------------------------
 *     suma                     ~213 ms       y el `it` reportaba 4 775 ms
 *
 * O sea que **está en desmontar el posicionador al limpiar**, fuera del cuerpo de la prueba. Por eso
 * no se ve instrumentando lo que uno escribe, y por eso la salida es un archivo aparte con un solo
 * «abrir» y no una optimización dentro de la prueba.
 *
 * <h2>El gesto es `fireEvent`, y con el TECLADO</h2>
 *
 * Medido en #11: el mismo `click` tarda 153 ms con `fireEvent` y 84 641 ms con `userEvent`. Y se
 * abre con el teclado porque jsdom no captura punteros —Radix se apoya en `hasPointerCapture`— y
 * porque que el menú de la sesión se pueda operar sin ratón es un requisito de verdad.
 */

beforeAll(() => {
  // Ver #11: sin `rAF` sincrono, el bucle de cuadros del posicionador no se detiene y el trabajador
  // se queda sin turnos libres.
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

describe('el menu de sesion', () => {
  it('no tiene opciones hasta que se abre; se abre CON EL TECLADO; y la peligrosa se marca', () => {
    const elegidas: string[] = [];
    render(
      <Menu>
        <DisparadorDelMenu>J. Ruiz</DisparadorDelMenu>
        <ListaDelMenu>
          <OpcionDelMenu onSelect={() => elegidas.push('perfil')}>Mi perfil</OpcionDelMenu>
          <OpcionDelMenu onSelect={() => elegidas.push('clave')}>Cambiar la contrasena</OpcionDelMenu>
          <OpcionDelMenu onSelect={() => elegidas.push('preferencias')}>Preferencias</OpcionDelMenu>
          <OpcionDelMenu peligrosa onSelect={() => elegidas.push('salir')}>
            Cerrar sesion
          </OpcionDelMenu>
        </ListaDelMenu>
      </Menu>,
    );
    const disparador = screen.getByRole('button', { name: 'J. Ruiz' });

    // ANTES de abrir no hay ni una opcion en el documento: es lo que una prueba de «renderiza» no
    // veria, y el dia que la lista deje de montar nadie podria cerrar la sesion.
    expect(screen.queryByRole('menuitem')).toBeNull();

    act(() => {
      disparador.focus();
    });
    fireEvent.keyDown(disparador, { key: 'Enter' });

    // Las cuatro de V8, en su orden.
    expect(screen.getAllByRole('menuitem').map((o) => o.textContent)).toEqual([
      'Mi perfil',
      'Cambiar la contrasena',
      'Preferencias',
      'Cerrar sesion',
    ]);
    // La que no se deshace se marca, y se deja donde esta: esconderla obligaria a buscarla todos
    // los dias, e igualarla a las otras tres la convertiria en un tropiezo.
    const salir = screen.getByRole('menuitem', { name: 'Cerrar sesion' });
    expect(salir.getAttribute('data-peligrosa')).toBe('1');
    expect(
      screen.getByRole('menuitem', { name: 'Mi perfil' }).getAttribute('data-peligrosa'),
    ).toBe('0');

    fireEvent.click(salir);
    expect(elegidas, 'elegir una opcion no aviso a nadie').toEqual(['salir']);
  });
});
