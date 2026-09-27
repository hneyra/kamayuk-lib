import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { ausenciaQueDice, ConHoja, hojaEspiada, monta, montadorDeLaPantalla } from './arnes-del-interprete.tsx';
import type { FilaDeLaTabla } from './datos.ts';
import { cambiosEn, type CambioDeLaRuta } from './hoja.ts';
import { MUESTRAS_DE_LAS_TABLAS } from './muestras-de-las-tablas.ts';
import { MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA } from './muestras-de-los-campos-los-actos-y-la-prosa.ts';
import {
  conteoDelFiltro,
  filtrarLasFilas,
  notaDeLaCelda,
  paginaDeLaTabla,
  SIN_FILTRO,
  tablasSinVacio,
  textoDeLaCelda,
} from './reglas-de-las-tablas.ts';
import type { DefinicionDePantalla, DefinicionDeTabla, PiezaDeLaPantalla, Texto } from './tipos.ts';

/**
 * **Las tablas de #61**: la pagina y el orden del servidor, la tabla de decenas de miles de filas,
 * la celda que puede no traer dato, la cabecera con el campo del contrato, el vacio con su salida y
 * las filas que viajan en la definicion.
 *
 * Cada `describe` es un hueco de `normativa/frontend/diseno/HUECOS.md` —H01, H21, H22a, H23, H26 y
 * H34, y el H02 de #86, el filtro en el cliente, que vivio en `los-campos-los-actos-y-la-prosa` hasta
 * que #127 lo trajo con las demas tablas— o un criterio de aceptacion. Las definiciones son neutras por lo mismo que en
 * `campos-y-tablas.test.tsx`: una prueba de la libreria escrita con las palabras de un sistema es
 * la API de ese sistema con otro nombre.
 *
 * **El desplegable se lee por su `<select>` nativo, dentro de un `<form>`**, y no abriendo su capa:
 * el motivo, medido, esta en `shadcn/capa-del-desplegable.test.tsx`.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

/** Lo que dice el hueco de un campo sin dato en esta suite, que lo comprueba escrito. */
const SIN_DATO = ausenciaQueDice('sin dato');

/** En un formulario: el desplegable del orden se lee por su `<select>` nativo, sin abrir su capa. */
const montaEnUnFormulario = montadorDeLaPantalla({ ausencia: SIN_DATO, enUnFormulario: true });

/**
 * Y sin el formulario de fuera, para lo que abre un acto: el acto ES un `<form>`, y anidarlos no es
 * HTML valido —React lo dice en la consola—. Aqui no hay ningun desplegable que leer.
 */
const montaSuelta = montadorDeLaPantalla({ ausencia: SIN_DATO });

/** Una pantalla con una sola tabla, y sus filas por nombre. */
const conTabla = (tabla: DefinicionDeTabla<Texto>): Definicion => ({
  instruccion: '',
  bloques: [{ titulo: 'Bloque', nota: '', campos: [], tabla }],
});

const tablas = (clave: string, filas: readonly FilaDeLaTabla[], conteo?: string) =>
  new Map([[clave, conteo === undefined ? { filas } : { filas, conteo }]]);

const cuerpo = () => screen.getByRole('table').querySelectorAll('tbody tr');

// ── H01 · `paginacion-y-orden-en-el-servidor` ──────────────────────────────────────────────────

