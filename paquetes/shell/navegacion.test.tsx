import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Pantalla, type DefinicionDePantalla, type PiezaDeLaPantalla } from '../ui/index.ts';

import { Armazon } from './Armazon.tsx';
import type { Catalogo } from './catalogo.ts';
import { useHoja } from './contexto.tsx';
import { ubicacionDe, useNavegacion, type ResultadoDeIr } from './navegacion.tsx';
import { leerLaRuta } from './ruta.ts';
import { TEXTOS_DEL_ARMAZON } from './textos.ts';

/**
 * **Ir a otra hoja desde una pantalla pasa por el marco** (#66, AC-5: `navegar-a-otra-hoja`).
 *
 * Dos garantias, y las dos se prueban con el armazon montado entero y un catalogo INVENTADO, como
 * `armazon.test.tsx`: lo que el catalogo no ofrece no se abre —ni pregunta si perder los cambios
 * para ir a ninguna parte—, y con la hoja sucia salta el aviso y el destino espera con su sujeto.
 *
 * La ultima prueba monta el interprete de `@kamayuk/ui` dentro, con `navegacion={useNavegacion()}`:
 * es la demostracion de que la forma que el marco da cabe tal cual en la que la pantalla pide.
 */

beforeAll(() => {
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

beforeEach(() => {
  window.location.hash = '';
});

const CATALOGO: Catalogo = [
  {
    clave: 'deposito',
    rotulo: 'Deposito',
    nota: 'Lo que se guarda',
    icono: 'capas',
    destinos: [
      { clave: 'dep-lista', rotulo: 'Lista', seEscribe: true },
      // Declara lo que guarda en la ruta (#67): sin eso, el sujeto y `estado` se ignorarian con aviso.
      {
        clave: 'dep-detalle',
        rotulo: 'Detalle',
        seEscribe: false,
        slug: 'detalle',
        enLaRuta: { sujeto: true, parametros: ['estado'] },
      },
    ],
  },
];

/** Lo que devolvio la ultima llamada a `ir`, para leerlo desde la prueba. */
let ultimo: ResultadoDeIr | undefined;

/** La pantalla del sistema: se ensucia, y pide ir a donde se le diga. */
function PantallaQueNavega({ clave }: { readonly clave: string }) {
  const { marcarSucia, ruta } = useHoja();
  const { ir, ofrece } = useNavegacion();
  const [dicho, setDicho] = useState('');
  return (
    <div>
      <p>Contenido de {clave}</p>
      <p>
        ruta de {clave}: {JSON.stringify(ruta)}
      </p>
      <button type="button" onClick={marcarSucia}>
        Escribir algo
      </button>
      <button
        type="button"
        onClick={() => {
          ultimo = ir({ hoja: 'dep-detalle', sujeto: '42', parametros: { estado: 'BAJA' } });
          setDicho(ultimo);
        }}
      >
        Ir al detalle
      </button>
      <button
        type="button"
        onClick={() => {
          ultimo = ir({ hoja: 'no-existe', sujeto: '42' });
          setDicho(ultimo);
        }}
      >
        Ir a ninguna parte
      </button>
      <p>ofrece el detalle: {String(ofrece('dep-detalle'))}</p>
      <p>ofrece otra: {String(ofrece('no-existe'))}</p>
      <p>resultado: {dicho}</p>
    </div>
  );
}

function montar(pantalla: (clave: string) => React.ReactNode, hash = '#/dep-lista') {
  window.location.hash = hash;
  ultimo = undefined;
  return render(
    <Armazon
      titulo="Sistema de prueba"
      entidad="Entidad de prueba"
      catalogo={CATALOGO}
      cuenta={{ nombre: 'J. Ruiz', iniciales: 'JR' }}
      opcionesDeSesion={[]}
      pantalla={(hoja) => pantalla(hoja.destino.clave)}
    />,
  );
}

describe('`ubicacionDe`: el unico sitio que escribe la direccion', () => {
  it('sin sujeto ni parametros, la forma canonica de #13 tal cual', () => {
    expect(ubicacionDe('entradas')).toBe('/entradas');
    expect(ubicacionDe('entradas', { sujeto: '', parametros: {} })).toBe('/entradas');
  });

  it('el sujeto va en el camino y los parametros en la busqueda (#67), codificados, y un parametro no pisa el sujeto', () => {
    expect(ubicacionDe('detalle', { sujeto: 'A/1 b', parametros: { estado: 'BAJA', sujeto: 'otro' } })).toBe(
      '/detalle/A%2F1%20b?estado=BAJA',
    );
  });

  it('y lo que escribe es lo que la ruta LEE: `ir` y `useHoja().ruta` dicen lo mismo (#67)', () => {
    const escrita = ubicacionDe('detalle', { sujeto: 'A/1 b', parametros: { estado: 'BAJA' } });
    const [camino = '', busqueda = ''] = escrita.split('?');
    expect(leerLaRuta(camino, `?${busqueda}`)).toEqual({
      slug: 'detalle',
      sujeto: 'A/1 b',
      parametros: { estado: 'BAJA' },
    });
  });
});

describe('EL AC-5: ir a otra hoja pasa por el marco', () => {
  it('con la hoja limpia, se va: con su sujeto y sus parametros en la direccion', () => {
    montar((clave) => <PantallaQueNavega clave={clave} />);
    expect(screen.getByText('ofrece el detalle: true')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ir al detalle' }));

    expect(ultimo).toBe('abierta');
    expect(window.location.hash).toBe('#/detalle/42?estado=BAJA');
    expect(screen.getByText('Contenido de dep-detalle')).toBeTruthy();
    // Y la hoja de destino LEE lo que `ir` escribio: la misma ruta, por el mismo sitio (#67).
    expect(screen.getByText('ruta de dep-detalle: {"sujeto":"42","parametros":{"estado":"BAJA"}}')).toBeTruthy();
  });

  it('un destino que el catalogo NO ofrece no se abre, y con la hoja sucia NI PREGUNTA', () => {
    montar((clave) => <PantallaQueNavega clave={clave} />);
    expect(screen.getByText('ofrece otra: false')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Escribir algo' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ir a ninguna parte' }));

    expect(ultimo, 'se pidio ir a una hoja que el catalogo no ofrece, y el marco no lo dijo').toBe('no-ofrecida');
    expect(
      screen.queryByRole('alertdialog'),
      'pregunto si perder los cambios para ir a una hoja que no existe',
    ).toBeNull();
    expect(window.location.hash).toBe('#/dep-lista');
    expect(screen.getByText('Contenido de dep-lista')).toBeTruthy();
  });

  it('con la hoja SUCIA pregunta; «Seguir editando» se queda, y «Salir» va con el sujeto que esperaba', () => {
    montar((clave) => <PantallaQueNavega clave={clave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escribir algo' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ir al detalle' }));
    expect(ultimo).toBe('pregunta');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: TEXTOS_DEL_ARMAZON.seguirEditando }));
    expect(window.location.hash).toBe('#/dep-lista');

    fireEvent.click(screen.getByRole('button', { name: 'Ir al detalle' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: TEXTOS_DEL_ARMAZON.salirYPerderLosCambios }),
    );
    expect(window.location.hash, 'el destino perdio su sujeto al esperar la respuesta').toBe(
      '#/detalle/42?estado=BAJA',
    );
  });

  it('fuera del `<Armazon>` revienta, en vez de dar una que no navega', () => {
    const Suelta = () => {
      useNavegacion();
      return null;
    };
    const silencio = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Suelta />)).toThrow(/useNavegacion\(\) fuera del <Armazon>/);
    } finally {
      console.error = silencio;
    }
  });
});

