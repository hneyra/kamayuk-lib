import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import { coordenada, type DatosDeLaPantalla, type FilaDeLaTabla } from './datos.ts';
import { MUESTRAS_DE_CAMPOS_Y_TABLAS } from './muestras-de-campos-y-tablas.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import { accionesQueOfrece, resolverInsignia, tablasSinVacio } from './reglas-de-las-tablas.ts';
import type { DefinicionDePantalla, DefinicionDeTabla, PiezaDeLaPantalla, Texto } from './tipos.ts';

/**
 * **Los campos y las tablas de #65**: los diez huecos que `catastro` dibuja en dos hojas o mas.
 *
 * Cada `describe` es un hueco de la tabla de #65, con su nombre de `HUECOS.md`, o un criterio de
 * aceptacion. Las definiciones son neutras por lo mismo que en `piezas.test.tsx`: una prueba de la
 * libreria escrita con las palabras de un sistema es la API de ese sistema con otro nombre.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const SIN_FRASE = { enElCampo: 'sin dato', explicacion: '', tono: 'info' } as const;

/** Un reparto de tonos que MIENTE a proposito: si alguien lo usa donde hay regla, se nota. */
const TONO_QUE_NO_SE_USA = () => 'info' as const;

const monta = (definicion: Definicion, datos: Partial<DatosDeLaPantalla> = {}, extra: Partial<PantallaProps> = {}) =>
  render(
    <Pantalla
      definicion={definicion}
      datos={{ ausencia: SIN_FRASE, ...datos }}
      tonoDeLaInsignia={TONO_QUE_NO_SE_USA}
      {...extra}
    />,
  );

/** Una pantalla con una sola tabla, y sus filas por nombre. */
const conTabla = (tabla: DefinicionDeTabla<Texto>): Definicion => ({
  instruccion: '',
  bloques: [{ titulo: 'Bloque', nota: '', campos: [], tabla }],
});

const tablas = (clave: string, filas: readonly FilaDeLaTabla[], conteo?: string) =>
  new Map([[clave, conteo === undefined ? { filas } : { filas, conteo }]]);

const datosDe = (...pares: (readonly [string, string | boolean | null])[]) => new Map(pares);

