import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PIEZA_POR_TIPO } from '../shadcn/campos.ts';
import type { Ausencia } from './datos.ts';
import { coordenada } from './datos.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDeCampo, DefinicionDePantalla, TonoDeInsignia } from './tipos.ts';

/**
 * **El interprete dibuja lo que la definicion dice** (#27).
 *
 * Sube con el interprete desde `rentas/frontend/src/pantallas/Pantalla.test.tsx` (`rentas`#88), con
 * dos cambios que son la subida misma:
 *
 * · **Las definiciones son NEUTRAS.** En `rentas` hablaban de tributos; aqui no pueden, y no por
 *   pudor: `sin-suponer-un-sistema` barre el codigo de produccion y no las pruebas, pero una prueba
 *   de la libreria escrita con el vocabulario de un sistema es la API de ese sistema con otro
 *   nombre, que es justo lo que #27 no quiere subir. Un puesto y un nicho valen para cualquiera.
 * · **Lo que en `rentas` salia de `i18next` y de `tono.ts` entra por `props`**, y se prueba asi:
 *   con un `tonoDeLaInsignia` inventado por la propia prueba.
 *
 * La cabecera y el pie no se prueban aqui porque no se dibujan aqui: son de `@kamayuk/shell`.
 */

const campo = (c: DefinicionDeCampo): DefinicionDePantalla => ({
  instruccion: 'haga lo que toque.',
  bloques: [{ titulo: 'Un bloque', nota: '', campos: [c] }],
});

const SIN_DATO: Ausencia = {
  enElCampo: 'sin conectar',
  explicacion: 'Esta pantalla de prueba no esta conectada a nada.',
  tono: 'info',
};

/** Un reparto de tonos inventado: lo que cada sistema escribe con SU vocabulario. */
const TONO_DE_PRUEBA = (texto: string): TonoDeInsignia => (/cerrado/i.test(texto) ? 'mal' : 'ok');

const monta = (definicion: DefinicionDePantalla, extra: Partial<PantallaProps> = {}) =>
  render(
    <Pantalla
      definicion={definicion}
      datos={{ ausencia: SIN_DATO }}
      tonoDeLaInsignia={TONO_DE_PRUEBA}
      {...extra}
    />,
  );