describe('`paginacion-y-orden-en-el-servidor` (H01): la pagina y el orden VIAJAN en la ruta', () => {
  const { definicion, datos } = MUESTRAS_DE_LAS_TABLAS['paginacion-y-orden-en-el-servidor'];

  it('las filas que llegan YA son la pagina: no se corta ninguna, y el indicador lo dice el servidor', () => {
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja enUnFormulario inicial={{ sujeto: null, parametros: {} }} cambios={cambios} definicion={definicion} datos={datos} />);
    expect(cuerpo()).toHaveLength(2);
    // «Pagina 1 de 3»: la 1 es la 0 de la ruta leida, y el 3 lo dijo el servidor en `totalPaginas`.
    expect(screen.getByText(TEXTOS_DE_LAS_PIEZAS.paginaDe(1, 3))).toBeTruthy();
  });

  it('«Siguiente» escribe la pagina en la ruta, y «Anterior» esta IMPEDIDA con su motivo, no apagada', () => {
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja enUnFormulario inicial={{ sujeto: null, parametros: {} }} cambios={cambios} definicion={definicion} datos={datos} />);
    const anterior = screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaAnterior });
    // `aria-disabled`, NUNCA `disabled` (#66): sigue en el orden del tabulador y dice por que.
    expect(anterior.getAttribute('aria-disabled')).toBe('true');
    expect(anterior).not.toBeDisabled();
    expect(anterior).toHaveAccessibleDescription(TEXTOS_DE_LAS_PIEZAS.yaEsLaPrimeraPagina);
    fireEvent.click(anterior);
    expect(cambios, 'una accion impedida movio la ruta').toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaSiguiente }));
    expect(cambios).toEqual([{ parametros: { pagina: '1' } }]);
    expect(screen.getByText(TEXTOS_DE_LAS_PIEZAS.paginaDe(2, 3))).toBeTruthy();
  });

  it('quien dice si hay otra pagina es EL SERVIDOR, y no la cuenta de las filas recibidas', () => {
    const cambios: CambioDeLaRuta[] = [];
    // Dos filas en la pagina, como arriba, pero `hayMas: false`: la cuenta de filas no lo sabe.
    render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: {} }}
        cambios={cambios}
        definicion={definicion}
        datos={{ ...datos, nombrados: new Map<string, string | boolean | null>([['hayMas', false], ['totalPaginas', '1']]) }}
      />,
    );
    const siguiente = screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaSiguiente });
    expect(siguiente.getAttribute('aria-disabled')).toBe('true');
    expect(siguiente).toHaveAccessibleDescription(TEXTOS_DE_LAS_PIEZAS.noHayMasPaginas);
  });

  it('TECLADO: se llega a los dos mandos con el tabulador, y Enter sobre el impedido no mueve nada', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja enUnFormulario inicial={{ sujeto: null, parametros: {} }} cambios={cambios} definicion={definicion} datos={datos} />);
    const anterior = screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaAnterior });
    anterior.focus();
    expect(document.activeElement, 'el mando impedido salio del orden del tabulador').toBe(anterior);
    await userEvent.keyboard('{Enter}');
    expect(cambios).toEqual([]);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(cambios).toEqual([{ parametros: { pagina: '1' } }]);
  });

  it('solo se ofrecen los campos de la LISTA BLANCA, y cambiar de orden vuelve a la primera EN UN SOLO movimiento', () => {
    const cambios: CambioDeLaRuta[] = [];
    const { container } = render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: { pagina: '2' } }}
        cambios={cambios}
        definicion={definicion}
        datos={datos}
      />,
    );
    const nativo = container.querySelector('select');
    expect([...(nativo?.options ?? [])].map((o) => o.value)).toEqual(['anno', 'situacion', 'id']);
    fireEvent.change(nativo as HTMLSelectElement, { target: { value: 'situacion' } });
    // Un solo cambio, con las dos cosas: la direccion intermedia —orden nuevo, pagina vieja— seria
    // una lectura que nadie quiso.
    expect(cambios).toEqual([{ parametros: { pagina: '0', ordenarPor: 'situacion' } }]);
  });

  it('el sentido escribe el valor DEL BACKEND, y el rotulo dice lo que HARA', () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: {} }}
        cambios={cambios}
        definicion={definicion}
        datos={datos}
      />,
    );
    const invertir = screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.pasarADescendente });
    fireEvent.click(invertir);
    expect(cambios).toEqual([{ parametros: { pagina: '0', direccion: 'DESCENDENTE' } }]);
    expect(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.pasarAAscendente })).toBeTruthy();
  });

  it('`aria-sort` va en la columna cuyo `campo` se esta ordenando, y en ninguna otra', () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: { ordenarPor: 'situacion', direccion: 'DESCENDENTE' } }}
        cambios={cambios}
        definicion={definicion}
        datos={datos}
      />,
    );
    const rotulos = screen.getAllByRole('columnheader');
    expect(rotulos.map((r) => r.getAttribute('aria-sort'))).toEqual([null, null, 'descending']);
  });

  it('un orden que el servidor NO admite no se ofrece: la ruta con uno de fuera cae al primero', () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: { ordenarPor: 'loQueSea' } }}
        cambios={cambios}
        definicion={definicion}
        datos={datos}
      />,
    );
    expect(screen.getAllByRole('columnheader').map((r) => r.getAttribute('aria-sort'))).toEqual([
      null,
      'ascending',
      null,
    ]);
  });

  it('sin `hoja` la tabla los guarda en SU estado: funciona fuera del marco, y no sobrevive a recargar', () => {
    montaEnUnFormulario(definicion, datos);
    fireEvent.click(screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.paginaSiguiente }));
    expect(screen.getByText(TEXTOS_DE_LAS_PIEZAS.paginaDe(2, 3))).toBeTruthy();
  });
});

// ── H02 · `filtro-en-el-cliente-con-conteo` (#86) ──────────────────────────────────────────────

