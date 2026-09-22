import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Pantalla, type DefinicionDePantalla, type HojaDelMarco, type PiezaDeLaPantalla } from '../ui/index.ts';

import { Armazon } from './Armazon.tsx';
import type { Catalogo } from './catalogo.ts';
import { useHoja, type AvisoDeLaRuta, type ConfiguracionDelArmazon, type HojaAbierta } from './contexto.tsx';
import { useNavegacion, type NavegacionDelArmazon } from './navegacion.tsx';

/**
 * **El estado de una hoja vive en la ruta** (#67), montado con el `Armazon` entero y la barra de
 * direcciones de verdad.
 *
 * <h2>Como se simula «recargar»</h2>
 *
 * Se desmonta el armazon, se deja el hash que escribio y se vuelve a montar. Es lo que hace el
 * navegador: el estado de React se pierde entero y lo unico que sobrevive es la direccion. Una hoja
 * que guardara su eleccion en un estado propio pasaria todas las pruebas de clic y fallaria esta.
 *
 * <h2>El catalogo esta inventado, como en `armazon.test.tsx`</h2>
 *
 * Y por lo mismo: si el marco supusiera un sistema, no dibujaria esto. `alm-panel` es una hoja **sin
 * estado**, con la forma de las cuarenta de `rentas`; `registros` es la que guarda sujeto y pestana.
 */