describe('los siete tipos de campo, cada uno con su pieza', () => {
  it('EL CENTINELA: la tabla de piezas sigue teniendo los siete', () => {
    // Si se quedara con uno, los `it` de abajo seguirian pasando de uno en uno y la cobertura se
    // habria evaporado sin que nada lo dijera.
    expect(Object.keys(PIEZA_POR_TIPO)).toHaveLength(7);
  });

  it('«s» es un desplegable de LISTA CERRADA, no un cuadro de texto', () => {
    monta(campo({ etiqueta: 'Turno', tipo: 's', opciones: ['Manana', 'Tarde'] }));
    expect(screen.getByRole('combobox', { name: 'Turno' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('«r» es un dato de solo lectura, y NO un campo desactivado', () => {
    monta(campo({ etiqueta: 'Cobrado', tipo: 'r' }), {
      datos: { ausencia: SIN_DATO, valores: new Map([[coordenada(0, 0), 'S/ 1,842.60']]) },
    });
    const dato = document.querySelector('[data-slot="dato"]');
    expect(dato?.textContent).toBe('S/ 1,842.60');
    // `<output>`: se lee, sigue en el recorrido del tabulador, y no viaja con el formulario.
    expect(dato?.tagName).toBe('OUTPUT');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('«r» sin dato DICE por que, y nunca pinta un cero', () => {
    monta(campo({ etiqueta: 'Cobrado', tipo: 'r' }));
    const dato = document.querySelector('[data-slot="dato"]');
    expect(dato?.textContent).toBe('sin conectar');
    expect(dato?.hasAttribute('data-sin-dato')).toBe(true);
    // Y la explicacion entera, una vez arriba.
    expect(screen.getByText('Esta pantalla de prueba no esta conectada a nada.')).toBeTruthy();
  });

  it('«c» es una casilla, y su texto se lee AL LADO de la marca', () => {
    monta(campo({ etiqueta: 'Aviso', tipo: 'c', casilla: 'Avisar por correo' }));
    expect(screen.getByRole('checkbox', { name: 'Avisar por correo' })).toBeTruthy();
  });

  it('«a» es un area, y «» un campo de una linea', () => {
    const { unmount } = monta(campo({ etiqueta: 'Observaciones', tipo: 'a' }));
    expect(screen.getByLabelText('Observaciones').tagName).toBe('TEXTAREA');
    unmount();
    monta(campo({ etiqueta: 'Nombre', tipo: '' }));
    expect(screen.getByLabelText('Nombre').tagName).toBe('INPUT');
  });

  it('«d» abre un calendario y NO un `input type=date`', () => {
    monta(campo({ etiqueta: 'Desde', tipo: 'd' }));
    // El nativo no se puede pintar y cambia de formato con el idioma del SISTEMA operativo: en una
    // fecha, «03/04» leido al reves no es una molestia, es otro dia.
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(screen.getByRole('button', { name: /dd\/mm\/aaaa/ })).toBeTruthy();
  });

  it('el `1` estira el campo y NO cambia el control', () => {
    monta(campo({ etiqueta: 'Observaciones', tipo: 'a1' }));
    const etiqueta = document.querySelector('[data-slot="etiqueta"]');
    expect(etiqueta?.getAttribute('data-ancho')).toBe('1');
    expect(screen.getByLabelText('Observaciones').tagName).toBe('TEXTAREA');
  });

  it('un tipo que no existe REVIENTA en vez de dibujarse como texto', () => {
    expect(() => monta(campo({ etiqueta: 'Raro', tipo: 'x' as 's', opciones: [] }))).toThrow(
      /no es un tipo de campo/,
    );
  });
});

describe('lo que se escribe, se escribe', () => {
  it('teclear cambia el valor y ENSUCIA la pantalla, una sola vez', async () => {
    const usuario = userEvent.setup({ delay: null });
    const sucias: number[] = [];
    monta(campo({ etiqueta: 'Nombre', tipo: '' }), { alEnsuciar: () => sucias.push(1) });

    await usuario.type(screen.getByLabelText('Nombre'), 'Rufina');
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Rufina');
    expect(sucias, 'aviso de sucia en cada tecla').toHaveLength(1);
  });

  it('lo que llega de la API NO pisa lo que alguien esta escribiendo', async () => {
    const usuario = userEvent.setup({ delay: null });
    const definicion = campo({ etiqueta: 'Nombre', tipo: '' });
    const { rerender } = monta(definicion);
    await usuario.type(screen.getByLabelText('Nombre'), 'Rufina');

    rerender(
      <Pantalla
        definicion={definicion}
        datos={{ ausencia: SIN_DATO, valores: new Map([[coordenada(0, 0), 'Otra']]) }}
        tonoDeLaInsignia={TONO_DE_PRUEBA}
      />,
    );
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Rufina');
  });
});

describe('la tabla de un bloque', () => {
  const conTabla: DefinicionDePantalla = {
    instruccion: 'consulte.',
    bloques: [
      {
        titulo: 'Puestos',
        nota: '',
        campos: [],
        tabla: {
          titulo: 'Por puesto',
          columnas: [
            { rotulo: 'Puesto', alineadoDerecha: false },
            { rotulo: 'Importe S/', alineadoDerecha: true },
            { rotulo: 'Situacion', alineadoDerecha: false },
          ],
          columnaDeInsignia: 2,
          nota: 'Lo cobrado no es lo contado.',
          accion: 'Anadir',
        },
      },
    ],
  };

  const CON_FILAS = {
    ausencia: SIN_DATO,
    filas: new Map([
      [
        0,
        [
          ['Puesto 14', '1,842.60', 'Abierto'],
          ['Nicho B-2', '310.00', 'Cerrado'],
        ],
      ],
    ]),
  };

  it('la columna de cifras va a la derecha, y la primera identifica la fila', () => {
    monta(conTabla, { datos: CON_FILAS });
    expect(screen.getByRole('cell', { name: '1,842.60' }).className).toContain('tabular-nums');
    expect(screen.getByRole('cell', { name: 'Puesto 14' }).className).toContain('whitespace-nowrap');
  });

  it('la insignia lleva el tono que el SISTEMA dice, no uno de la libreria', () => {
    monta(conTabla, { datos: CON_FILAS });
    expect(screen.getByText('Cerrado').className).toContain('bg-mal-fondo');
    expect(screen.getByText('Abierto').className).toContain('bg-ok-fondo');
  });

  it('la nota va FUERA de la tabla, y el conteo se cuenta solo', () => {
    monta(conTabla, { datos: CON_FILAS });
    expect(within(screen.getByRole('table')).queryByText(/no es lo contado/)).toBeNull();
    expect(screen.getByText('2 registros')).toBeTruthy();
  });

  it('sin filas no se escribe «0 registros»: se dice por que', () => {
    monta(conTabla);
    expect(screen.queryByText(/registro/)).toBeNull();
    expect(document.querySelector('p[data-sin-dato]')?.textContent).toBe('sin conectar');
  });
});

describe('lo que cambia de un sistema a otro entra por props', () => {
  it('`traducir` llega a TODO lo que viene de la definicion y de la ausencia, y a ningun dato', () => {
    const definicion: DefinicionDePantalla = {
      instruccion: 'x',
      bloques: [
        {
          titulo: 'Bloque',
          nota: 'Nota',
          campos: [
            { etiqueta: 'Lista', tipo: 's', opciones: ['Una'] },
            { etiqueta: 'Dato', tipo: 'r' },
          ],
          tabla: { titulo: 'Tabla', columnas: [{ rotulo: 'Columna', alineadoDerecha: false }] },
        },
      ],
    };
    monta(definicion, {
      traducir: (texto) => `«${texto}»`,
      datos: { ausencia: SIN_DATO, valores: new Map([[coordenada(0, 1), '1,842.60']]) },
    });
    expect(screen.getByText('«Bloque»')).toBeTruthy();
    expect(screen.getByText('«Nota»')).toBeTruthy();
    expect(screen.getByText('«Tabla»')).toBeTruthy();
    expect(screen.getByText('«Columna»')).toBeTruthy();
    expect(screen.getByText(`«${SIN_DATO.explicacion}»`)).toBeTruthy();
    // El dato, tal cual: traducir una cifra seria absurdo.
    expect(screen.getByText('1,842.60')).toBeTruthy();
  });

  it('las tres palabras propias se pueden cambiar sin tocar las otras', () => {
    monta(campo({ etiqueta: 'Desde', tipo: 'd' }), { textos: { marcadorDeFecha: 'jj/mm/aaaa' } });
    expect(screen.getByRole('button', { name: /jj\/mm\/aaaa/ })).toBeTruthy();
  });
});
