import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS } from '../textos.tsx';
import { resolverTexto } from './componer.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import type { CambioDeLaRuta, HojaDelMarco, RutaDeLaHoja } from './hoja.ts';
import { MUESTRAS_DE_LA_ELECCION } from './muestras-de-la-eleccion.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import { valorDeLaFila } from './reglas-de-las-tablas.ts';
import type {
  DefinicionDeMaestroDetalle,
  DefinicionDePantalla,
  PiezaDeLaPantalla,
  Texto,
} from './tipos.ts';

/**
 * **#95: la fila de una tabla que se elige por si misma, y el detalle que se dibuja sin eleccion.**
 *
 * Como en `composicion.test.tsx`, la hoja es de prueba: guarda la ruta en un estado y anota cada
 * cambio, que es lo que el marco hace con el hash. **Recargar** es montar con una ruta que ya trae
 * la eleccion: es exactamente lo que el marco le da a la pantalla despues de leer el hash.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const TABLA = MUESTRAS_DE_LA_ELECCION['fila-elegible-en-la-ruta'];
const MAESTRO = MUESTRAS_DE_LA_ELECCION['detalle-sin-eleccion-que-se-dibuja'];

function ConHoja({
  inicial,
  cambios,
  definicion,
  datos,
  extra = {},
}: {
  readonly inicial: RutaDeLaHoja;
  readonly cambios: CambioDeLaRuta[];
  readonly definicion: Definicion;
  readonly datos: DatosDeLaPantalla;
  readonly extra?: Partial<PantallaProps>;
}) {
  const [ruta, setRuta] = useState<RutaDeLaHoja>(inicial);
  const hoja: HojaDelMarco = {
    ruta,
    moverLaRuta: (cambio) => {
      cambios.push(cambio);
      setRuta((antes) => ({
        sujeto: cambio.sujeto === undefined ? antes.sujeto : cambio.sujeto,
        parametros: Object.fromEntries(
          Object.entries({ ...antes.parametros, ...cambio.parametros }).filter(
            (par): par is [string, string] => par[1] !== null,
          ),
        ),
      }));
    },
  };
  return (
    // El desplegable del orden se lee por su `<select>` nativo, que Radix solo pone en un formulario.
    <form>
      <Pantalla definicion={definicion} datos={datos} tonoDeLaInsignia={() => 'info'} hoja={hoja} {...extra} />
    </form>
  );
}

const montaConRuta = (parametros: Readonly<Record<string, string>>, extra: Partial<PantallaProps> = {}) => {
  const cambios: CambioDeLaRuta[] = [];
  const montada = render(
    <ConHoja inicial={{ sujeto: null, parametros }} cambios={cambios} definicion={TABLA.definicion} datos={TABLA.datos} extra={extra} />,
  );
  return { cambios, ...montada };
};

/** La fila del cuerpo cuya primera celda es `codigo`. */
const fila = (codigo: string): HTMLElement => {
  const encontrada = screen
    .getAllByRole('row')
    .find((f) => f.closest('tbody') !== null && f.querySelector('td')?.textContent === codigo);
  if (encontrada === undefined) throw new Error(`no hay fila «${codigo}»`);
  return encontrada;
};

/** La definicion de la muestra SIN `eleccion`: lo que era la tabla antes de #95. */
const sinLaEleccion = (): Definicion => {
  const [bloque, detalle] = TABLA.definicion.bloques;
  return { instruccion: '', bloques: [{ ...bloque, tabla: { ...bloque.tabla, eleccion: undefined } }, detalle] };
};

// ── La tabla ───────────────────────────────────────────────────────────────────────────────────

