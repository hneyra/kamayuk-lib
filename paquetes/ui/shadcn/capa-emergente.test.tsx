/**
 * @vitest-environment-options { "pretendToBeVisual": false }
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { Calendario, Capa, DisparadorEmergente, Emergente } from '../index.ts';

/**
 * **La capa que se ABRE, y por que esta sola en su archivo** (#11, AC5).
 *
 * <h2>Un solo «abrir» por archivo, y esta medido</h2>
 *
 * Abrir una capa de Radix bajo jsdom **deja el proceso lento para todo lo que venga despues en el
 * mismo archivo**, de forma acumulativa. Medido con el reloj de Node —no con el de jsdom, que
 * aqui miente— sobre un `render(<Separador />)` mas su consulta, o sea lo mas barato que hay:
 *
 *     antes de abrir ninguna capa       ~10 ms
 *     tras abrir UNA                  5 817 ms
 *     tras abrir DOS                  2 896 ms mas, y subiendo
 *
 * Con el documento **limpio** entre pruebas —`document.body` con un solo hijo, cero hojas de
 * estilo sueltas— y lo mismo en los dos motores de Vitest, hilos y procesos, y con cualquier
 * reportero. **No es el producto**: en un navegador de verdad esto es instantaneo, y las mismas
 * piezas sin abrir tardan 10-60 ms en `piezas.test.tsx`.
 *
 * Y no es solo lentitud: pasados los ~10 s, la llamada del trabajador al proceso principal caduca
 * —`[vitest-worker]: Timeout calling "onTaskUpdate"`— y **`yarn verificar` sale en rojo con las
 * 247 pruebas en verde**. Un archivo con las cuatro pruebas de capa juntas tardaba 137 s y
 * producia ese error. Uno con UNA tarda ~5 s y no lo produce.
 *
 * Por eso cada capa tiene su archivo y cada archivo abre una sola vez, aunque eso obligue a meter
 * varias afirmaciones en un `it`. La alternativa era quitar justo las pruebas que comprueban lo
 * unico que distingue a un desplegable de un cuadro de texto.
 *
 * <h2>Y el gesto es `fireEvent`, no `userEvent`. Tambien medido</h2>
 *
 *     fireEvent.click      153 ms
 *     userEvent.click   84 641 ms     <- y aun asi el `it` caducaba a los 20 s
 *
 * Abriendose la capa correctamente en los dos casos. `userEvent` se queda para ESCRIBIR, en
 * `piezas.test.tsx`, que es donde su fidelidad importa y donde tarda 55 ms.
 */

/**
 * **El remiendo que hace que esto no reviente el `yarn verificar`, y lo que costo encontrarlo.**
 *
 * Con la capa abierta, `yarn verificar` salia en ROJO **con las 247 pruebas en verde**:
 *
 *     [vitest-worker]: Timeout calling "onTaskUpdate"
 *     Test Files  19 passed (19)   Tests  247 passed (247)   Errors  1 error
 *
 * La causa: jsdom mueve `requestAnimationFrame` con un temporizador de 16 ms, y el posicionador de
 * la capa —floating-ui, por debajo de Radix— deja un bucle de cuadros que aqui no se detiene. El
 * trabajador se queda sin turnos libres, la llamada al proceso principal caduca, y **un error del
 * arnes se cuenta como fallo del producto**.
 *
 * Se aisló midiendo con el reloj de Node —el de jsdom miente aqui— un `render(<Separador />)`
 * trivial: ~10 ms antes de abrir ninguna capa, **5 817 ms despues de abrir una**, y subiendo con
 * cada una. Ni el motor de ejecucion (hilos o procesos), ni el reportero, ni cerrar la capa antes
 * de terminar cambiaban nada; el documento quedaba limpio entre pruebas.
 *
 * Con `rAF` sincrono —que ademas es lo que una prueba quiere: que la maquetacion ocurra YA— el
 * error desaparece. Va aqui y no en `vitest.setup.ts` a proposito: un `rAF` sincrono convierte
 * cualquier `raf(bucle)` en recursion infinita, asi que se acota a los archivos donde se sabe que
 * se monta y que pasan.
 */
function conCuadrosInmediatos(): void {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
}

beforeAll(conCuadrosInmediatos);

describe('la capa emergente', () => {
  it('sale al pulsar, y lo que trae es el calendario de verdad', () => {
    render(
      <Emergente>
        <DisparadorEmergente>Fecha</DisparadorEmergente>
        <Capa>
          {/* Un mes FIJO, y no el de hoy: un calendario que muestra el mes en curso hace que la
              prueba diga cosas distintas segun el dia en que se ejecute. */}
          <Calendario mode="single" month={new Date(2026, 0, 1)} />
        </Capa>
      </Emergente>,
    );
    expect(screen.queryByRole('grid')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));

    // El calendario, y no un texto de mentira: es la pareja que el artboard pide para un campo de
    // fecha, y la que sustituye al `<input type="date">` —que el navegador no deja pintar y que
    // cambia de formato con el idioma del SISTEMA operativo, no con el de la aplicacion—.
    expect(screen.getByRole('grid')).toBeTruthy();
    // Y en castellano: el nativo se rinde al idioma del sistema operativo, y en una fecha de
    // vencimiento «03/04» leido como mes/dia en vez de dia/mes no es una molestia, es otro dia.
    expect(screen.getByText(/enero 2026/i)).toBeTruthy();
  });
});
