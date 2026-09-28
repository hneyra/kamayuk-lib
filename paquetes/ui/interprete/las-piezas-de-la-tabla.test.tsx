import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ConHoja } from './arnes-del-interprete.tsx';
import type { DatosDeLaPantalla, FilaDeLaTabla } from './datos.ts';
import { useEnElMarcoOAqui } from './en-el-marco-o-aqui.ts';
import { type CambioDeLaRuta, type HojaDelMarco, useSitioDeLaHoja } from './hoja.ts';
import { MUESTRAS_DE_LA_COMPOSICION } from './muestras-de-la-composicion.ts';
import { Pantalla } from './Pantalla.tsx';
import { queDiceSinFilas, type LoQueDiceSinFilas } from './reglas-de-las-tablas.ts';
import { destinoDeLaTecla, EN_UNA_LISTA, EN_UNAS_PESTANAS, type ComoSeMueveElFoco } from './teclado.ts';
import type { DefinicionDePantalla, DefinicionDeTabla, PiezaDeLaPantalla, Texto, VacioDeLaTabla } from './tipos.ts';

/**
 * **La tabla, el acto y la pantalla en piezas** (#120): lo que salio de las tres piezas grandes y
 * de las copias que habia entre ellas.
 *
 * · `queDiceSinFilas`: los cinco «sin filas» de la tabla eran cinco condicionales sueltos, y nada
 *   garantizaba que solo saliera uno. Ahora es una funcion que contesta UNO, y aqui se recorren
 *   todas las combinaciones —puras y montadas— para afirmar que en pantalla sale ese y solo ese.
 * · `destinoDeLaTecla`: el tabulador itinerante estaba copiado en la tabla, el maestro y las
 *   pestanas. Una tabla de casos con las tres configuraciones.
 * · `useEnElMarcoOAqui` y `useSitioDeLaHoja`: el «en la ruta o local», copiado seis veces.
 *
 * Las pruebas de teclado de antes (`la-fila-es-elegible`, `composicion`) siguen sin cambiar.
 */

// ── destinoDeLaTecla ─────────────────────────────────────────────────────────────────────────────

/** Las tres piezas con tabulador itinerante, y como mueve el foco cada una. */
const LAS_TRES: Readonly<Record<'tabla' | 'maestro' | 'pestanas', ComoSeMueveElFoco>> = {
  tabla: EN_UNA_LISTA,
  maestro: EN_UNA_LISTA,
  pestanas: EN_UNAS_PESTANAS,
};

/** `[pieza, tecla, desde, total, destino]`, sobre cuatro hijas salvo que se diga. */
const CASOS_DEL_TECLADO: readonly (readonly [keyof typeof LAS_TRES, string, number, number, number | null])[] = [
  // La tabla (#95): ↑/↓ sin dar la vuelta; ←/→ no son suyas.
  ['tabla', 'ArrowDown', 0, 4, 1],
  ['tabla', 'ArrowDown', 3, 4, 3],
  ['tabla', 'ArrowUp', 2, 4, 1],
  ['tabla', 'ArrowUp', 0, 4, 0],
  ['tabla', 'Home', 2, 4, 0],
  ['tabla', 'End', 1, 4, 3],
  ['tabla', 'ArrowRight', 1, 4, null],
  ['tabla', 'Enter', 1, 4, null],
  // El maestro (#67): lo mismo, por indice.
  ['maestro', 'ArrowDown', 1, 2, 1],
  ['maestro', 'ArrowDown', 0, 2, 1],
  ['maestro', 'ArrowUp', 0, 2, 0],
  ['maestro', 'Home', 1, 2, 0],
  ['maestro', 'End', 0, 2, 1],
  ['maestro', 'ArrowLeft', 1, 2, null],
  ['maestro', ' ', 0, 2, null],
  // Las pestanas (#67): ←/→ dando la vuelta; ↑/↓ no son suyas.
  ['pestanas', 'ArrowRight', 0, 3, 1],
  ['pestanas', 'ArrowRight', 2, 3, 0],
  ['pestanas', 'ArrowLeft', 0, 3, 2],
  ['pestanas', 'ArrowLeft', 2, 3, 1],
  ['pestanas', 'Home', 2, 3, 0],
  ['pestanas', 'End', 0, 3, 2],
  ['pestanas', 'ArrowDown', 0, 3, null],
  // Sin hijas, ninguna tecla mueve nada.
  ['tabla', 'End', 0, 0, null],
  ['pestanas', 'ArrowRight', 0, 0, null],
];