describe('`tabla-con-vacio` (AC-3): una tabla vacia dice por que, y no inventa un cero', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['tabla-con-vacio'];

  it('con `[]` dice SU frase, con el dato dentro, FUERA de la tabla y sin conteo', () => {
    const { container } = monta(definicion, datos, { traducir: (t) => `«${t}»` });
    const vacio = container.querySelector('[data-vacio]');
    // Se traduce la plantilla y DESPUES se pone el dato, como en todo `Texto` de #44.
    expect(vacio?.textContent).toBe('«El registro 42 no tiene ninguna evidencia.»');
    expect(vacio?.closest('table'), 'la frase del vacio se conto como una fila').toBeNull();
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(0);
    // Ni «0 registros» ni ningun numero: la frase ya lo dice.
    expect(screen.queryByText(/^\d+ registros?$/), 'se escribio un conteo sobre una lista vacia').toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
  });

  it('con `[]` y SIN motivo, lo dice un aviso visible, y nunca queda una tabla muda', () => {
    const tabla: DefinicionDeTabla<Texto> = { titulo: 'Muda', clave: 'muda', columnas: [{ rotulo: 'A', alineadoDerecha: false }] };
    const { container } = monta(conTabla(tabla), { tablas: tablas('muda', []) });
    const aviso = container.querySelector('[data-tabla-sin-motivo="muda"]');
    expect(aviso, 'una tabla sin filas y sin motivo se dibujo MUDA').not.toBeNull();
    expect(aviso?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.tablaSinMotivo);
    expect(screen.queryByText(TEXTOS_DEL_INTERPRETE.registros(0)), 'se invento un conteo de cero').toBeNull();
  });

  it('`vacio: ""` no es un motivo: sale el aviso', () => {
    const { container } = monta(
      conTabla({ titulo: 'T', clave: 't', columnas: [{ rotulo: 'A', alineadoDerecha: false }], vacio: '' }),
      { tablas: tablas('t', []) },
    );
    expect(container.querySelector('[data-tabla-sin-motivo]')).not.toBeNull();
  });

  it('SIN dato no es vacia: dice la ausencia de #27, y no el vacio', () => {
    const { container } = monta(definicion, { nombrados: datos.nombrados });
    expect(container.querySelector('p[data-sin-dato]')?.textContent).toBe('sin dato');
    expect(container.querySelector('[data-vacio]')).toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
  });

  it('con filas, las filas y su conteo; el conteo que da el sistema se escribe tal cual, aun con `[]`', () => {
    const tabla = definicion.bloques[0].tabla;
    const { unmount } = monta(conTabla(tabla), { tablas: tablas('evidencias', [{ celdas: ['Foto', '01/09'] }]) });
    expect(screen.getByText(TEXTOS_DEL_INTERPRETE.registros(1))).toBeTruthy();
    expect(document.querySelector('[data-vacio]')).toBeNull();
    unmount();
    monta(conTabla(tabla), { tablas: tablas('evidencias', [], '0 de 0') });
    expect(screen.getByText('0 de 0')).toBeTruthy();
  });

  it('las filas de #27, por indice de bloque, tampoco quedan mudas con `[]`', () => {
    const { container } = monta(conTabla({ titulo: 'Legado', columnas: [{ rotulo: 'A', alineadoDerecha: false }] }), {
      filas: new Map([[0, []]]),
    });
    expect(container.querySelector('[data-tabla-sin-motivo="Legado"]')).not.toBeNull();
  });

  it('`tablasSinVacio` las lista sin montar nada: por clave o titulo, en orden y sin repetir', () => {
    const def: Definicion = {
      instruccion: '',
      bloques: [
        { titulo: 'x', nota: '', campos: [], tabla: { titulo: 'Sin clave', columnas: [] } },
        { tipo: 'aviso', tono: 'info', titulo: 'no es un bloque' },
        {
          titulo: 'y',
          nota: '',
          campos: [],
          tablas: [
            { clave: 'con', titulo: 'Con', columnas: [], vacio: 'Ninguna.' },
            { clave: 'sin', titulo: 'Sin', columnas: [] },
            { clave: 'sin', titulo: 'Otra vez', columnas: [] },
          ],
        },
      ],
    };
    expect(tablasSinVacio(def)).toEqual(['Sin clave', 'sin']);
    expect(tablasSinVacio(MUESTRAS_DE_CAMPOS_Y_TABLAS['tabla-con-vacio'].definicion)).toEqual([]);
  });
});

describe('`marcador`', () => {
  it('el texto gris del campo vacio, traducido; en una fecha sustituye al del saco', () => {
    const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS.marcador;
    monta(definicion, datos, { traducir: (t) => `«${t}»` });
    expect(screen.getByLabelText('«Identificador»').getAttribute('placeholder')).toBe('«El numero que devolvio el alta»');
    expect(screen.getByRole('button', { name: /«Cualquier dia»/ })).toBeTruthy();
    expect(screen.queryByText(TEXTOS_DEL_INTERPRETE.marcadorDeFecha)).toBeNull();
  });

  it('tambien en un area, y sin marcador no hay atributo', () => {
    monta({
      instruccion: '',
      bloques: [
        {
          titulo: 'B',
          nota: '',
          campos: [
            { etiqueta: 'Area', tipo: 'a', marcador: 'Por que' },
            { etiqueta: 'Libre', tipo: '' },
          ],
        },
      ],
    });
    expect(screen.getByLabelText('Area').getAttribute('placeholder')).toBe('Por que');
    expect(screen.getByLabelText('Libre').hasAttribute('placeholder')).toBe(false);
  });
});