describe('`filtro-en-el-cliente-con-conteo` (H02): acota lo que LLEGO, y dice cuantas deja', () => {
  const { definicion, datos } = MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA['filtro-en-el-cliente-con-conteo'];
  const bloque = definicion.bloques[0];
  const tabla = bloque.tablas[0];
  const conTabla = (cambios: object): Definicion => ({
    instruccion: '',
    bloques: [{ ...bloque, tablas: [{ ...tabla, ...cambios }] }],
  });
  const codigos = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((fila) => fila.querySelector('td')?.textContent);
  const buscador = () => screen.getByRole('searchbox', { name: 'Buscar en esta pagina' });
  const chip = (rotulo: string) => screen.getByRole('button', { name: rotulo });
  const estado = () => document.querySelector('[data-slot="conteo-del-filtro"]') as HTMLElement;

  it('SIN el dato, la tabla es la de antes: ni buscador, ni chips, ni region viva, y el conteo de siempre', () => {
    const { container } = monta(conTabla({ filtroLocal: undefined }), datos);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(container.querySelector('[data-slot="filtro-local"], [data-chip], [role="status"]')).toBeNull();
    expect(container.querySelector('[data-slot="tarjeta-barra-de-tabla"]')?.textContent).toBe(
      'Registros de la pagina4 registros',
    );
    expect(codigos()).toEqual(['R-001', 'R-002', 'R-003', 'R-004']);
  });

  it('CON el dato: un grupo con nombre, el buscador con el suyo, los chips sin pulsar y la region viva ya montada', () => {
    monta(definicion, datos);
    const grupo = screen.getByRole('group', { name: TEXTOS_DE_LAS_PIEZAS.filtrarLaTabla('Registros de la pagina') });
    expect(within(grupo).getByRole('searchbox').getAttribute('aria-label')).toBe('Buscar en esta pagina');
    expect(buscador().getAttribute('placeholder')).toBe('Codigo o descripcion');
    expect(chip('Vigentes').getAttribute('aria-pressed')).toBe('false');
    expect(chip('Anulados').getAttribute('aria-pressed')).toBe('false');
    expect(estado().getAttribute('role')).toBe('status');
    expect(estado().textContent, 'sin filtro puesto, la region viva no dice nada').toBe('');
    expect(screen.getByText('4 registros')).toBeTruthy();
  });

  it('buscar deja las que casan —sin mayusculas ni tildes— y dice «N de M · T en total», con el total DEL SISTEMA', () => {
    monta(definicion, datos);
    fireEvent.change(buscador(), { target: { value: 'BODEGA' } });
    expect(codigos()).toEqual(['R-001', 'R-002']);
    expect(estado().textContent).toBe(TEXTOS_DE_LAS_PIEZAS.filasQueDejaElFiltro(2, 4, '57'));
    expect(estado().textContent).toBe('2 de 4 · 57 en total');
    // El conteo de siempre se calla: «4 registros» junto a dos filas se leeria como dos que faltan.
    expect(screen.queryByText('4 registros')).toBeNull();
  });

  it('sin el total del sistema, NO se escribe ninguno: M es lo que llego, no lo que hay', () => {
    monta(definicion, { ...datos, nombrados: new Map([['registros.hayMas', true]]) });
    fireEvent.change(buscador(), { target: { value: 'bodega' } });
    expect(estado().textContent, 'el conteo invento un total que no llego').toBe('2 de 4');
  });

  it('los chips leen el DATO de la fila; los del mismo dato se suman, y con el buscador se cruzan', () => {
    monta(definicion, datos);
    fireEvent.click(chip('Anulados'));
    expect(chip('Anulados').getAttribute('aria-pressed')).toBe('true');
    expect(codigos()).toEqual(['R-002']);
    fireEvent.click(chip('Vigentes'));
    expect(codigos()).toEqual(['R-001', 'R-002', 'R-003', 'R-004']);
    fireEvent.change(buscador(), { target: { value: 'bodega' } });
    fireEvent.click(chip('Anulados'));
    expect(codigos()).toEqual(['R-001']);
    expect(estado().textContent).toBe('1 de 4 · 57 en total');
  });

  it('NO viaja: ni a la ruta ni a quien pide —ni un `moverLaRuta`, ni un `alHacer`— y no ensucia la hoja', () => {
    const hoja = { ...hojaEspiada(), moverLaRuta: vi.fn() };
    const alHacer = { releer: vi.fn() };
    monta({ ...definicion, hoja: { suciaAlTeclear: true } }, datos, { hoja, alHacer });
    fireEvent.change(buscador(), { target: { value: 'bodega' } });
    fireEvent.click(chip('Anulados'));
    expect(hoja.moverLaRuta, 'el filtro viajo a la ruta: `?estado=` seria un 422').not.toHaveBeenCalled();
    expect(alHacer.releer).not.toHaveBeenCalled();
    expect(hoja.marcarSucia, 'un filtro no es trabajo sin guardar').not.toHaveBeenCalled();
  });

  it('en la paginacion de CLIENTE filtra TODAS las recibidas antes de cortar, y vuelve a la primera sin llevar el filtro', () => {
    const hoja = { ruta: { sujeto: null, parametros: { pagina: '1' } }, moverLaRuta: vi.fn() };
    monta(conTabla({ paginacion: { en: 'cliente', enLaRuta: 'pagina', tamano: 2 } }), datos, { hoja });
    expect(codigos()).toEqual(['R-003', 'R-004']);
    fireEvent.change(buscador(), { target: { value: 'almacen' } });
    // La que casa es la cuarta de lo recibido, y queda sola en la primera pagina de lo filtrado:
    // cortar primero y filtrar despues buscaria en otra pagina y no dejaria ninguna.
    expect(codigos(), 'se filtro la pagina ya cortada, y no todas las recibidas').toEqual(['R-004']);
    expect(estado().textContent).toBe('1 de 4 · 57 en total');
    // Lo unico que se mueve es la pagina, a la primera: el texto buscado no esta en ningun cambio.
    expect(hoja.moverLaRuta.mock.calls).toEqual([[{ parametros: { pagina: null } }]]);
    expect(JSON.stringify(hoja.moverLaRuta.mock.calls)).not.toContain('almacen');
  });

  it('si el filtro no deja ninguna, lo dice con SU frase —no con el `vacio` de la tabla—; sin ella, la del saco', () => {
    const { container, unmount } = monta(definicion, datos);
    fireEvent.change(buscador(), { target: { value: 'no existe' } });
    expect(container.querySelector('[data-sin-coincidencias]')?.textContent).toBe(
      'Ningun registro de esta pagina pasa el filtro.',
    );
    expect(container.querySelector('[data-vacio]'), 'el filtro reuso el `vacio` de la tabla').toBeNull();
    expect(screen.queryByText('El servidor no devolvio ningun registro.')).toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
    expect(estado().textContent).toBe('0 de 4 · 57 en total');
    unmount();

    const otra = monta(conTabla({ filtroLocal: { ...tabla.filtroLocal, sinCoincidencias: undefined } }), datos);
    fireEvent.change(buscador(), { target: { value: 'no existe' } });
    expect(otra.container.querySelector('[data-sin-coincidencias]')?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.ningunaPasaElFiltro);
  });

  it('sin dato y con `[]` no hay nada que acotar: ni buscador ni conteo; cada una dice lo suyo, como desde #61', () => {
    const { container, unmount } = monta(definicion, { ...datos, tablas: new Map() });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(container.querySelector('[data-sin-dato]')).not.toBeNull();
    unmount();
    const vacia = monta(definicion, { ...datos, tablas: new Map([['registros', { filas: [] }]]) });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(vacia.container.querySelector('[role="status"]')).toBeNull();
    expect(vacia.container.querySelector('[data-vacio]')?.textContent).toBe('El servidor no devolvio ningun registro.');
  });

  it('TECLADO: Tab llega al buscador y a cada chip; se escribe, y Espacio y Enter pulsan y sueltan', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, datos);
    await teclado.tab();
    expect(document.activeElement).toBe(buscador());
    await teclado.keyboard('taller');
    expect(codigos()).toEqual(['R-003']);
    await teclado.tab();
    expect(document.activeElement).toBe(chip('Vigentes'));
    await teclado.keyboard(' ');
    expect(chip('Vigentes').getAttribute('aria-pressed')).toBe('true');
    await teclado.tab();
    expect(document.activeElement).toBe(chip('Anulados'));
    await teclado.keyboard('{Enter}');
    expect(chip('Anulados').getAttribute('aria-pressed')).toBe('true');
    await teclado.keyboard('{Enter}');
    expect(chip('Anulados').getAttribute('aria-pressed')).toBe('false');
    expect(estado().textContent).toBe('1 de 4 · 57 en total');
  });
});