describe('el interprete dentro del marco: `navegacion={useNavegacion()}` cabe tal cual', () => {
  const HOJA: DefinicionDePantalla<PiezaDeLaPantalla> = {
    instruccion: '',
    bloques: [
      {
        titulo: 'El registro',
        nota: '',
        campos: [],
        acciones: [
          { rotulo: 'Ver el detalle', va: { hoja: 'dep-detalle', sujeto: { desde: 'id' } } },
          { rotulo: 'Ver otra hoja', va: { hoja: 'no-existe' } },
        ],
      },
    ],
  };

  function ListaConInterprete() {
    const navegacion = useNavegacion();
    return (
      <Pantalla
        definicion={HOJA}
        datos={{ ausencia: { enElCampo: '—', explicacion: '', tono: 'info' }, nombrados: new Map([['id', '7']]) }}
        tonoDeLaInsignia={() => 'ok'}
        navegacion={navegacion}
      />
    );
  }

  it('TECLADO: Tab hasta la accion y Enter abre la otra hoja; la que el catalogo no ofrece sale impedida', async () => {
    const teclado = userEvent.setup({ delay: null });
    montar((clave) => (clave === 'dep-lista' ? <ListaConInterprete /> : <p>Contenido de {clave}</p>));

    const otra = screen.getByRole('button', { name: 'Ver otra hoja' });
    expect(otra.getAttribute('aria-disabled')).toBe('true');

    screen.getByRole('button', { name: 'Ver el detalle' }).focus();
    await teclado.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/detalle/7');
    expect(screen.getByText('Contenido de dep-detalle')).toBeTruthy();
  });
});