describe('`insignia-con-tono-por-regla` (AC-2): el tono es regla o dato, NUNCA deducido del texto', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['insignia-con-tono-por-regla'];

  it('con regla, `tonoDeLaInsignia` NO se llama, y el tono es el que la regla declara', () => {
    const llamadas: string[] = [];
    const { container } = monta(definicion, datos, {
      tonoDeLaInsignia: (texto) => {
        llamadas.push(texto);
        return 'info';
      },
    });
    expect(llamadas, 'el tono se DEDUJO del texto de la celda').toEqual([]);
    const [primera, segunda] = [...container.querySelectorAll('tbody tr')];
    // `FIRME` casa; `ANULADO` no, y va a `otro`.
    expect(within(primera as HTMLElement).getByText('FIRME').className).toContain('bg-ok-fondo');
    expect(within(segunda as HTMLElement).getByText('ANULADO').className).toContain('bg-mal-fondo');
  });

  it('`segun` lee OTRO dato de la fila, y la frase del caso pasa por `traducir`', () => {
    monta(definicion, datos, { traducir: (t) => `«${t}»` });
    expect(screen.getByText('«Vigente»').className).toContain('bg-ok-fondo');
    expect(screen.getByText('«Retirada»').className).toContain('bg-mal-fondo');
  });

  it('`tonoDesde` toma el tono que ya trae la fila: el mismo «0» puede ser `atencion` aqui y `mal` en otra', () => {
    monta(definicion, datos);
    expect(screen.getByText('0').className).toContain('bg-atencion-fondo');
    expect(screen.getByText('3').className).toContain('bg-mal-fondo');
  });

  it('sin regla, la `columnaDeInsignia` de #27 sigue preguntando al sistema: `rentas` no cambia', () => {
    const llamadas: string[] = [];
    monta(
      conTabla({ titulo: 'T', columnas: [{ rotulo: 'Situacion', alineadoDerecha: false }], columnaDeInsignia: 0 }),
      { filas: new Map([[0, [['Cerrado']]]]) },
      {
        tonoDeLaInsignia: (texto) => {
          llamadas.push(texto);
          return 'mal';
        },
      },
    );
    expect(llamadas).toContain('Cerrado');
    expect(screen.getByText('Cerrado').className).toContain('bg-mal-fondo');
  });

  it('`resolverInsignia`: un booleano casa con su clave escrita, y el valor NO se traduce', () => {
    const traducir = (t: string) => `«${t}»`;
    const regla = { casos: { true: { tono: 'ok' as const } }, otro: { tono: 'mal' as const } };
    expect(resolverInsignia(regla, 'true', undefined, traducir)).toEqual({ tono: 'ok', texto: 'true' });
    expect(resolverInsignia(regla, 'otra', undefined, traducir)).toEqual({ tono: 'mal', texto: 'otra' });
    const conFrase = { segun: 'activa', casos: { false: { tono: 'mal' as const, texto: 'No' } }, otro: { tono: 'ok' as const } };
    expect(resolverInsignia(conFrase, '', datosDe(['activa', false]), traducir)).toEqual({ tono: 'mal', texto: '«No»' });
  });

  it('`resolverInsignia`: sin el dato que decide NO pinta nada, y un tono traido que no es de los cuatro va a `siNoTrae`', () => {
    const traducir = (t: string) => t;
    const regla = { casos: {}, otro: { tono: 'mal' as const } };
    expect(resolverInsignia(regla, undefined, undefined, traducir)).toBeUndefined();
    expect(resolverInsignia(regla, '', undefined, traducir)).toBeUndefined();
    expect(resolverInsignia({ ...regla, segun: 'x' }, 'algo', datosDe(['x', null]), traducir)).toBeUndefined();
    const desde = { tonoDesde: 'tono', siNoTrae: 'info' as const };
    expect(resolverInsignia(desde, '7', datosDe(['tono', 'verde']), traducir)).toEqual({ tono: 'info', texto: '7' });
    expect(resolverInsignia(desde, '7', datosDe(['tono', 'toString']), traducir)?.tono).toBe('info');
    expect(resolverInsignia({ casos: {}, otro: { tono: 'ok' } }, 'toString', undefined, traducir)?.tono).toBe('ok');
  });
});