describe('`filtrarLasFilas` y `conteoDelFiltro`: la regla, sin montar', () => {
  const filtro = MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA['filtro-en-el-cliente-con-conteo'].definicion.bloques[0].tablas[0].filtroLocal;
  const fila = (codigo: string, descripcion: string | null, estado?: string) => ({
    celdas: [codigo, { texto: descripcion }],
    ...(estado === undefined ? {} : { datos: new Map([['estado', estado]]) }),
  });
  const filas = [fila('A-1', 'Bodega', 'VIGENTE'), fila('A-2', null, 'ANULADO'), fila('A-3', 'Otra')];

  it('sin nada elegido, todas; unos blancos no son una busqueda', () => {
    expect(filtrarLasFilas(filtro, filas, SIN_FILTRO)).toEqual(filas);
    expect(filtrarLasFilas(filtro, filas, { busqueda: '   ', chips: [] })).toEqual(filas);
  });

  it('una celda sin dato no casa con nada, y un chip no mira el texto: una fila sin `datos` no pasa', () => {
    expect(filtrarLasFilas(filtro, filas, { busqueda: 'a-', chips: [] })).toHaveLength(3);
    expect(filtrarLasFilas(filtro, filas, { busqueda: 'null', chips: [] })).toEqual([]);
    expect(filtrarLasFilas(filtro, filas, { busqueda: '', chips: [0] }).map((f) => f.celdas[0])).toEqual(['A-1']);
  });

  it('busca solo en las `columnas` que la definicion dice', () => {
    const soloLaPrimera = { ...filtro, buscador: { rotulo: 'B', columnas: [0] } };
    expect(filtrarLasFilas(soloLaPrimera, filas, { busqueda: 'bodega', chips: [] })).toEqual([]);
  });

  it('el total es el que dio el sistema, o ninguno', () => {
    expect(conteoDelFiltro(1, 3, '57')).toEqual({ visibles: 1, recibidas: 3, total: '57' });
    for (const noEsUnTotal of [undefined, null, '', true]) {
      expect(conteoDelFiltro(1, 3, noEsUnTotal)).toEqual({ visibles: 1, recibidas: 3 });
    }
  });
});