describe('`destinoDeLaTecla`: el tabulador itinerante de las tres piezas, en una funcion', () => {
  it.each(CASOS_DEL_TECLADO)('%s: «%s» desde %i de %i va a %s', (pieza, tecla, desde, total, destino) => {
    expect(destinoDeLaTecla(tecla, desde, total, LAS_TRES[pieza])).toBe(destino);
  });

  it('EL CENTINELA: la tabla de casos pasa por las tres piezas y por los dos extremos de cada una', () => {
    for (const pieza of Object.keys(LAS_TRES)) {
      const suyos = CASOS_DEL_TECLADO.filter(([p]) => p === pieza);
      expect(suyos.length, pieza).toBeGreaterThanOrEqual(6);
      // Un caso en cada extremo con la tecla que lo cruzaria: es donde las piezas se distinguen.
      expect(suyos.some(([, , desde, total]) => desde === total - 1), pieza).toBe(true);
      expect(suyos.some(([, , desde]) => desde === 0), pieza).toBe(true);
    }
  });
});

// ── El maestro, montado: en el ultimo, ↓ se queda ───────────────────────────────────────────────

describe('el maestro, con `destinoDeLaTecla`: la lista no da la vuelta', () => {
  it('en el ultimo, ↓ se queda; en el primero, ↑ tambien; y moverse no elige', async () => {
    const { definicion, datos } = MUESTRAS_DE_LA_COMPOSICION['maestro-detalle'];
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    render(<ConHoja inicial={{ sujeto: '42', parametros: {} }} cambios={cambios} definicion={definicion} datos={datos} />);
    await teclado.tab();
    expect(document.activeElement).toBe(screen.getByRole('option', { name: /Segundo/ }));
    await teclado.keyboard('{ArrowDown}');
    expect(document.activeElement, 'la lista del maestro dio la vuelta').toBe(screen.getByRole('option', { name: /Segundo/ }));
    await teclado.keyboard('{Home}');
    await teclado.keyboard('{ArrowUp}');
    expect(document.activeElement, 'la lista del maestro dio la vuelta').toBe(screen.getByRole('option', { name: /Primero/ }));
    expect(cambios).toEqual([]);
  });
});

// ── queDiceSinFilas ──────────────────────────────────────────────────────────────────────────────

const VACIOS: readonly (Texto | undefined)[] = [undefined, '', 'Nada todavia.'];
const CON_SALIDA: readonly (VacioDeLaTabla<Texto> | undefined)[] = [
  undefined,
  { titulo: '' },
  { titulo: 'Todavia no hay ninguno', texto: 'Cree el primero.' },
];
const FILTROS = [undefined, { buscador: { rotulo: 'Buscar' } }] as const;
/** `[recibidas, visibles]`: sin dato, lista vacia, con filas, y con filas que el filtro vacia o acota. */
const CUANTAS: readonly (readonly [number | undefined, number | undefined])[] = [
  [undefined, undefined],
  [0, 0],
  [3, 3],
  [3, 1],
  [3, 0],
];

interface Combinacion {
  readonly vacio: Texto | undefined;
  readonly vacioConSalida: VacioDeLaTabla<Texto> | undefined;
  readonly filtroLocal: (typeof FILTROS)[number];
  readonly recibidas: number | undefined;
  readonly visibles: number | undefined;
}

/** Todas: 3 × 3 × 2 × 5, menos las que el filtro no puede dar (acotar sin filtro). */
const COMBINACIONES: readonly Combinacion[] = VACIOS.flatMap((vacio) =>
  CON_SALIDA.flatMap((vacioConSalida) =>
    FILTROS.flatMap((filtroLocal) =>
      CUANTAS.filter(([recibidas, visibles]) => filtroLocal !== undefined || recibidas === visibles).map(
        ([recibidas, visibles]) => ({ vacio, vacioConSalida, filtroLocal, recibidas, visibles }),
      ),
    ),
  ),
);

const tablaDe = (c: Combinacion): DefinicionDeTabla<Texto> => ({
  titulo: 'Registros',
  clave: 'registros',
  columnas: [{ rotulo: 'Codigo', alineadoDerecha: false }],
  ...(c.vacio === undefined ? {} : { vacio: c.vacio }),
  ...(c.vacioConSalida === undefined ? {} : { vacioConSalida: c.vacioConSalida }),
  ...(c.filtroLocal === undefined ? {} : { filtroLocal: c.filtroLocal }),
});