beforeAll(() => {
  // Los mismos remiendos de `armazon.test.tsx`: jsdom no los trae y Radix, `cmdk` y `sonner` los usan.
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

const CATALOGO: Catalogo = [
  {
    clave: 'almacen',
    rotulo: 'Almacen',
    nota: 'Lo que entra y lo que sale',
    icono: 'capas',
    destinos: [
      // Sin `enLaRuta`: la forma de las cuarenta hojas de `rentas`.
      { clave: 'alm-panel', rotulo: 'Panel del almacen', seEscribe: false },
      {
        clave: 'registros',
        rotulo: 'Registros',
        seEscribe: false,
        enLaRuta: { sujeto: true, parametros: ['ver'] },
        acceso: 'consulta_registros',
        tambien: ['detalle_registros'],
        aSangre: true,
      },
      { clave: 'alm-entradas', rotulo: 'Entradas', seEscribe: true, slug: 'entradas' },
    ],
  },
  {
    clave: 'flota',
    rotulo: 'Flota',
    nota: 'Los vehiculos y sus turnos',
    icono: 'vehiculo',
    destinos: [{ clave: 'flo-turnos', rotulo: 'Turnos', seEscribe: false, enLaRuta: { parametros: ['turno'] } }],
  },
];

/** La ultima hoja abierta que vio una pantalla. Es como la prueba mira `useHoja()` por dentro. */
let vista: HojaAbierta | null = null;
/** Y el `ir` de `useNavegacion()` (#66), para pedir otra hoja desde la prueba. */
let ir: NavegacionDelArmazon['ir'] | null = null;

/** Una pantalla del sistema: dice su ruta, tiene un campo que se teclea y se ensucia. */
function PantallaDePrueba() {
  const hoja = useHoja();
  vista = hoja;
  ir = useNavegacion().ir;
  return (
    <div>
      <p data-testid="ruta">{JSON.stringify(hoja.ruta)}</p>
      <p data-testid="marco">{JSON.stringify(hoja.marco)}</p>
      <label>
        Apunte
        <input
          onChange={() => {
            hoja.marcarSucia();
          }}
        />
      </label>
    </div>
  );
}

/** La hoja `registros`, dibujada por el INTERPRETE: un maestro-detalle con pestanas en el detalle. */
const DEFINICION: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: '',
  bloques: [
    {
      tipo: 'maestroDetalle',
      enLaRuta: 'sujeto',
      maestro: { rotulo: 'Registros', filas: 'registros', fila: { titulo: '{nombre}' }, vacio: 'Ninguno.' },
      detalle: {
        sinEleccion: 'Elija uno de la lista.',
        noEstaEnLaLista: 'No esta en la lista.',
        cabecera: { titulo: { plantilla: 'Registro {ruta.sujeto} · Ejercicio {marco.ejercicio}' } },
        bloques: [
          {
            tipo: 'pestanas',
            enLaRuta: 'ver',
            rotulo: 'Vistas',
            pestanas: [
              { clave: 'vigente', rotulo: 'Vigente', bloques: [{ tipo: 'aviso', tono: 'info', titulo: 'Lo vigente' }] },
              { clave: 'historial', rotulo: 'Movimientos', bloques: [{ tipo: 'aviso', tono: 'info', titulo: 'Lo pasado' }] },
            ],
          },
        ],
      },
    },
  ],
};

function HojaInterpretada() {
  const hoja = useHoja();
  vista = hoja;
  return (
    <Pantalla
      definicion={DEFINICION}
      datos={{
        ausencia: { enElCampo: '—', explicacion: '', tono: 'info' },
        listas: new Map([
          [
            'registros',
            [
              { clave: '41', campos: { nombre: 'Primero' } },
              { clave: 'A/42', campos: { nombre: 'Segundo' } },
            ],
          ],
        ]),
      }}
      tonoDeLaInsignia={() => 'ok'}
      hoja={hoja}
    />
  );
}

interface Opciones {
  readonly hash?: string;
  readonly marco?: ConfiguracionDelArmazon['marco'];
  readonly avisos?: AvisoDeLaRuta[];
  readonly catalogo?: Catalogo;
}

function armazon({ marco, avisos, catalogo = CATALOGO }: Opciones = {}) {
  return (
    <Armazon
      titulo="Sistema de prueba"
      entidad="Entidad de prueba"
      catalogo={catalogo}
      cuenta={{ nombre: 'J. Ruiz', iniciales: 'JR' }}
      opcionesDeSesion={[]}
      marco={marco}
      enLaBarra={<span data-testid="selector-del-sistema">selector</span>}
      alIgnorarDeLaRuta={avisos === undefined ? undefined : (aviso) => avisos.push(aviso)}
      pantalla={(hoja) => (hoja.destino.clave === 'registros' ? <HojaInterpretada /> : <PantallaDePrueba />)}
    />
  );
}

function montar(opciones: Opciones = {}) {
  window.location.hash = opciones.hash ?? '';
  return render(armazon(opciones));
}

/** Lo que hace el navegador al recargar: se pierde todo menos la direccion. */
function recargar(montado: ReturnType<typeof montar>, opciones: Opciones = {}) {
  const direccion = window.location.hash;
  montado.unmount();
  return montar({ ...opciones, hash: direccion });
}

function irPorElArbol(modulo: string, hoja: string): void {
  const disparador = screen.getByRole('button', { name: new RegExp(modulo) });
  if (disparador.getAttribute('aria-expanded') !== 'true') fireEvent.click(disparador);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(hoja) }));
}

beforeEach(() => {
  window.location.hash = '';
  vista = null;
  ir = null;
});