// ── H21 · `tablas-grandes` ─────────────────────────────────────────────────────────────────────

describe('`tablas-grandes` (H21, AC-3): con 54 129 filas se monta UNA pagina', () => {
  const { definicion } = MUESTRAS_DE_LAS_TABLAS['tablas-grandes'];
  const CUANTAS = 54_129;
  const sinteticas: readonly FilaDeLaTabla[] = Array.from({ length: CUANTAS }, (_, i) => ({
    clave: String(i),
    celdas: [`C-${String(i)}`, '1.00'],
  }));

  it('cuenta los `<tr>` y no pasan del tamano, aunque lleguen 54 129', () => {
    montaEnUnFormulario(definicion, { tablas: tablas('catalogo', sinteticas) });
    expect(cuerpo()).toHaveLength(100);
    // La primera de la primera pagina, y NO la ultima de las 54 129.
    expect(screen.getByText('C-0')).toBeTruthy();
    expect(screen.queryByText(`C-${String(CUANTAS - 1)}`)).toBeNull();
  });

  it('el conteo cuenta TODAS y no la pagina: una tabla de 54 129 filas no tiene 100', () => {
    montaEnUnFormulario(definicion, { tablas: tablas('catalogo', sinteticas) });
    expect(screen.getByText(TEXTOS_DEL_INTERPRETE.registros(CUANTAS))).toBeTruthy();
    expect(screen.queryByText(TEXTOS_DEL_INTERPRETE.registros(100))).toBeNull();
  });

  it('la ultima pagina dice que no hay mas, y una pagina de mas alla del final se acota a la ultima', () => {
    const ultima = Math.ceil(CUANTAS / 100);
    const { container } = montaEnUnFormulario(definicion, { tablas: tablas('catalogo', sinteticas) });
    expect(container.querySelector('[data-slot="indicador-de-pagina"]')?.textContent).toBe(
      TEXTOS_DE_LAS_PIEZAS.paginaDe(1, ultima),
    );
    // La cuenta pura, sin montar: es donde se puede ejercitar el borde sin 542 renderizados.
    const pagina = paginaDeLaTabla({ en: 'cliente', enLaRuta: 'pagina', tamano: 100 }, { pagina: '9999', tamano: null }, {}, CUANTAS);
    expect(pagina.pagina).toBe(ultima - 1);
    expect(pagina.hayMas).toBe(false);
    expect(pagina.recorte).toEqual({ desde: (ultima - 1) * 100, hasta: ultima * 100 });
  });

  it('el tamano se elige, y elegir otro vuelve a la primera: la 7 de 20 no es la 7 de 100', () => {
    const cambios: CambioDeLaRuta[] = [];
    const conTamano: Definicion = conTabla({
      titulo: 'Catalogo',
      clave: 'catalogo',
      columnas: [
        { rotulo: 'Codigo', alineadoDerecha: false },
        { rotulo: 'Valor', alineadoDerecha: true },
      ],
      vacio: 'El catalogo esta vacio.',
      paginacion: { en: 'cliente', enLaRuta: 'pagina', tamano: 100, tamanos: [20, 100], tamanoEnLaRuta: 'tamano' },
    });
    const { container } = render(
      <ConHoja
        enUnFormulario
        inicial={{ sujeto: null, parametros: { pagina: '7' } }}
        cambios={cambios}
        definicion={conTamano}
        datos={{ ausencia: SIN_DATO, tablas: tablas('catalogo', sinteticas) }}
      />,
    );
    const nativo = container.querySelector('select');
    expect([...(nativo?.options ?? [])].map((o) => o.value)).toEqual(['20', '100']);
    fireEvent.change(nativo as HTMLSelectElement, { target: { value: '20' } });
    expect(cambios).toEqual([{ parametros: { tamano: '20', pagina: '0' } }]);
    expect(cuerpo()).toHaveLength(20);
  });

  it('LA CUENTA PURA: 54 129 filas, sin montar ninguna', () => {
    const pagina = paginaDeLaTabla({ en: 'cliente', enLaRuta: 'p', tamano: 100 }, { pagina: '0', tamano: null }, {}, CUANTAS);
    expect(pagina.paginas).toBe(542);
    expect(pagina.hayMas).toBe(true);
    // Una lista vacia sigue teniendo UNA pagina: la que dice por que esta vacia.
    expect(paginaDeLaTabla({ en: 'cliente', enLaRuta: 'p', tamano: 100 }, { pagina: '0', tamano: null }, {}, 0).paginas).toBe(1);
  });

  it('lo que la ruta trae y no es un entero no se corrige a medias: la primera pagina y el tamano de la definicion', () => {
    for (const basura of ['-1', '2.5', 'ninguna', '', '0x10']) {
      const pagina = paginaDeLaTabla(
        { en: 'cliente', enLaRuta: 'p', tamano: 50 },
        { pagina: basura, tamano: basura },
        {},
        200,
      );
      expect(pagina, `«${basura}» se leyo como una pagina`).toMatchObject({ pagina: 0, tamano: 50 });
    }
    // Y el tamano CERO tampoco: dejaria la tabla sin filas, dividiendo por cero.
    expect(paginaDeLaTabla({ en: 'cliente', enLaRuta: 'p', tamano: 50 }, { pagina: '0', tamano: '0' }, {}, 200).tamano).toBe(50);
  });

  it('en SERVIDOR no se corta nada, y `hayMas` solo lo dice el servidor', () => {
    const servidor = { en: 'servidor', enLaRuta: 'p', tamano: 20, hayMas: 'hayMas' } as const;
    const sinDato = paginaDeLaTabla(servidor, { pagina: '3', tamano: null }, {}, 20);
    expect(sinDato.recorte, 'en servidor se corto una pagina que ya venia cortada').toBeUndefined();
    // Un dato que no llego NO afirma que haya mas.
    expect(sinDato.hayMas).toBe(false);
    expect(paginaDeLaTabla(servidor, { pagina: '0', tamano: null }, { hayMas: true }, 20).hayMas).toBe(true);
    expect(paginaDeLaTabla(servidor, { pagina: '0', tamano: null }, { hayMas: 'true' }, 20).hayMas).toBe(true);
  });
});