describe('`fila-elegible-en-la-ruta`: la fila se elige, y lo elegido vive en la ruta', () => {
  it('RECARGAR LA CONSERVA: montada con `?movimiento=M-2`, la M-2 sale elegida y realzada', () => {
    montaConRuta({ movimiento: 'M-2' });
    const rejilla = screen.getByRole('grid', { name: 'Movimientos' });
    expect(fila('M-2').getAttribute('aria-selected')).toBe('true');
    expect(fila('M-1').getAttribute('aria-selected')).toBe('false');
    expect(within(rejilla).getAllByRole('row', { selected: true })).toEqual([fila('M-2')]);
    // Realzada y no solo por color: el filo de la primera celda, como el maestro de #67.
    expect(fila('M-2').className).toContain('bg-azul-suave');
    expect(fila('M-2').className).toContain('[&>td:first-child]:shadow-');
    expect(fila('M-1').className).not.toContain('bg-azul-suave');
    // Y el tabulador entra por la elegida, y solo por ella.
    expect(fila('M-2').tabIndex).toBe(0);
    expect(fila('M-1').tabIndex).toBe(-1);
  });

  it('ELEGIR ESCRIBE LA RUTA en UN movimiento, y elegir la ya elegida no la mueve', () => {
    const { cambios } = montaConRuta({});
    expect(screen.queryAllByRole('row', { selected: true })).toEqual([]);
    // Se pulsa una CELDA, no la fila: el clic sube hasta ella.
    fireEvent.click(within(fila('M-1')).getByText('01/09/2026'));
    expect(cambios, 'la eleccion no llego a la ruta').toEqual([{ parametros: { movimiento: 'M-1' } }]);
    expect(fila('M-1').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(fila('M-1'));
    expect(cambios).toHaveLength(1);
  });

  it('lo elegido lo leen las demas piezas como `ruta.<enLaRuta>`: no hay un segundo canal', () => {
    montaConRuta({});
    fireEvent.click(fila('M-1'));
    expect(screen.getByText('Elegido: M-1')).toBeTruthy();
  });

  it('en el SUJETO, si la definicion lo dice', () => {
    const [bloque, detalle] = TABLA.definicion.bloques;
    const enElSujeto: Definicion = {
      instruccion: '',
      bloques: [{ ...bloque, tabla: { ...bloque.tabla, eleccion: { enLaRuta: 'sujeto', desde: 'codigo' } } }, detalle],
    };
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja inicial={{ sujeto: 'M-2', parametros: {} }} cambios={cambios} definicion={enElSujeto} datos={TABLA.datos} />);
    expect(fila('M-2').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(fila('M-1'));
    expect(cambios).toEqual([{ sujeto: 'M-1' }]);
  });

  it('EL TECLADO: el tabulador llega a la fila, las flechas mueven el foco sin elegir, e Intro y Espacio eligen', async () => {
    const { cambios } = montaConRuta({});
    const teclado = userEvent.setup({ delay: null });
    // Del ultimo mando de la barra —el sentido del orden— a la primera fila elegible.
    act(() => {
      screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.pasarADescendente }).focus();
    });
    await teclado.tab();
    expect(document.activeElement, 'el tabulador no llego a la fila').toBe(fila('M-1'));
    await teclado.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(fila('M-2'));
    // La fila sin el dato NO es una parada: de la M-2 no se baja a «Apertura».
    await teclado.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(fila('M-2'));
    // Mover el foco no elige: cada eleccion es una direccion, y el sistema pide por cada una.
    expect(cambios).toEqual([]);
    await teclado.keyboard('{Enter}');
    expect(cambios).toEqual([{ parametros: { movimiento: 'M-2' } }]);
    await teclado.keyboard('{Home}');
    expect(document.activeElement).toBe(fila('M-1'));
    await teclado.keyboard(' ');
    expect(cambios).toEqual([{ parametros: { movimiento: 'M-2' } }, { parametros: { movimiento: 'M-1' } }]);
    await teclado.keyboard('{End}');
    expect(document.activeElement).toBe(fila('M-2'));
    await teclado.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(fila('M-1'));
  });

  it('PULSAR UN BOTON DE LA FILA NO LA ELIGE: ni con el raton ni con Intro, atendido o impedido', async () => {
    const anular = vi.fn();
    const { cambios, unmount } = montaConRuta({}, { alHacer: { anular } });
    const teclado = userEvent.setup({ delay: null });
    const boton = within(fila('M-1')).getByRole('button', { name: 'Anular' });
    await teclado.click(boton);
    expect(anular).toHaveBeenCalledTimes(1);
    expect(cambios, 'la accion de la fila eligio la fila').toEqual([]);
    act(() => {
      boton.focus();
    });
    await teclado.keyboard('{Enter}');
    await teclado.keyboard(' ');
    expect(cambios, 'Intro o Espacio en la accion eligieron la fila').toEqual([]);
    expect(fila('M-1').getAttribute('aria-selected')).toBe('false');
    unmount();

    // Sin quien la atienda sale impedida con su motivo: tampoco elige.
    const impedida = montaConRuta({});
    const sinAtender = within(fila('M-1')).getByRole('button', { name: 'Anular' });
    expect(sinAtender.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(sinAtender);
    expect(impedida.cambios).toEqual([]);
  });

  it('una fila SIN el dato no es elegible, y se ve: ni foco, ni `aria-selected`, ni clic', () => {
    const { cambios } = montaConRuta({});
    const apertura = fila('Apertura');
    expect(apertura.hasAttribute('aria-selected')).toBe(false);
    expect(apertura.hasAttribute('tabindex')).toBe(false);
    expect(apertura.hasAttribute('data-no-elegible')).toBe(true);
    expect(apertura.className).not.toContain('cursor-pointer');
    fireEvent.click(apertura);
    expect(cambios).toEqual([]);
  });

  it('cambiar de PAGINA o de ORDEN no borra la eleccion: es otro sitio de la ruta', () => {
    const { cambios, container } = montaConRuta({ movimiento: 'M-1' });
    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaSiguiente }));
    expect(cambios).toEqual([{ parametros: { pagina: '1' } }]);
    // En la segunda pagina la elegida no esta, y el tabulador entra por la primera elegible.
    expect(fila('M-4').getAttribute('aria-selected')).toBe('false');
    expect(fila('M-4').tabIndex).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaAnterior }));
    expect(fila('M-1').getAttribute('aria-selected')).toBe('true');
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'fecha' } });
    expect(cambios.at(-1), 'cambiar de orden toco la eleccion').toEqual({ parametros: { pagina: '0', ordenarPor: 'fecha' } });
    expect(fila('M-1').getAttribute('aria-selected')).toBe('true');
  });

  it('SIN hoja, la eleccion vive en la tabla y se elige igual', () => {
    render(<Pantalla definicion={TABLA.definicion} datos={TABLA.datos} tonoDeLaInsignia={() => 'info'} />);
    fireEvent.click(fila('M-2'));
    expect(fila('M-2').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaSiguiente }));
    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaAnterior }));
    expect(fila('M-2').getAttribute('aria-selected'), 'cambiar de pagina borro la eleccion').toBe('true');
  });

  it('SIN el dato, la tabla es la de antes BYTE A BYTE: ni `grid`, ni foco, ni un atributo de mas', () => {
    const cambios: CambioDeLaRuta[] = [];
    const { container } = render(
      <ConHoja inicial={{ sujeto: null, parametros: { movimiento: 'M-1' } }} cambios={cambios} definicion={sinLaEleccion()} datos={TABLA.datos} />,
    );
    expect(screen.queryByRole('grid')).toBeNull();
    fireEvent.click(fila('M-1'));
    expect(cambios).toEqual([]);
    // Los `id` de `useId` cuentan montajes, y cambian con el orden de las pruebas: se igualan.
    const tabla = (container.querySelector('table')?.outerHTML ?? '').replace(/_r_[0-9a-z]+_/g, '«id»');
    expect(tabla).toBe(TABLA_DE_ANTES);
  });
});