describe('EL AC-2: `#/<slug>` gana un sujeto y parametros SIN romper la forma de hoy', () => {
  it('una hoja sin `enLaRuta` —la forma de `rentas`— sigue escribiendo `#/<slug>` y nada mas', () => {
    montar();
    irPorElArbol('Almacen', 'Panel del almacen');
    expect(window.location.hash).toBe('#/alm-panel');
    expect(vista?.ruta).toEqual({ sujeto: null, parametros: {} });
  });

  it('y una que SI declara, abierta desde el arbol, tambien: sin estado, la direccion es la de siempre', () => {
    montar();
    irPorElArbol('Almacen', 'Registros');
    expect(window.location.hash).toBe('#/registros');
  });

  it('RECARGAR REPRODUCE LA HOJA: el sujeto (con su barra) y el parametro vuelven a `useHoja().ruta`', () => {
    montar({ hash: '#/registros/A%2F42?ver=historial' });
    expect(vista?.ruta).toEqual({ sujeto: 'A/42', parametros: { ver: 'historial' } });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Registros');
  });

  it('un parametro que la hoja NO declara se ignora CON AVISO, y la hoja se abre igual', () => {
    const avisos: AvisoDeLaRuta[] = [];
    montar({ hash: '#/registros/41?ver=historial&orden=desc', avisos });
    expect(vista?.ruta).toEqual({ sujeto: '41', parametros: { ver: 'historial' } });
    expect(avisos).toEqual([{ destino: 'registros', ignorados: ['?orden'] }]);
  });

  it('un sujeto en una hoja que no lo declara: se ignora con aviso, NO dice «no ofrecido»', () => {
    const avisos: AvisoDeLaRuta[] = [];
    montar({ hash: '#/alm-panel/42', avisos });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Panel del almacen');
    expect(screen.queryByText(/no corresponde a ningun destino/)).toBeNull();
    expect(avisos).toEqual([{ destino: 'alm-panel', ignorados: ['/42'] }]);
  });

  it('sin `alIgnorarDeLaRuta`, el aviso va a la consola: se ve, y no revienta', () => {
    const consola = vi.spyOn(console, 'warn').mockImplementation(() => {});
    montar({ hash: '#/flo-turnos?turno=noche&otro=1' });
    expect(vista?.ruta).toEqual({ sujeto: null, parametros: { turno: 'noche' } });
    expect(consola.mock.calls.flat().join(' ')).toContain('?otro');
    consola.mockRestore();
  });

  it('un sujeto mal codificado no deja la pagina en blanco', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    montar({ hash: '#/registros/%E0%A4%A' });
    expect(vista?.ruta.sujeto).toBe('%E0%A4%A');
    expect(screen.queryByText(/Unexpected Application Error/i)).toBeNull();
    vi.restoreAllMocks();
  });

  it('lo que el catalogo no ofrece sigue sin abrirse, CON sujeto y parametros', () => {
    montar({ hash: '#/registros/41?ver=historial', catalogo: CATALOGO.filter((m) => m.clave === 'flota') });
    expect(screen.getByText(/no corresponde a ningun destino disponible/)).toBeTruthy();
  });
});

describe('`moverLaRuta` y `ir`: la pantalla escribe la ruta', () => {
  it('`moverLaRuta` cambia lo nombrado, conserva lo demas, y `null` lo quita', () => {
    montar({ hash: '#/registros/41?ver=historial' });
    act(() => {
      vista?.moverLaRuta({ sujeto: 'A/42' });
    });
    expect(window.location.hash).toBe('#/registros/A%2F42?ver=historial');
    act(() => {
      vista?.moverLaRuta({ parametros: { ver: null } });
    });
    expect(window.location.hash).toBe('#/registros/A%2F42');
  });

  it('`useNavegacion().ir` (#66) lleva a otra hoja con SU forma de ruta, y lo no declarado se ignora', () => {
    const avisos: AvisoDeLaRuta[] = [];
    montar({ hash: '#/alm-panel', avisos });
    act(() => {
      ir?.({ hoja: 'registros', sujeto: '41', parametros: { ver: 'historial', colado: 'x' } });
    });
    expect(window.location.hash).toBe('#/registros/41?ver=historial');
    expect(vista?.ruta).toEqual({ sujeto: '41', parametros: { ver: 'historial' } });
    // Lo que la hoja de destino no declara, se ignora igual que si viniera escrito en la barra.
    expect(avisos).toEqual([{ destino: 'registros', ignorados: ['?colado'] }]);
  });
});