// ── H22a · `celda-nula-con-palabra-y-nota` ─────────────────────────────────────────────────────

describe('`celda-nula-con-palabra-y-nota` (H22a, AC-4): `null` se dice con palabra, nunca con blanco', () => {
  const { definicion, datos } = MUESTRAS_DE_LAS_TABLAS['celda-nula-con-palabra-y-nota'];

  it('dibuja la palabra de la definicion, y NO `""` ni `0`', () => {
    const { container } = montaEnUnFormulario(definicion, datos);
    const huecos = container.querySelectorAll('[data-celda-sin-dato]');
    expect(huecos).toHaveLength(1);
    expect(huecos[0]?.textContent).toBe('—');
    expect(huecos[0]?.textContent, 'una celda sin dato se dibujo con un cero').not.toBe('0');
    // La nota de LA CELDA gana a la de la tabla: es la que sabe por que falta esta.
    expect(huecos[0]?.getAttribute('title')).toBe('Llega como nulo: este tramo no tiene tope.');
  });

  it('sin nota propia, la de la tabla; y sin `sinDato` en la tabla, la palabra del saco', () => {
    const { container } = montaEnUnFormulario(definicion, {
      tablas: tablas('tramos', [{ celdas: ['0.00', { texto: null }] }]),
    });
    expect(container.querySelector('[data-celda-sin-dato]')?.getAttribute('title')).toBe(
      'Ninguna operacion publica este dato.',
    );

    const { container: pelada } = montaEnUnFormulario(
      conTabla({ titulo: 'T', clave: 't', columnas: [{ rotulo: 'A', alineadoDerecha: false }], vacio: 'v' }),
      { tablas: tablas('t', [{ celdas: [{ texto: null }] }]) },
    );
    const hueco = pelada.querySelector('[data-celda-sin-dato]');
    expect(hueco?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.celdaSinDato);
    expect(hueco?.getAttribute('title')).toBe(TEXTOS_DE_LAS_PIEZAS.porQueLaCeldaNoTieneDato);
  });

  it('una celda CON texto puede llevar su nota, y el texto no se traduce', () => {
    const traducidos: string[] = [];
    const { container } = montaEnUnFormulario(
      conTabla({ titulo: 'T', clave: 't', columnas: [{ rotulo: 'A', alineadoDerecha: false }], vacio: 'v' }),
      { tablas: tablas('t', [{ celdas: [{ texto: 'Sin tope', nota: 'Llega como nulo.' }] }]) },
      {
        traducir: (t) => {
          traducidos.push(t);
          return `«${t}»`;
        },
      },
    );
    const celda = container.querySelector('tbody td');
    expect(celda?.textContent).toBe('Sin tope');
    expect(celda?.getAttribute('title')).toBe('Llega como nulo.');
    expect(traducidos, 'se tradujo una celda, que es un dato').not.toContain('Sin tope');
    expect(traducidos, 'se tradujo la nota de una celda, que es un dato').not.toContain('Llega como nulo.');
  });

  it('LAS REGLAS PURAS: `null` es ausencia y una cadena es el dato, `""` incluido (como en #65)', () => {
    expect(textoDeLaCelda('A')).toBe('A');
    expect(textoDeLaCelda('')).toBe('');
    expect(textoDeLaCelda({ texto: null })).toBeNull();
    expect(textoDeLaCelda({ texto: 'A', nota: 'n' })).toBe('A');
    expect(notaDeLaCelda('A')).toBeUndefined();
    expect(notaDeLaCelda({ texto: null, nota: 'n' })).toBe('n');
  });
});