describe('`valorDeLaFila`: lo que una fila escribe, sin montar nada', () => {
  const eleccion = { enLaRuta: 'movimiento', desde: 'codigo' };
  it('el dato de la fila, en texto; y `null` si falta', () => {
    expect(valorDeLaFila(eleccion, { celdas: ['x'], datos: new Map([['codigo', 'M-1']]) })).toBe('M-1');
    expect(valorDeLaFila(eleccion, { celdas: ['x'] })).toBeNull();
    expect(valorDeLaFila(eleccion, { celdas: ['x'], datos: new Map([['codigo', null]]) })).toBeNull();
    expect(valorDeLaFila(eleccion, { celdas: ['x'], datos: new Map([['codigo', '']]) })).toBeNull();
    // Un `false` es un dato, como en `seCumple`.
    expect(valorDeLaFila(eleccion, { celdas: ['x'], datos: new Map([['codigo', false]]) })).toBe('false');
  });
  it('lee los DATOS de la fila, no su celda: la celda se lee, y puede ir traducida', () => {
    expect(valorDeLaFila(eleccion, { celdas: ['M-1'] })).toBeNull();
  });
});

// ── El maestro ─────────────────────────────────────────────────────────────────────────────────

describe('`detalle-sin-eleccion-que-se-dibuja`: el detalle se dibuja sin eleccion, y dice por que no tiene dato', () => {
  const [pieza] = MAESTRO.definicion.bloques;

  it('CON el dato y sin eleccion: la cabecera y las piezas se dibujan, cada lectura en su espera, y la frase encima', () => {
    const { container } = render(
      <ConHoja inicial={{ sujeto: null, parametros: {} }} cambios={[]} definicion={MAESTRO.definicion} datos={MAESTRO.datos} />,
    );
    const detalle = container.querySelector('[data-slot="detalle"]') as HTMLElement;
    expect(detalle.querySelector('[data-sin-eleccion]')?.textContent).toBe(
      'Nada elegido todavia: el detalle se llena al elegir uno de la lista.',
    );
    expect(detalle.querySelector('[data-slot="sin-eleccion"]'), 'el detalle se sustituyo entero').toBeNull();
    expect(within(detalle).getByRole('heading', { name: 'Detalle del registro' })).toBeTruthy();
    expect(within(detalle).getByText('Elija un registro y aqui saldra lo que se sabe de el.')).toBeTruthy();
    expect(detalle.querySelector('[data-estado-de-la-lectura="en-espera"]')).not.toBeNull();
  });

  it('CON el dato y con eleccion: la frase se va, y el detalle es el de siempre', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const { container } = render(
      <ConHoja inicial={{ sujeto: null, parametros: {} }} cambios={cambios} definicion={MAESTRO.definicion} datos={MAESTRO.datos} />,
    );
    await userEvent.setup({ delay: null }).click(screen.getByRole('option', { name: /Primero/ }));
    expect(cambios).toEqual([{ sujeto: '41' }]);
    expect(container.querySelector('[data-sin-eleccion]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Detalle del registro' })).toBeTruthy();
  });

  it('SIN el dato, el todo o nada de #67: la frase ocupa el detalle y las piezas no se dibujan', () => {
    const todoONada: Definicion = {
      instruccion: '',
      bloques: [{ ...pieza, detalle: { ...pieza.detalle, sinEleccionSeDibuja: undefined } }],
    };
    const { container } = render(
      <ConHoja inicial={{ sujeto: null, parametros: {} }} cambios={[]} definicion={todoONada} datos={MAESTRO.datos} />,
    );
    expect(container.querySelector('[data-slot="sin-eleccion"]')?.textContent).toBe(
      'Nada elegido todavia: el detalle se llena al elegir uno de la lista.',
    );
    expect(container.querySelector('[data-sin-eleccion]')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Detalle del registro' })).toBeNull();
    expect(screen.queryByText('Elija un registro y aqui saldra lo que se sabe de el.')).toBeNull();
  });

  it('BARRERA DE TIPO: `sinEleccion` sigue siendo un `Texto`, y lo que ya lo lee compila', () => {
    // Es lo que escribe un sistema que recorre sus definiciones: si `sinEleccion` fuera una union
    // con la forma nueva, esta linea no compilaria (`yarn typecheck`).
    const leer = (maestro: DefinicionDeMaestroDetalle): string =>
      resolverTexto(maestro.detalle.sinEleccion, undefined, (t) => t, '—');
    const suelto: Texto = pieza.detalle.sinEleccion;
    expect(leer(pieza)).toBe(suelto);
  });
});