describe('`key` por destino: lo tecleado en una hoja no pasa a la siguiente', () => {
  it('se teclea en una, se va a otra con la MISMA pantalla, y la otra esta vacia', () => {
    montar({ hash: '#/alm-panel' });
    const campo = screen.getByRole('textbox', { name: 'Apunte' });
    fireEvent.change(campo, { target: { value: 'escrito en el panel' } });
    // Se sale sin preguntar para medir solo la `key`: la marca de sucia la limpia «salir igualmente».
    irPorElArbol('Flota', 'Turnos');
    fireEvent.click(screen.getByRole('button', { name: 'Salir y perder los cambios' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turnos');
    expect(
      (screen.getByRole('textbox', { name: 'Apunte' }) as HTMLInputElement).value,
      'lo tecleado en el panel aparecio en Turnos: la pantalla no lleva `key` por destino',
    ).toBe('');
  });
});

describe('EL AC-3: maestro-detalle y pestanas ESCRIBEN la ruta, y la ruta LAS RESTITUYE', () => {
  it('elegir en el maestro y cambiar de pestana escriben la direccion', async () => {
    const teclado = userEvent.setup({ delay: null });
    montar({ hash: '#/registros', marco: { ejercicio: '2026' } });
    expect(screen.getByText('Elija uno de la lista.')).toBeTruthy();

    await teclado.click(screen.getByRole('option', { name: 'Segundo' }));
    expect(window.location.hash, 'elegir en el maestro no escribio la ruta').toBe('#/registros/A%2F42');

    await teclado.click(screen.getByRole('tab', { name: 'Movimientos' }));
    expect(window.location.hash, 'cambiar de pestana no escribio la ruta').toBe('#/registros/A%2F42?ver=historial');
  });

  it('RECARGAR sobre `#/registros/<sujeto>?ver=historial` restituye el elegido y la pestana', async () => {
    const teclado = userEvent.setup({ delay: null });
    const montado = montar({ hash: '#/registros', marco: { ejercicio: '2026' } });
    await teclado.click(screen.getByRole('option', { name: 'Segundo' }));
    await teclado.click(screen.getByRole('tab', { name: 'Movimientos' }));

    recargar(montado, { marco: { ejercicio: '2026' } });

    expect(
      screen.getByRole('option', { name: 'Segundo' }).getAttribute('aria-selected'),
      'recargar no restituyo el elegido del maestro',
    ).toBe('true');
    expect(
      screen.getByRole('tab', { name: 'Movimientos' }).getAttribute('aria-selected'),
      'recargar no restituyo la pestana',
    ).toBe('true');
    expect(screen.getByText('Lo pasado')).toBeTruthy();
    expect(screen.queryByText('Lo vigente')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Registro A/42 · Ejercicio 2026' })).toBeTruthy();
  });

  it('CON EL TECLADO: Intro elige en el maestro y → cambia de pestana, y los dos escriben la ruta', async () => {
    const teclado = userEvent.setup({ delay: null });
    montar({ hash: '#/registros/41' });
    act(() => {
      screen.getByRole('option', { name: 'Primero' }).focus();
    });
    await teclado.keyboard('{ArrowDown}{Enter}');
    expect(window.location.hash).toBe('#/registros/A%2F42');
    act(() => {
      screen.getByRole('tab', { name: 'Vigente' }).focus();
    });
    await teclado.keyboard('{ArrowRight}');
    expect(window.location.hash).toBe('#/registros/A%2F42?ver=historial');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Movimientos' }));
  });

  it('cambiar de sujeto NO desmonta la pantalla: el foco se queda en la lista', async () => {
    const teclado = userEvent.setup({ delay: null });
    montar({ hash: '#/registros/41' });
    const lista = screen.getByRole('listbox');
    await teclado.click(within(lista).getByRole('option', { name: 'Segundo' }));
    // El MISMO nodo: con la `key` en la ruta entera, la lista se habria vuelto a crear.
    expect(screen.getByRole('listbox')).toBe(lista);
  });
});

describe('`parametro-del-marco`', () => {
  it('el sistema lo pone, la hoja lo lee, y al cambiar se vuelve a pintar con el nuevo', () => {
    window.location.hash = '#/registros/41';
    const { rerender } = render(armazon({ marco: { ejercicio: '2026' } }));
    expect(screen.getByRole('heading', { name: 'Registro 41 · Ejercicio 2026' })).toBeTruthy();
    rerender(armazon({ marco: { ejercicio: '2027' } }));
    expect(screen.getByRole('heading', { name: 'Registro 41 · Ejercicio 2027' })).toBeTruthy();
    // Y NO viaja en la ruta: es de la sesion, no de la hoja.
    expect(window.location.hash).toBe('#/registros/41');
  });

  it('su control lo dibuja el sistema, en la barra', () => {
    montar();
    const barra = document.querySelector('[data-slot="barra-global"]') as HTMLElement;
    expect(within(barra).getByTestId('selector-del-sistema')).toBeTruthy();
  });

  it('sin marco, `{}`', () => {
    montar({ hash: '#/alm-panel' });
    expect(vista?.marco).toEqual({});
  });
});

describe('`acceso-por-hoja`: el marco lo lleva y NO decide', () => {
  it('la hoja lo expone con su acceso y los demas', () => {
    montar({ hash: '#/registros' });
    expect(vista?.hoja.destino.acceso).toBe('consulta_registros');
    expect(vista?.hoja.destino.tambien).toEqual(['detalle_registros']);
  });

  it('y una hoja con acceso se ofrece y se abre igual que una sin el: filtrar es del sistema', () => {
    montar();
    irPorElArbol('Almacen', 'Registros');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Registros');
  });
});

describe('`hoja-a-sangre`', () => {
  it('a sangre: sin el margen ni el ancho del marco, y sin su desplazamiento', () => {
    montar({ hash: '#/registros' });
    const cuerpo = document.querySelector('[data-slot="cuerpo-del-marco"]');
    const hoja = document.querySelector('[data-slot="hoja-del-marco"]');
    expect(cuerpo?.hasAttribute('data-a-sangre')).toBe(true);
    expect(cuerpo?.className).not.toContain('overflow-auto');
    expect(hoja?.className).not.toMatch(/px-\[18px\]|max-w-\[1180px\]/);
    // Y la cabecera y el pie se quedan: una hoja a sangre sigue siendo una hoja del marco.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Registros');
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('EL CENTINELA: una hoja que no lo pide lleva el margen y el desplazamiento de siempre', () => {
    montar({ hash: '#/alm-panel' });
    const cuerpo = document.querySelector('[data-slot="cuerpo-del-marco"]');
    expect(cuerpo?.hasAttribute('data-a-sangre')).toBe(false);
    expect(cuerpo?.className).toContain('overflow-auto');
    expect(document.querySelector('[data-slot="hoja-del-marco"]')?.className).toMatch(/px-\[18px\]/);
  });
});

/**
 * La barrera de tipo del cableado de una linea: `HojaAbierta` ES una `HojaDelMarco`. Si el marco
 * renombrara `ruta` o `moverLaRuta`, `<Pantalla hoja={useHoja()} />` dejaria de compilar AQUI y no
 * en el sistema que la usa.
 *
 * **Y desde #86, con los cuatro miembros nuevos OBLIGATORIOS**: en `HojaDelMarco` son opcionales —una
 * hoja escrita a mano tiene que seguir cabiendo—, asi que la asignacion a secas seguiria compilando
 * con un marco que dejara de darlos, y la hoja dejaria de ensuciarse y de conservar lo tecleado sin
 * un solo rojo. Si el marco deja de dar cualquiera de los cuatro, o lo renombra, sale rojo AQUI.
 */
export const _laHojaDelMarcoCabeEnLaPantalla = (
  hoja: HojaAbierta,
): HojaDelMarco &
  Required<Pick<HojaDelMarco, 'marcarSucia' | 'marcarGuardada' | 'alTeclear'>> & {
    readonly tecleado: HojaDelMarco['tecleado'];
  } => hoja;
