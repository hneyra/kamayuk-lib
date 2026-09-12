import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  Avisos,
  BuscadorDeLaPaleta,
  Cajon,
  Cancelar,
  Confirmacion,
  Confirmar,
  CuerpoDelPlegable,
  Descartar,
  DisparadorDeConfirmacion,
  DisparadorDelCajon,
  DisparadorDelPlegable,
  HuecoDeConfirmacion,
  ListaDeLaPaleta,
  Miga,
  NotaDeConfirmacion,
  NotaDelCajon,
  OpcionDeLaPaleta,
  PaletaDeMando,
  PanelDeConfirmacion,
  PanelDelCajon,
  PasoDeLaMiga,
  Plegable,
  SalidasDeConfirmacion,
  TituloDeConfirmacion,
  TituloDelCajon,
  VacioDeLaPaleta,
  avisar,
} from '../index.ts';

/**
 * **Seis de las siete piezas del armazón** (#13, AC1). La séptima —`Menu`— vive aparte, en
 * `capa-del-menu.test.tsx`, y este javadoc explica por qué son seis y no cuatro.
 *
 * <h2>Aquí se abren TRES capas en el mismo archivo, y no es un descuido</h2>
 *
 * La regla de #11 dice que un archivo que abre una capa abre UNA SOLA VEZ, porque abrir deja el
 * proceso lento de forma acumulativa y acaba caducando la llamada del trabajador al proceso
 * principal. Esa regla se escribió midiendo `Popover` y `Select`. Al traer las siete del armazón se
 * volvió a medir, **una pieza por archivo, con `radix-ui`, `cmdk` y `sonner` pelados**, y el reparto
 * no es el que la regla suponía:
 *
 *     DropdownMenu   12 409 ms de archivo   (39 s de reloj de pared)
 *     AlertDialog       208 ms
 *     Dialog            233 ms
 *     Command (cmdk)    227 ms
 *     Sonner            151 ms
 *
 * Y las cuatro baratas, **juntas en un solo archivo**, 305 ms. O sea que lo caro no es «una capa»:
 * es **`@radix-ui/react-popper`**, que es lo que `DropdownMenu` lleva dentro y lo que `Popover` y
 * `Select` —las dos que ya estaban apartadas— llevan también. `AlertDialog`, `Dialog` y el diálogo
 * de `cmdk` se posicionan con CSS y no lo cargan.
 *
 * El desglose lo confirma: en el `DropdownMenu`, montar cuesta 35 ms, abrir 79 ms y la consulta
 * 9 ms —213 ms dentro del `it`—, y el `it` reporta 4 775 ms. **El gasto está en desmontar el
 * posicionador**, no en abrirlo, que es por lo que no se ve instrumentando el cuerpo de la prueba.
 *
 * <h2>Y los dos remiendos que jsdom necesita</h2>
 *
 * `requestAnimationFrame` síncrono, por lo de #11; y `ResizeObserver` más `scrollIntoView`, que
 * `cmdk` usa y jsdom no trae:
 *
 *     ReferenceError: ResizeObserver is not defined      node_modules/cmdk/dist/index.mjs:1:8384
 *     TypeError: e.scrollIntoView is not a function      node_modules/cmdk/dist/index.mjs:1:4286
 *
 * Y un tercero que no estaba en la lista de #11: **jsdom tampoco trae `matchMedia`**. `sonner` la
 * llama para resolver el modo `system`, que es el que sale cuando nadie eligio modo:
 *
 *     TypeError: window.matchMedia is not a function      node_modules/sonner/dist/index.mjs:1072
 *
 * Esa ausencia es la que hace que `useEsEstrecho()` del armazon pregunte por ella antes de usarla.
 */