// ── El centinela ───────────────────────────────────────────────────────────────────────────────

describe('las muestras de #95 son dos, y se dibujan', () => {
  it('EL CENTINELA: estan las dos, ni una mas', () => {
    expect(Object.keys(MUESTRAS_DE_LA_ELECCION).sort()).toEqual(
      ['detalle-sin-eleccion-que-se-dibuja', 'fila-elegible-en-la-ruta'].sort(),
    );
  });

  it('NINGUNA clave es una pieza local de `catastro`: la subida es ADITIVA', () => {
    for (const suya of ['paginacion', 'orden', 'buscador', 'chips-de-filtro', 'descarga-de-documento']) {
      expect(Object.keys(MUESTRAS_DE_LA_ELECCION), `«${suya}» rompe la guarda de catastro`).not.toContain(suya);
    }
  });

  it.each(Object.entries(MUESTRAS_DE_LA_ELECCION))('«%s» se dibuja sin avisos de costura rota', (_hueco, muestra) => {
    const { container } = render(
      <Pantalla definicion={muestra.definicion} datos={muestra.datos} tonoDeLaInsignia={() => 'info'} />,
    );
    expect(container.querySelector('[data-pieza-sin-registrar]')).toBeNull();
    expect(container.querySelector('[data-lectura-sin-estado]')).toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
  });
});