describe('`dato-con-insignia`', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['dato-con-insignia'];

  it('el valor del campo decide, y se pinta la frase del caso DENTRO del dato', () => {
    const { container } = monta(definicion, datos, { traducir: (t) => `«${t}»` });
    const [ejercicio, cerrado] = [...container.querySelectorAll('[data-slot="dato"]')];
    expect(ejercicio?.textContent).toBe('2026');
    const insignia = within(cerrado as HTMLElement).getByText('«Todavia no»');
    expect(insignia.className).toContain('bg-atencion-fondo');
  });

  it('sin valor dice su ausencia y NO pinta un estado que nadie ha leido', () => {
    const { container } = monta(definicion, { valores: new Map([[coordenada(0, 0), '2026']]) });
    const cerrado = container.querySelectorAll('[data-slot="dato"]')[1];
    expect(cerrado?.textContent).toBe('sin dato');
    expect(cerrado?.hasAttribute('data-sin-dato')).toBe(true);
    expect(cerrado?.querySelector('span')).toBeNull();
  });

  it('con `segun`, decide un dato de la pantalla', () => {
    monta(
      {
        instruccion: '',
        bloques: [
          {
            titulo: 'B',
            nota: '',
            campos: [
              {
                etiqueta: 'Estado',
                tipo: 'r',
                insignia: { segun: 'cerrado', casos: { true: { tono: 'ok', texto: 'Cerrado' } }, otro: { tono: 'atencion', texto: 'Abierto' } },
              },
            ],
          },
        ],
      },
      { valores: new Map([[coordenada(0, 0), 'ignorado']]), nombrados: datosDe(['cerrado', true]) },
    );
    expect(screen.getByText('Cerrado').className).toContain('bg-ok-fondo');
  });
});

describe('`opciones-con-valor-y-rotulo` (AC-4): viaja el valor, se lee el rotulo', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['opciones-con-valor-y-rotulo'];

  it('EL VALOR NO PASA POR `traducir`: solo los rotulos', () => {
    const traducidos: string[] = [];
    monta(definicion, datos, {
      traducir: (t) => {
        traducidos.push(t);
        return `«${t}»`;
      },
    });
    expect(traducidos).toContain('Todos');
    expect(traducidos).toContain('Tipo uno');
    for (const valor of ['UNO', 'DOS']) {
      expect(traducidos, `el valor «${valor}» paso por traducir: cambiar de idioma cambiaria lo que se envia`).not.toContain(valor);
    }
    // Y lo que se lee es el rotulo traducido de la primera, que es la elegida.
    expect(screen.getByRole('combobox', { name: '«Tipo»' }).textContent).toBe('«Todos»');
  });

  it('lo que se entrega al cambiar es el VALOR tal cual, y el vacio sale como `""`', () => {
    const recibidos: (string | boolean)[] = [];
    // Con estado, como lo tiene `Pantalla`: el desplegable es controlado, y volver a elegir la que
    // ya esta elegida no avisa.
    function ConEstado() {
      const [valor, setValor] = useState<string | boolean>();
      return (
        <CampoDelBloque
          campo={definicion.bloques[0].campos[0]}
          valor={valor}
          ausencia={SIN_FRASE}
          alCambiar={(v) => {
            recibidos.push(v);
            setValor(v);
          }}
          traducir={(t) => `«${t}»`}
          textos={TEXTOS_DEL_INTERPRETE}
        />
      );
    }
    const { container } = render(
      // En un formulario, Radix acompana el disparador con un `<select>` nativo: es el que se lee
      // aqui, sin abrir la capa (ver `shadcn/capa-del-desplegable.test.tsx` por que abrirla cuesta).
      <form>
        <ConEstado />
      </form>,
    );
    const nativo = container.querySelector('select');
    const opciones = [...(nativo?.options ?? [])];
    expect(opciones.map((o) => o.textContent)).toEqual(['«Todos»', '«Tipo uno»', '«Tipo dos»']);
    expect(opciones.slice(1).map((o) => o.value)).toEqual(['UNO', 'DOS']);
    fireEvent.change(nativo as HTMLSelectElement, { target: { value: 'DOS' } });
    fireEvent.change(nativo as HTMLSelectElement, { target: { value: opciones[0]?.value } });
    expect(recibidos).toEqual(['DOS', '']);
  });

  it('las opciones de cadena de #27 siguen siendo valor y rotulo a la vez', () => {
    const recibidos: (string | boolean)[] = [];
    const { container } = render(
      <form>
        <CampoDelBloque
          campo={{ etiqueta: 'Turno', tipo: 's', opciones: ['Manana', 'Tarde'] }}
          ausencia={SIN_FRASE}
          alCambiar={(v) => recibidos.push(v)}
          traducir={(t) => `«${t}»`}
          textos={TEXTOS_DEL_INTERPRETE}
        />
      </form>,
    );
    const nativo = container.querySelector('select') as HTMLSelectElement;
    expect([...nativo.options].map((o) => o.value)).toEqual(['Manana', 'Tarde']);
    fireEvent.change(nativo, { target: { value: 'Tarde' } });
    expect(recibidos).toEqual(['Tarde']);
  });
});