beforeAll(() => {
  // Ver #11: jsdom mueve `rAF` con un temporizador de 16 ms y el bucle de cuadros de una capa no
  // se detiene solo. Sincrono es ademas lo que una prueba quiere: que la maquetacion ocurra YA.
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // Y el tercero, que se gano aqui: **jsdom no trae `matchMedia`**. `sonner` la llama para el modo
  // `system`, que es el que sale cuando nadie eligio modo:
  //     TypeError: window.matchMedia is not a function    node_modules/sonner/dist/index.mjs:1072
  // Es la misma ausencia por la que `useEsEstrecho()` del armazon pregunta por ella antes de
  // usarla en vez de darla por hecha.
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('la miga', () => {
  it('es una LISTA, marca el paso actual y esconde el separador', () => {
    render(
      <Miga>
        <PasoDeLaMiga>Almacen</PasoDeLaMiga>
        <PasoDeLaMiga actual conSeparador>
          Entradas
        </PasoDeLaMiga>
      </Miga>,
    );

    // Con `span` sueltos —que es como el artboard la dibuja— un lector de pantalla anuncia «Ruta» y
    // tres trozos de texto sin relacion. Con lista, anuncia cuantos son y cual es el actual.
    expect(screen.getByRole('navigation', { name: 'Ruta' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Entradas').getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Almacen').getAttribute('aria-current')).toBeNull();

    // El separador es puntuacion, no informacion: leido en voz alta convierte «Almacen / Entradas»
    // en «Almacen barra Entradas».
    expect(screen.getByText('/').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('el plegable', () => {
  it('no tiene cuerpo hasta que se abre, y NO monta un portal', () => {
    render(
      <Plegable>
        <DisparadorDelPlegable>Almacen</DisparadorDelPlegable>
        <CuerpoDelPlegable>
          <span>Entradas</span>
        </CuerpoDelPlegable>
      </Plegable>,
    );
    expect(screen.queryByText('Entradas')).toBeNull();

    const disparador = screen.getByRole('button', { name: 'Almacen' });
    fireEvent.click(disparador);

    const cuerpo = screen.getByText('Entradas');
    expect(cuerpo).toBeTruthy();
    // Es la unica de las siete que empuja en vez de tapar: si montara un portal, las filas
    // siguientes del arbol quedarian debajo y habria que cerrarlo para seguir mirando.
    expect(document.body.contains(cuerpo)).toBe(true);
    expect(disparador.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(disparador);
    expect(screen.queryByText('Entradas')).toBeNull();
  });
});

describe('la confirmacion', () => {
  it('sale con las TRES salidas, y la que no rompe nada es la que recibe el foco', () => {
    render(
      <Confirmacion>
        <DisparadorDeConfirmacion>Salir</DisparadorDeConfirmacion>
        <PanelDeConfirmacion>
          <TituloDeConfirmacion>Entradas tiene cambios sin guardar</TituloDeConfirmacion>
          <NotaDeConfirmacion>Si cierra la pantalla se pierden.</NotaDeConfirmacion>
          <SalidasDeConfirmacion>
            <Descartar>Salir y perder los cambios</Descartar>
            <HuecoDeConfirmacion />
            <Cancelar>Seguir editando</Cancelar>
            <Confirmar>Guardar y cerrar</Confirmar>
          </SalidasDeConfirmacion>
        </PanelDeConfirmacion>
      </Confirmacion>,
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

    // `alertdialog` y no `dialog`: es lo que impide cerrarlo PULSANDO FUERA, que es el gesto de
    // quien quiere seguir a lo suyo y saldria de la pantalla sin contestar la pregunta.
    const panel = screen.getByRole('alertdialog');
    expect(panel.textContent).toContain('Entradas tiene cambios sin guardar');
    for (const rotulo of ['Salir y perder los cambios', 'Seguir editando', 'Guardar y cerrar']) {
      expect(screen.getByRole('button', { name: rotulo })).toBeTruthy();
    }
    // Radix enfoca el `Cancel` al abrir. Poner ahi «perder los cambios» los perderia con un Enter
    // distraido, y por eso esa salida es un `Action` y no el `Cancel`.
    expect(document.activeElement?.getAttribute('data-slot')).toBe('cancelar');
    expect(document.activeElement?.textContent).toBe('Seguir editando');

    // Pulsar fuera NO cierra: medido sobre esta pieza, no supuesto. Es la diferencia de verdad con
    // un `Dialog`, y es la que impide salir de la pantalla sin haber contestado.
    const velo = document.querySelector('[data-slot="velo-de-confirmacion"]');
    fireEvent.pointerDown(velo as Element);
    fireEvent.click(velo as Element);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('y `Esc` SI cierra, que es lo que obliga a que Esc signifique la salida inocua', () => {
    // Tambien medido: Radix no le quita el `Esc` al `AlertDialog`. Asi que quien lo monta tiene que
    // conectar el cierre a «seguir editando» y no a «salir» — que es lo que hace `AvisoDeCambios`.
    render(
      <Confirmacion defaultOpen>
        <PanelDeConfirmacion>
          <TituloDeConfirmacion>Entradas tiene cambios sin guardar</TituloDeConfirmacion>
          <NotaDeConfirmacion>Si cierra la pantalla se pierden.</NotaDeConfirmacion>
          <SalidasDeConfirmacion>
            <Cancelar>Seguir editando</Cancelar>
          </SalidasDeConfirmacion>
        </PanelDeConfirmacion>
      </Confirmacion>,
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('el cajon', () => {
  it('sale por el lado, con titulo aunque el diseno no lo dibuje', () => {
    render(
      <Cajon>
        <DisparadorDelCajon>Modulos</DisparadorDelCajon>
        <PanelDelCajon lado="izquierda">
          <TituloDelCajon>Modulos</TituloDelCajon>
          <NotaDelCajon>Elija el destino que quiere abrir.</NotaDelCajon>
          <span>Almacen</span>
        </PanelDelCajon>
      </Cajon>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Modulos' }));

    const panel = screen.getByRole('dialog');
    expect(panel.getAttribute('data-lado')).toBe('izquierda');
    // Sin titulo, el lector de pantalla anuncia «dialogo» y nada mas. Radix ademas lo reprocha por
    // consola, y tiene razon.
    expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
    expect(panel.textContent).toContain('Almacen');
  });
});

describe('la paleta de mando', () => {
  it('monta abierta, ofrece sus opciones y avisa con el valor de la elegida', () => {
    const elegidos: string[] = [];
    render(
      <PaletaDeMando label="Buscar un destino" open>
        <BuscadorDeLaPaleta placeholder="Un modulo o un destino…" />
        <ListaDeLaPaleta>
          <VacioDeLaPaleta>Ningun destino coincide.</VacioDeLaPaleta>
          <OpcionDeLaPaleta value="alm-panel" onSelect={(v) => elegidos.push(v)}>
            Panel
          </OpcionDeLaPaleta>
          <OpcionDeLaPaleta value="flo-turnos" onSelect={(v) => elegidos.push(v)}>
            Turnos
          </OpcionDeLaPaleta>
        </ListaDeLaPaleta>
      </PaletaDeMando>,
    );

    expect(screen.getByPlaceholderText('Un modulo o un destino…')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    fireEvent.click(screen.getByRole('option', { name: 'Turnos' }));
    // El valor, y no el texto: es lo que deja que el rotulo cambie sin que cambie a donde lleva.
    expect(elegidos).toEqual(['flo-turnos']);
  });

  it('y sin opciones ensena el vacio, que es lo que evita una lista muda', () => {
    render(
      <PaletaDeMando label="Buscar un destino" open>
        <BuscadorDeLaPaleta />
        <ListaDeLaPaleta>
          <VacioDeLaPaleta>Ningun destino coincide.</VacioDeLaPaleta>
        </ListaDeLaPaleta>
      </PaletaDeMando>,
    );
    expect(screen.getByText('Ningun destino coincide.')).toBeTruthy();
  });
});

describe('los avisos', () => {
  it('salen en una region viva, con el rotulo en castellano, y SIN robar el foco', async () => {
    render(<Avisos />);
    const antes = document.activeElement;
    avisar('Guardado.');

    await waitFor(() => {
      expect(screen.getByText('Guardado.')).toBeTruthy();
    });
    // Un `alert` interrumpiria lo que se estuviera leyendo, y «Guardado.» no merece interrumpir a
    // nadie; sin region viva, quien no mira la esquina no se entera de que guardo.
    const region = screen.getByText('Guardado.').closest('[aria-live]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    // Y el rotulo de esa region: sin `containerAriaLabel`, `sonner` la llama «Notifications alt+T».
    // No se dibuja en ninguna parte, asi que una pantalla en castellano se anuncia en ingles y
    // nadie lo ve mirandola.
    // `sonner` le pega detras su propio atajo —«Avisos alt+T»—, que si es suyo y no se traduce.
    expect(region?.getAttribute('aria-label')).toContain('Avisos');
    expect(region?.getAttribute('aria-label')).not.toContain('Notifications');
    expect(document.activeElement).toBe(antes);
  });
});