// ── H23 · `cabecera-con-campo-y-dominio` ───────────────────────────────────────────────────────

describe('`cabecera-con-campo-y-dominio` (H23): el campo del contrato y su dominio, sin traducir', () => {
  const { definicion, datos } = MUESTRAS_DE_LAS_TABLAS['cabecera-con-campo-y-dominio'];

  it('bajo el rotulo va el campo, y el dominio cuando la base lo acota', () => {
    const traducidos: string[] = [];
    const { container } = montaEnUnFormulario(definicion, datos, {
      traducir: (t) => {
        traducidos.push(t);
        return `«${t}»`;
      },
    });
    const campos = [...container.querySelectorAll('[data-slot="campo-de-la-columna"] > code')].map((c) => c.textContent);
    expect(campos).toEqual(['partida', 'categoria', 'valor']);
    const dominios = [...container.querySelectorAll('[data-slot="dominio-de-la-columna"]')].map((d) => d.textContent);
    // Solo las dos que lo declaran: `valor` no tiene dominio, y no se inventa uno.
    expect(dominios).toEqual(['A · B · C', 'A … J']);
    for (const codigo of ['partida', 'categoria', 'valor', 'A · B · C', 'A … J']) {
      expect(traducidos, `se tradujo «${codigo}», que es codigo`).not.toContain(codigo);
    }
    expect(traducidos).toContain('Partida');
  });

  it('N5: la ETIQUETA de un campo lo lleva igual, y el nombre accesible del control los junta', () => {
    const { container } = montaEnUnFormulario(definicion, datos);
    expect(container.querySelector('[data-slot="campo-del-contrato"]')?.textContent).toBe('registroId');
    expect(screen.getByLabelText('Registro registroId')).toBeTruthy();
  });

  it('una columna sin `campo` no dibuja ninguno, y ninguna lleva `aria-sort` sin `orden`', () => {
    const { container } = montaEnUnFormulario(
      conTabla({ titulo: 'T', clave: 't', columnas: [{ rotulo: 'A', alineadoDerecha: false }], vacio: 'v' }),
      { tablas: tablas('t', [{ celdas: ['1'] }]) },
    );
    expect(container.querySelectorAll('[data-slot="campo-de-la-columna"]')).toHaveLength(0);
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBeNull();
  });
});

// ── H26 · `vacio-con-su-salida` ────────────────────────────────────────────────────────────────