const nombreDe = (c: Combinacion): string =>
  [
    `vacio=${JSON.stringify(c.vacio) ?? 'no'}`,
    `conSalida=${c.vacioConSalida === undefined ? 'no' : JSON.stringify(c.vacioConSalida.titulo)}`,
    `filtro=${c.filtroLocal === undefined ? 'no' : 'si'}`,
    `filas=${String(c.recibidas)}/${String(c.visibles)}`,
  ].join(' ');

describe('`queDiceSinFilas`: de los cinco «sin filas», uno o ninguno', () => {
  // Escritos a mano, uno por respuesta: lo que #27, #65, #61 y #86 dicen con palabras.
  it.each([
    ['sin dato, aunque haya vacio con salida', { vacio: 'x', vacioConSalida: { titulo: 'y' } }, undefined, undefined, 'ausencia'],
    ['lista vacia con los dos: gana la salida', { vacio: 'x', vacioConSalida: { titulo: 'y' } }, 0, 0, 'vacioConSalida'],
    ['lista vacia con salida de titulo vacio: la frase', { vacio: 'x', vacioConSalida: { titulo: '' } }, 0, 0, 'vacio'],
    ['lista vacia sin nada que decir', {}, 0, 0, 'sinMotivo'],
    ['lista vacia con `vacio: ""`: es muda', { vacio: '' }, 0, 0, 'sinMotivo'],
    ['con filas que el filtro vacia', { vacio: 'x', filtroLocal: { buscador: { rotulo: 'b' } } }, 3, 0, 'sinCoincidencias'],
    ['con filas que el filtro acota', { filtroLocal: { buscador: { rotulo: 'b' } } }, 3, 1, null],
    ['con filas', {}, 3, 3, null],
  ] as const)('%s', (_caso, parte, recibidas, visibles, esperado) => {
    const tabla: DefinicionDeTabla<Texto> = { titulo: 't', columnas: [], ...parte };
    expect(queDiceSinFilas(tabla, recibidas, visibles)).toBe(esperado);
  });

  it.each(COMBINACIONES.map((c) => [nombreDe(c), c] as const))('%s', (_nombre, c) => {
    const dice = queDiceSinFilas(tablaDe(c), c.recibidas, c.visibles);
    const hayVacioConSalida = c.vacioConSalida !== undefined && c.vacioConSalida.titulo !== '';
    const hayVacio = c.vacio !== undefined && c.vacio !== '';
    // Cada respuesta, con la unica condicion que la da: si dos se cumplieran a la vez, una fallaria.
    expect(dice === 'ausencia').toBe(c.recibidas === undefined);
    expect(dice === 'vacioConSalida').toBe(c.recibidas === 0 && hayVacioConSalida);
    expect(dice === 'vacio').toBe(c.recibidas === 0 && !hayVacioConSalida && hayVacio);
    expect(dice === 'sinMotivo').toBe(c.recibidas === 0 && !hayVacioConSalida && !hayVacio);
    expect(dice === 'sinCoincidencias').toBe(
      c.recibidas !== undefined && c.recibidas > 0 && c.visibles === 0 && c.filtroLocal !== undefined,
    );
  });

  it('EL CENTINELA: las combinaciones dan las cinco respuestas y la de «nada que decir»', () => {
    const dadas = new Set(COMBINACIONES.map((c) => queDiceSinFilas(tablaDe(c), c.recibidas, c.visibles)));
    const todas: readonly (LoQueDiceSinFilas | null)[] = ['ausencia', 'vacioConSalida', 'vacio', 'sinCoincidencias', 'sinMotivo', null];
    expect([...dadas].sort()).toEqual([...todas].sort());
  });
});

/** Los sitios donde la tabla dice cada «sin filas». Ninguno comparte selector con otro. */
const LO_QUE_SE_VE: Readonly<Record<LoQueDiceSinFilas, string>> = {
  ausencia: 'p[data-sin-dato]',
  vacioConSalida: 'div[data-vacio]',
  vacio: 'p[data-vacio]',
  sinCoincidencias: '[data-sin-coincidencias]',
  sinMotivo: '[data-tabla-sin-motivo]',
};

const FILAS: readonly FilaDeLaTabla[] = [{ celdas: ['uno'] }, { celdas: ['dos'] }, { celdas: ['tres'] }];