describe('`acciones-por-fila` (AC-6: con teclado): las acciones de #66, segun la fila', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['acciones-por-fila'];
  const ATENDIDAS: Partial<PantallaProps> = {
    actos: { aprobar: () => {} },
    navegacion: { ofrece: () => true, ir: () => {} },
  };

  it('cada fila dibuja EXACTAMENTE lo que su estado ofrece, en un grupo con nombre', () => {
    const { container } = monta(definicion, datos, ATENDIDAS);
    const [pendiente, cerrada] = [...container.querySelectorAll('tbody tr')];
    const grupo = within(pendiente as HTMLElement).getByRole('group', { name: 'Registro D-1 · PENDIENTE' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Aprobar', 'Descartar']);
    expect(within(cerrada as HTMLElement).queryAllByRole('button')).toHaveLength(0);
    expect(within(cerrada as HTMLElement).getByText('Sin acciones')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeTruthy();
  });

  it('se operan con el TECLADO: Enter abre el acto CON LA FILA y Espacio va a otra hoja con ella; «Sin acciones» no es parada', async () => {
    const teclado = userEvent.setup({ delay: null });
    const abiertos: unknown[] = [];
    const idas: unknown[] = [];
    monta(
      definicion,
      // Un `codigo` de la pantalla que la fila TAPA: en una fila, el dato es el de la fila.
      { ...datos, nombrados: datosDe(['codigo', 'de la pantalla']) },
      {
        ...ATENDIDAS,
        actoAbierto: null,
        alAbrirActo: (clave, parametros) => abiertos.push([clave, parametros]),
        navegacion: { ofrece: () => true, ir: (peticion) => idas.push(peticion) },
      },
    );

    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Aprobar');
    await teclado.keyboard('{Enter}');
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Descartar');
    await teclado.keyboard(' ');
    await teclado.tab();
    // La fila cerrada no ofrece nada: el tabulador sale de la tabla.
    expect(document.activeElement).toBe(document.body);

    expect(abiertos).toEqual([['aprobar', { registro: 'D-1' }]]);
    expect(idas).toEqual([{ hoja: 'otra/lista', sujeto: 'D-1' }]);
  });

  it('sin quien las atienda, son las de #66: `aria-disabled`, su motivo visible, en el tabulador y sin hacer nada', async () => {
    const teclado = userEvent.setup({ delay: null });
    const abiertos: unknown[] = [];
    monta(definicion, datos, { actoAbierto: null, alAbrirActo: (clave) => abiertos.push(clave) });
    const aprobar = screen.getByRole('button', { name: 'Aprobar' });
    expect(aprobar.getAttribute('aria-disabled')).toBe('true');
    expect(aprobar.hasAttribute('disabled'), 'un `disabled` mudo').toBe(false);
    expect(aprobar).toHaveAccessibleDescription(TEXTOS_DE_LAS_PIEZAS.sinQuienLoAtienda('aprobar'));
    expect(screen.getByRole('button', { name: 'Descartar' })).toHaveAccessibleDescription(TEXTOS_DE_LAS_PIEZAS.sinNavegacion);
    await teclado.tab();
    expect(document.activeElement).toBe(aprobar);
    await teclado.keyboard('{Enter}');
    expect(abiertos).toEqual([]);
  });

  it('una accion se impide con un dato DE SU FILA, y dice su motivo', () => {
    const tabla: DefinicionDeTabla<Texto> = {
      titulo: 'T',
      clave: 't',
      columnas: [{ rotulo: 'A', alineadoDerecha: false }],
      vacio: 'Nada.',
      accionesPorFila: {
        columna: 'Acciones',
        acciones: [
          {
            clave: 'recargar',
            rotulo: 'Recargar',
            hace: 'recargar',
            impedida: [{ si: { dato: 'bloqueada', vale: true }, motivo: { plantilla: 'La fila {codigo} esta bloqueada.' } }],
          },
        ],
        sinAcciones: 'Nada',
      },
    };
    monta(
      conTabla(tabla),
      {
        tablas: tablas('t', [
          { celdas: ['F-1'], datos: datosDe(['codigo', 'F-1'], ['bloqueada', true]) },
          { celdas: ['F-2'], datos: datosDe(['codigo', 'F-2'], ['bloqueada', false]) },
        ]),
      },
      { alHacer: { recargar: () => {} } },
    );
    const [primera, segunda] = screen.getAllByRole('button', { name: 'Recargar' });
    expect(primera?.getAttribute('aria-disabled')).toBe('true');
    expect(primera).toHaveAccessibleDescription('La fila F-1 esta bloqueada.');
    expect(segunda?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('la fila realzada se marca con `aria-current`, y sin `nombreDelGrupo` el nombre sale del saco', () => {
    const { container } = monta(
      conTabla({
        titulo: 'T',
        clave: 't',
        columnas: [{ rotulo: 'A', alineadoDerecha: false }],
        vacio: 'Nada.',
        accionesPorFila: {
          columna: 'Acciones',
          acciones: [{ clave: 'recargar', rotulo: 'Recargar', hace: 'recargar' }],
          sinAcciones: 'Nada',
        },
      }),
      { tablas: tablas('t', [{ celdas: ['F-1'], realzada: true }, { celdas: ['F-2'] }]) },
      { alHacer: { recargar: () => {} } },
    );
    const filas = [...container.querySelectorAll('tbody tr')];
    expect(filas[0]?.getAttribute('aria-current')).toBe('true');
    expect(filas[1]?.hasAttribute('aria-current')).toBe(false);
    // Sin `segun`, todas las filas ofrecen todas.
    expect(screen.getByRole('group', { name: TEXTOS_DE_LAS_PIEZAS.accionesDeLaFila('F-2') })).toBeTruthy();
  });

  it('`accionesQueOfrece`: un estado que no esta no ofrece nada, y una clave que no se declaro REVIENTA', () => {
    const def = definicion.bloques[1].tabla.accionesPorFila;
    expect(accionesQueOfrece(def, datosDe(['estado', 'OTRO']))).toEqual([]);
    expect(accionesQueOfrece(def, undefined)).toEqual([]);
    expect(accionesQueOfrece(def, datosDe(['estado', 'PENDIENTE'])).map((a) => a.clave)).toEqual(['aprobar', 'descartar']);
    expect(() =>
      accionesQueOfrece({ ...def, segun: { dato: 'estado', ofrece: { X: ['borrar'] } } }, datosDe(['estado', 'X'])),
    ).toThrow(/«borrar» no es una accion de la tabla/);
  });
});

describe('`ayuda-en-una-lista`', () => {
  it('la linea de debajo, traducida y ligada al desplegable', () => {
    const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['ayuda-en-una-lista'];
    monta(definicion, datos, { traducir: (t) => `«${t}»` });
    expect(screen.getByRole('combobox', { name: '«Ordenar por»' })).toHaveAccessibleDescription(
      '«Solo los campos que el servidor admite»',
    );
  });
});

describe('`varias-tablas-en-un-bloque`', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['varias-tablas-en-un-bloque'];

  it('dos tablas en la misma tarjeta, cada una con SUS filas, su vacio y su nota', () => {
    const { container } = monta(definicion, datos);
    expect(container.querySelectorAll('[data-slot="tarjeta"]')).toHaveLength(1);
    const [zonas, franjas] = screen.getAllByRole('table');
    expect(within(zonas as HTMLElement).getByRole('cell', { name: 'Z-1' })).toBeTruthy();
    expect(within(franjas as HTMLElement).queryAllByRole('cell')).toHaveLength(0);
    expect(screen.getByText('No cae en ninguna franja.')).toBeTruthy();
    expect(screen.queryByText('No cae en ninguna zona.')).toBeNull();
    expect(screen.getByText('Una franja no es una zona: se leen por separado.')).toBeTruthy();
  });

  it('con `tabla` y `tablas`, va primero `tabla`; y la lectura del bloque las sustituye a todas', () => {
    const def: Definicion = {
      instruccion: '',
      bloques: [
        {
          ...definicion.bloques[0],
          tabla: { titulo: 'Primera', columnas: [{ rotulo: 'P', alineadoDerecha: false }] },
          lectura: { clave: 'l' },
        },
      ],
    };
    const { unmount } = monta(def, { ...datos, filas: new Map([[0, [['p']]]]), lecturas: new Map([['l', { estado: 'con-datos' }]]) });
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['P', 'Zona', 'Franja']);
    unmount();
    const { container } = monta(def, { ...datos, lecturas: new Map([['l', { estado: 'pidiendo' }]]) });
    expect(container.querySelectorAll('table')).toHaveLength(0);
  });
});

describe('`detalle-de-fila` (AC-6: con teclado)', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['detalle-de-fila'];

  it('solo las filas cuyo dato lo dice llevan su segunda linea, a todo el ancho y con los datos de la fila', () => {
    const { container } = monta(definicion, datos, { traducir: (t) => `«${t}»` });
    const detalles = [...container.querySelectorAll('[data-detalle-de-fila]')];
    expect(detalles).toHaveLength(1);
    const celda = detalles[0]?.querySelector('td');
    expect(celda?.getAttribute('colspan')).toBe('2');
    // La plantilla se traduce; los datos, no.
    expect(celda?.textContent).toBe('«Anulacion: Duplicado · Anulado por inspector.3 · Anulado el 02/09/2026»');
    // Y va justo DESPUES de su fila.
    expect(detalles[0]?.previousElementSibling?.textContent).toContain('V-2');
  });

  it('se alcanza con el TECLADO: la accion de su fila lo lleva en su descripcion', async () => {
    const teclado = userEvent.setup({ delay: null });
    const conAcciones = conTabla({
      ...definicion.bloques[0].tabla,
      accionesPorFila: { columna: 'Acciones', acciones: [{ clave: 'ver', rotulo: 'Ver', hace: 'ver' }], sinAcciones: 'Nada' },
    });
    const { unmount } = monta(conAcciones, datos, { alHacer: { ver: () => {} } });
    await teclado.tab();
    const primera = document.activeElement;
    expect(primera?.textContent).toBe('Ver');
    expect(primera).not.toHaveAttribute('aria-describedby');
    await teclado.tab();
    expect(document.activeElement, 'el detalle se oye al llegar a la accion de SU fila').toHaveAccessibleDescription(
      'Anulacion: Duplicado · Anulado por inspector.3 · Anulado el 02/09/2026',
    );
    unmount();

    // Impedida, el motivo de #66 y el detalle se SUMAN: ninguno pisa al otro.
    monta(conAcciones, datos);
    const [, segunda] = screen.getAllByRole('button', { name: 'Ver' });
    expect(segunda).toHaveAccessibleDescription(
      `${TEXTOS_DE_LAS_PIEZAS.sinQuienLoAtienda('ver')} Anulacion: Duplicado · Anulado por inspector.3 · Anulado el 02/09/2026`,
    );
  });
});

describe('`tabla-de-cabecera-fija` (con teclado)', () => {
  const { definicion, datos } = MUESTRAS_DE_CAMPOS_Y_TABLAS['tabla-de-cabecera-fija'];

  it('la cabecera es `sticky` dentro de un marco que se desplaza el mismo, en las dos direcciones', () => {
    const { container } = monta(definicion, datos);
    const marco = container.querySelector('[data-cabecera-fija]');
    expect(marco?.getAttribute('data-slot')).toBe('tabla-marco');
    expect(marco?.className).toContain('overflow-auto');
    expect(marco?.className).not.toContain('overflow-x-auto');
    for (const rotulo of screen.getAllByRole('columnheader')) {
      expect(rotulo.className).toContain('sticky');
      expect(rotulo.className).toContain('top-0');
    }
    // La primera columna, en negrita (de #27).
    expect(screen.getByRole('cell', { name: 'C-01' }).className).toContain('font-semibold');
  });

  it('el marco es una region con el nombre de la tabla y ENTRA en el tabulador, para desplazarla con el teclado', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, datos);
    const region = screen.getByRole('region', { name: 'Catalogo' });
    await teclado.tab();
    expect(document.activeElement).toBe(region);
  });

  it('sin `cabeceraFija`, la tabla de siempre: ni region, ni `sticky`', () => {
    const { container } = monta(conTabla({ titulo: 'T', columnas: [{ rotulo: 'A', alineadoDerecha: false }] }), {
      filas: new Map([[0, [['a']]]]),
    });
    expect(container.querySelector('[data-cabecera-fija]')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('columnheader').className).not.toContain('sticky');
  });
});