/**
 * **La `<table>` de la muestra sin `eleccion`, medida con el codigo de ANTES de #95** (`a8b1902`,
 * `TablaDelBloque.tsx` de `origin/main`) y pegada aqui: sin el dato, ni un byte cambia.
 */
const TABLA_DE_ANTES =
  '<table data-slot="tabla" class="w-full border-collapse" style="min-width: 520px;">' +
  '<thead data-slot="tabla-cabecera">' +
  '<tr data-slot="tabla-fila" class="bg-superficie"><th data-slot="tabla-rotulo" scope="col" class="px-[14px] py-[9px] text-left text-[11.5px] font-bold uppercase tracking-[0.05em] text-tinta-3 bg-sup border-b border-linea whitespace-nowrap" aria-sort="ascending">Codigo<span data-slot="campo-de-la-columna" class="block font-normal normal-case tracking-normal text-tinta-3"><code>codigo</code></span></th><th data-slot="tabla-rotulo" scope="col" class="px-[14px] py-[9px] text-left text-[11.5px] font-bold uppercase tracking-[0.05em] text-tinta-3 bg-sup border-b border-linea whitespace-nowrap">Fecha<span data-slot="campo-de-la-columna" class="block font-normal normal-case tracking-normal text-tinta-3"><code>fecha</code></span></th><th data-slot="tabla-rotulo" scope="col" class="px-[14px] py-[9px] text-left text-[11.5px] font-bold uppercase tracking-[0.05em] text-tinta-3 bg-sup border-b border-linea whitespace-nowrap">Estado</th><th data-slot="tabla-rotulo" scope="col" class="px-[14px] py-[9px] text-left text-[11.5px] font-bold uppercase tracking-[0.05em] text-tinta-3 bg-sup border-b border-linea whitespace-nowrap">Acciones</th></tr></thead>' +
  '<tbody data-slot="tabla-cuerpo">' +
  '<tr data-slot="tabla-fila" class="bg-superficie"><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] border-b border-linea-2 font-semibold text-tinta whitespace-nowrap">M-1</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">01/09/2026</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">VIGENTE</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2"><div role="group" aria-label="Movimiento M-1" data-acciones-de-la-fila=""><div data-slot="grupo-de-acciones" class="flex flex-col gap-[6px]"><div class="flex flex-wrap items-center gap-2"><button data-slot="boton-con-motivo" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-azul focus-visible:ring-[3px] focus-visible:ring-foco disabled:pointer-events-none disabled:opacity-50 bg-superficie text-tinta border border-borde-boton hover:border-borde-hover px-3 py-1.5 text-[12.5px] aria-disabled:cursor-not-allowed aria-disabled:opacity-55" aria-disabled="true" aria-describedby="«id»-motivo-0" type="button" data-accion="hace:anular">Anular</button></div><p id="«id»-motivo-0" data-slot="motivo" class="m-0 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">Nadie atiende «anular» en esta pantalla: pulsarlo no haria nada.</p></div></div></td></tr>' +
  '<tr data-slot="tabla-fila" class="bg-sup"><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] border-b border-linea-2 font-semibold text-tinta whitespace-nowrap">M-2</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">02/09/2026</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">ANULADO</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2"><span data-sin-acciones="" class="text-[12.5px] text-tinta-3">Sin acciones</span></td></tr>' +
  '<tr data-slot="tabla-fila" class="bg-superficie"><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] border-b border-linea-2 font-semibold text-tinta whitespace-nowrap">Apertura</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">31/08/2026</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2">CERRADO</td><td data-slot="tabla-celda" class="px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2"><span data-sin-acciones="" class="text-[12.5px] text-tinta-3">Sin acciones</span></td></tr>' +
  '</tbody></table>';