describe('montada, la tabla dibuja lo que `queDiceSinFilas` contesta, y NADA MAS', () => {
  it.each(COMBINACIONES.map((c) => [nombreDe(c), c] as const))('%s', (_nombre, c) => {
    const definicion: DefinicionDePantalla<PiezaDeLaPantalla> = {
      instruccion: '',
      bloques: [{ titulo: 'Bloque', nota: '', campos: [], tabla: tablaDe(c) }],
    };
    const datos: DatosDeLaPantalla = {
      ausencia: { enElCampo: 'Sin conectar', explicacion: '', tono: 'info' },
      ...(c.recibidas === undefined ? {} : { tablas: new Map([['registros', { filas: FILAS.slice(0, c.recibidas) }]]) }),
    };
    const { container } = render(<Pantalla definicion={definicion} datos={datos} tonoDeLaInsignia={() => 'info'} />);
    // Acotar con el buscador: «dos» deja una; lo que no esta en ninguna, cero.
    if (c.recibidas !== undefined && c.visibles !== c.recibidas) {
      const buscador = container.querySelector('input[type="search"]');
      if (buscador === null) throw new Error('la tabla con filtro no dibujo su buscador');
      act(() => {
        fireEvent.change(buscador, { target: { value: c.visibles === 0 ? 'ninguna-casa' : 'dos' } });
      });
    }
    const dice = queDiceSinFilas(tablaDe(c), c.recibidas, c.visibles);
    const salen = (Object.keys(LO_QUE_SE_VE) as LoQueDiceSinFilas[]).filter(
      (cual) => container.querySelector(LO_QUE_SE_VE[cual]) !== null,
    );
    expect(salen).toEqual(dice === null ? [] : [dice]);
  });
});

// ── useEnElMarcoOAqui y useSitioDeLaHoja ─────────────────────────────────────────────────────────

describe('`useEnElMarcoOAqui`: el «en el marco o aqui», en un solo sitio', () => {
  const sumar = (antes: number, cambio: number): number => antes + cambio;

  it('sin marco, lo guarda aqui, y dos cambios del mismo gesto se aplican uno sobre otro', () => {
    const { result } = renderHook(() => useEnElMarcoOAqui<number, number>(undefined, 10, sumar));
    expect(result.current.valor).toBe(10);
    act(() => {
      result.current.cambiar(1);
      result.current.cambiar(2);
    });
    expect(result.current.valor).toBe(13);
  });

  it('con marco, lee el suyo y le pasa el cambio tal cual: no guarda una copia', () => {
    const recibidos: number[] = [];
    const { result } = renderHook(() =>
      useEnElMarcoOAqui<number, number>({ valor: 7, cambiar: (c) => recibidos.push(c) }, 10, sumar),
    );
    act(() => {
      result.current.cambiar(5);
    });
    expect(result.current.valor).toBe(7);
    expect(recibidos).toEqual([5]);
  });
});

describe('`useSitioDeLaHoja`: la ruta de la hoja, o el estado de la pieza', () => {
  it('con hoja, varios sitios van en UN movimiento de la ruta, y se leen de ella', () => {
    const cambios: CambioDeLaRuta[] = [];
    const hoja: HojaDelMarco = {
      ruta: { sujeto: '9', parametros: { pagina: '2' } },
      moverLaRuta: (cambio) => cambios.push(cambio),
    };
    const { result } = renderHook(() => useSitioDeLaHoja(hoja));
    expect(result.current.leer('sujeto')).toBe('9');
    expect(result.current.leer('pagina')).toBe('2');
    expect(result.current.leer('orden')).toBeNull();
    act(() => {
      result.current.fijar({ pagina: '0', orden: 'anno' });
    });
    expect(cambios).toEqual([{ parametros: { pagina: '0', orden: 'anno' } }]);
  });

  it('sin hoja, lo guarda la pieza: `null` lo quita y lo demas se queda', () => {
    const { result } = renderHook(() => useSitioDeLaHoja(undefined));
    act(() => {
      result.current.fijar({ sujeto: '4', pagina: '3', orden: 'anno' });
    });
    act(() => {
      result.current.fijar({ pagina: null });
    });
    expect(result.current.leer('sujeto')).toBe('4');
    expect(result.current.leer('pagina')).toBeNull();
    expect(result.current.leer('orden')).toBe('anno');
  });
});