describe('LAS MUESTRAS: una por hueco de #65, y todas se dibujan', () => {
  const LOS_DIEZ = [
    'tabla-con-vacio',
    'marcador',
    'insignia-con-tono-por-regla',
    'dato-con-insignia',
    'opciones-con-valor-y-rotulo',
    'acciones-por-fila',
    'ayuda-en-una-lista',
    'varias-tablas-en-un-bloque',
    'detalle-de-fila',
    'tabla-de-cabecera-fija',
  ];

  it('EL CENTINELA: estan los diez huecos de la tabla de #65, ni uno menos ni uno de mas', () => {
    expect(Object.keys(MUESTRAS_DE_CAMPOS_Y_TABLAS).sort()).toEqual([...LOS_DIEZ].sort());
  });

  it.each(Object.entries(MUESTRAS_DE_CAMPOS_Y_TABLAS))('«%s» se dibuja sin avisos de costura rota', (_hueco, muestra) => {
    const { container } = monta(muestra.definicion, muestra.datos, {
      actos: { aprobar: () => {} },
      navegacion: { ofrece: () => true, ir: () => {} },
    });
    expect(container.textContent?.trim()).not.toBe('');
    expect(
      container.querySelector('[data-pieza-sin-registrar], [data-lectura-sin-estado], [data-tabla-sin-motivo], [data-slot="motivo"]'),
    ).toBeNull();
  });
});