describe('`vacio-con-su-salida` (H26): el vacio lleva su boton dentro', () => {
  const { definicion, datos } = MUESTRAS_DE_LAS_TABLAS['vacio-con-su-salida'];

  it('el titulo, la frase y la salida, dentro del vacio y FUERA de la tabla', () => {
    const { container } = montaEnUnFormulario(definicion, datos);
    const vacio = container.querySelector('[data-vacio]');
    expect(vacio?.textContent).toContain('Ninguna version todavia');
    expect(vacio?.textContent).toContain('Lo siguiente es abrir la primera.');
    expect(vacio?.closest('table'), 'el vacio se conto como una fila').toBeNull();
    expect(within(vacio as HTMLElement).getByRole('button', { name: 'Abrir la primera version' })).toBeTruthy();
    // Y sigue sin inventarse un conteo de cero sobre una lista vacia (#65).
    expect(screen.queryByText(TEXTOS_DEL_INTERPRETE.registros(0))).toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
  });

  it('la salida ABRE el acto de la hoja, como cualquier accion de #66', () => {
    montaSuelta(definicion, datos, { actos: { abrir: () => {} } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la primera version' }));
    // El acto abierto: su tarjeta, con la observacion obligatoria de la regla 10.
    expect(screen.getByLabelText('Por que se abre')).toBeTruthy();
  });

  it('y sin quien la atienda sale IMPEDIDA con su motivo, como cualquier otra: nunca un boton mudo', () => {
    montaEnUnFormulario(definicion, datos);
    const salida = screen.getByRole('button', { name: 'Abrir la primera version' });
    expect(salida.getAttribute('aria-disabled')).toBe('true');
    expect(salida).toHaveAccessibleDescription(TEXTOS_DE_LAS_PIEZAS.sinQuienLoAtienda('abrir'));
  });

  it('`tablasSinVacio` acepta el vacio con salida, y un titulo vacio NO es un motivo', () => {
    expect(tablasSinVacio(definicion)).toEqual([]);
    const muda = conTabla({
      titulo: 'Muda',
      clave: 'muda',
      columnas: [{ rotulo: 'A', alineadoDerecha: false }],
      vacioConSalida: { titulo: '' },
    });
    expect(tablasSinVacio(muda)).toEqual(['muda']);
  });

  it('es un campo APARTE de `vacio` porque la union rompe a `caja`, y con los dos gana la salida', () => {
    // `caja` recorre sus definiciones metiendo `tabla.vacio` en una lista de cadenas
    // (`src/i18n/catalogo-de-claves.ts:64`): con `vacio: T | VacioDeLaTabla<T>` deja de compilar.
    // Aqui se fija que `vacio` sigue siendo un `Texto` a secas y que la salida es otro campo.
    const losDos = conTabla({
      titulo: 'T',
      clave: 't',
      columnas: [{ rotulo: 'A', alineadoDerecha: false }],
      vacio: 'la frase sola',
      vacioConSalida: { titulo: 'con su salida' },
    });
    const { container } = montaEnUnFormulario(losDos, { tablas: tablas('t', []) });
    const vacios = container.querySelectorAll('[data-vacio]');
    expect(vacios, 'se dibujaron los dos vacios a la vez').toHaveLength(1);
    expect(vacios[0]?.textContent).toBe('con su salida');
  });
});

// ── H34 · `filas-de-contenido-que-viajan` ──────────────────────────────────────────────────────

describe('`filas-de-contenido-que-viajan` (H34): las filas que SON el texto de la pantalla', () => {
  const { definicion, datos } = MUESTRAS_DE_LAS_TABLAS['filas-de-contenido-que-viajan'];

  it('se dibujan SIN ningun dato, y pasan por `traducir` como cualquier frase', () => {
    montaEnUnFormulario(definicion, datos, { traducir: (t) => `«${t}»` });
    expect(cuerpo()).toHaveLength(2);
    expect(screen.getByText('«Algo que este sistema no publica»')).toBeTruthy();
  });

  it('NO dicen la ausencia: no hay ninguna operacion que las conteste, y no falta nada', () => {
    const { container } = montaEnUnFormulario(definicion, datos);
    expect(container.querySelector('p[data-sin-dato]'), 'unas filas que viajan dijeron que faltaba el dato').toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
    expect(screen.getByText(TEXTOS_DEL_INTERPRETE.registros(2))).toBeTruthy();
  });

  it('`tablasSinVacio` no les exige un vacio: una tabla que no lee datos no puede llegar vacia', () => {
    expect(tablasSinVacio(definicion)).toEqual([]);
  });
});

// ── El centinela ───────────────────────────────────────────────────────────────────────────────

describe('las muestras de #61 son las de `HUECOS.md`, y se dibujan', () => {
  const LOS_SEIS = [
    'paginacion-y-orden-en-el-servidor',
    'tablas-grandes',
    'celda-nula-con-palabra-y-nota',
    'cabecera-con-campo-y-dominio',
    'vacio-con-su-salida',
    'filas-de-contenido-que-viajan',
  ];

  it('EL CENTINELA: estan los seis huecos de esta serie, ni uno menos ni uno de mas', () => {
    expect(Object.keys(MUESTRAS_DE_LAS_TABLAS).sort()).toEqual([...LOS_SEIS].sort());
  });

  it('NINGUNA clave es una pieza local de `catastro`: la subida es ADITIVA (catastro#144)', () => {
    // `las-piezas-locales-son-las-de-huecos` de `catastro` lee las claves de todo `MUESTRAS…` de
    // este directorio y sale roja si alguna coincide con una de sus piezas. Las suyas son
    // `paginacion` y `orden`; ninguna de estas se llama asi, y por eso `catastro` sigue en verde.
    for (const suya of ['paginacion', 'orden', 'buscador', 'chips-de-filtro', 'descarga-de-documento']) {
      expect(Object.keys(MUESTRAS_DE_LAS_TABLAS), `«${suya}» rompe la guarda de catastro`).not.toContain(suya);
    }
  });

  it.each(Object.entries(MUESTRAS_DE_LAS_TABLAS))('«%s» se dibuja sin avisos de costura rota', (_hueco, muestra) => {
    const { container } = montaEnUnFormulario(muestra.definicion, muestra.datos);
    expect(container.querySelector('[data-pieza-sin-registrar]')).toBeNull();
    expect(container.querySelector('[data-lectura-sin-estado]')).toBeNull();
    expect(container.querySelector('[data-tabla-sin-motivo]')).toBeNull();
  });
});

describe('`cambiosEn`: varios sitios de la ruta en UN solo movimiento', () => {
  it('reparte el sujeto y los parametros, y no escribe lo que no le dan', () => {
    expect(cambiosEn({ pagina: '0', ordenarPor: 'anno' })).toEqual({ parametros: { pagina: '0', ordenarPor: 'anno' } });
    expect(cambiosEn({ sujeto: 'R-1' })).toEqual({ sujeto: 'R-1' });
    expect(cambiosEn({ sujeto: null, pagina: '0' })).toEqual({ sujeto: null, parametros: { pagina: '0' } });
    expect(cambiosEn({})).toEqual({});
  });
});
