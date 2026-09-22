import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import type { DatosDeLaPantalla } from './datos.ts';
import type { HojaDelMarco, LoTecleado } from './hoja.ts';
import { MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA as MUESTRAS } from './muestras-de-los-campos-los-actos-y-la-prosa.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDeActo } from './tipos-de-los-actos.ts';
import type { DefinicionDePantalla, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Los huecos de #86 del lado del interprete**: la hoja sucia, lo tecleado, los campos, los actos y
 * su prosa.
 *
 * Cada `describe` es un hueco de `normativa/frontend/diseno/HUECOS.md`, y cada uno prueba las DOS
 * mitades: con el dato opcional hace lo que el hueco pide, y **sin el dato la hoja es la de antes de
 * #86** —que es lo que protege a los seis consumidores que la CI corre contra esta rama—.
 *
 * Lo que necesita el marco entero —irse por la barra de direcciones y volver— se prueba en
 * `shell/lo-tecleado-sobrevive.test.tsx`, con el `Armazon` de verdad. Aqui la hoja es una forma
 * escrita a mano, que es lo que `HojaDelMarco` permite.
 */

beforeAll(() => {
  // Los remiendos que Radix pide a jsdom: los de `actos.test.tsx`.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;
const T = TEXTOS_DE_LAS_PIEZAS;
const TEXTOS_DE_LAS_PIEZAS_Y_EL_INTERPRETE = { ...TEXTOS_DEL_INTERPRETE, ...TEXTOS_DE_LAS_PIEZAS };

const monta = (definicion: Definicion, datos: Partial<DatosDeLaPantalla> = {}, extra: Partial<PantallaProps> = {}) =>
  render(
    <Pantalla definicion={definicion} datos={{ ausencia: SIN_FRASE, ...datos }} tonoDeLaInsignia={() => 'ok'} {...extra} />,
  );

/** Una hoja escrita a mano: sin ruta, con la marca espiada. */
function hojaEspiada(): HojaDelMarco & { marcarSucia: ReturnType<typeof vi.fn>; marcarGuardada: ReturnType<typeof vi.fn> } {
  return {
    ruta: { sujeto: null, parametros: {} },
    moverLaRuta: () => {},
    marcarSucia: vi.fn(),
    marcarGuardada: vi.fn(),
  };
}

/**
 * Un marco de juguete que GUARDA lo tecleado, como el `Armazon`: el estado vive fuera de la
 * `<Pantalla>`, y desmontarla no lo pierde. `sucia` y lo guardado se ven desde la prueba.
 */
function MarcoQueGuarda({
  definicion,
  montada,
  almacen,
  extra = {},
}: {
  readonly definicion: Definicion;
  readonly montada: boolean;
  readonly almacen: { tecleado?: LoTecleado | undefined; llamadas: number };
  readonly extra?: Partial<PantallaProps>;
}) {
  const [tecleado, setTecleado] = useState<LoTecleado | undefined>(almacen.tecleado);
  const hoja: HojaDelMarco = {
    ruta: { sujeto: null, parametros: {} },
    moverLaRuta: () => {},
    tecleado,
    alTeclear: (cambio) => {
      almacen.llamadas += 1;
      setTecleado((antes) => {
        const nuevo = cambio(antes);
        almacen.tecleado = nuevo;
        return nuevo;
      });
    },
  };
  return montada ? (
    <Pantalla definicion={definicion} datos={{ ausencia: SIN_FRASE }} tonoDeLaInsignia={() => 'ok'} hoja={hoja} {...extra} />
  ) : null;
}

const escribir = (rotulo: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
};

const valorDe = (rotulo: string) => (screen.getByLabelText(rotulo) as HTMLInputElement).value;

/** Lo que `aria-describedby` nombra, que es lo que un lector de pantalla lee al enfocarlo. */
function descripcionDe(elemento: HTMLElement): string {
  return (elemento.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent ?? `«${id} no existe»`)
    .join(' ');
}

// ── Grupo A ─────────────────────────────────────────────────────────────────────────────────────

describe('`la-hoja-se-marca-sucia-al-teclear` (H38)', () => {
  const { definicion } = MUESTRAS['la-hoja-se-marca-sucia-al-teclear'];
  const sinElDato: Definicion = { instruccion: definicion.instruccion, bloques: definicion.bloques };

  it('SIN el dato, la hoja no se marca: ni con una hoja que traiga `marcarSucia` (como antes de #86)', () => {
    const hoja = hojaEspiada();
    const alEnsuciar = vi.fn();
    monta(sinElDato, {}, { hoja, alEnsuciar });
    escribir('Apunte', 'a');
    escribir('Apunte', 'ab');
    expect(hoja.marcarSucia).not.toHaveBeenCalled();
    // Y el aviso de siempre, igual: una vez.
    expect(alEnsuciar).toHaveBeenCalledTimes(1);
  });

  it('CON el dato, CADA cambio llama a `marcarSucia`: no solo la primera tecla', () => {
    const hoja = hojaEspiada();
    monta(definicion, {}, { hoja });
    escribir('Apunte', 'a');
    escribir('Apunte', 'ab');
    escribir('Apunte', 'abc');
    expect(hoja.marcarSucia).toHaveBeenCalledTimes(3);
  });

  it('un filtro de #94 sigue sin ensuciar: no es trabajo sin guardar', () => {
    const hoja = hojaEspiada();
    monta(
      {
        instruccion: '',
        hoja: { suciaAlTeclear: true },
        bloques: [{ titulo: 'B', nota: '', campos: [{ etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'q' } }] }],
      },
      {},
      { hoja },
    );
    escribir('Buscar', 'bodega');
    expect(hoja.marcarSucia).not.toHaveBeenCalled();
  });

  it('guardar un acto la deja LIMPIA y VACIA, y la siguiente tecla la vuelve a ensuciar', () => {
    const hoja = hojaEspiada();
    const alEnsuciar = vi.fn();
    monta(definicion, {}, { hoja, alEnsuciar, actos: { registrar: () => {} } });
    escribir('Apunte', 'primer apunte');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar el apunte' }));
    escribir('Texto', 'uno');
    escribir('Observacion', 'Porque si.');
    const antes = hoja.marcarSucia.mock.calls.length;
    expect(antes, 'el acto tambien ensucia, en cada cambio').toBe(3);

    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar el apunte' }).at(-1) as HTMLElement);
    expect(hoja.marcarGuardada, 'guardar no limpio la hoja').toHaveBeenCalledTimes(1);
    expect(valorDe('Apunte'), 'guardar no vacio lo tecleado').toBe('');

    escribir('Apunte', 'segundo apunte');
    expect(hoja.marcarSucia, 'tras guardar, la hoja ya no se ensucia').toHaveBeenCalledTimes(antes + 1);
    // El bloque, el acto —una vez por apertura, como desde #66— y el bloque otra vez tras guardar.
    expect(alEnsuciar, 'tras guardar, el aviso de siempre no vuelve a salir').toHaveBeenCalledTimes(3);
  });

  it('TECLADO: lo que se teclea con el teclado ensucia en cada tecla', async () => {
    const teclado = userEvent.setup({ delay: null });
    const hoja = hojaEspiada();
    monta(definicion, {}, { hoja });
    await teclado.tab(); // la accion del bloque
    await teclado.tab(); // Apunte
    expect(document.activeElement).toBe(screen.getByLabelText('Apunte'));
    await teclado.keyboard('abc');
    expect(hoja.marcarSucia).toHaveBeenCalledTimes(3);
  });
});

describe('`lo-tecleado-y-la-negativa-sobreviven` (H35b): lo tecleado vive donde la hoja diga', () => {
  const { definicion } = MUESTRAS['lo-tecleado-y-la-negativa-sobreviven'];
  const sinElDato: Definicion = { instruccion: definicion.instruccion, bloques: definicion.bloques };

  it('CON el dato y una hoja que guarda, lo tecleado sobrevive a desmontar la pantalla', () => {
    const almacen: { tecleado?: LoTecleado | undefined; llamadas: number } = { llamadas: 0 };
    const { rerender } = render(<MarcoQueGuarda definicion={definicion} montada almacen={almacen} />);
    escribir('Apunte', 'lo escrito');
    rerender(<MarcoQueGuarda definicion={definicion} montada={false} almacen={almacen} />);
    rerender(<MarcoQueGuarda definicion={definicion} montada almacen={almacen} />);
    expect(valorDe('Apunte')).toBe('lo escrito');
  });

  it('y lo de un acto abierto tambien —valores, observacion e intento—; la negativa NO: es del sistema', () => {
    const almacen: { tecleado?: LoTecleado | undefined; llamadas: number } = { llamadas: 0 };
    const extra = { actos: { corregir: () => Promise.reject(new Error('409')) } };
    const { rerender } = render(<MarcoQueGuarda definicion={definicion} montada almacen={almacen} extra={extra} />);
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    escribir('Codigo', 'R-7');
    escribir('Observacion', 'abc');
    // Pulsado impedido: cuenta como primer intento, y la observacion ya dice su error.
    fireEvent.click(screen.getAllByRole('button', { name: 'Corregir el registro' }).at(-1) as HTMLElement);
    expect(screen.getByLabelText('Observacion').getAttribute('aria-invalid')).toBe('true');

    rerender(<MarcoQueGuarda definicion={definicion} montada={false} almacen={almacen} extra={extra} />);
    rerender(<MarcoQueGuarda definicion={definicion} montada almacen={almacen} extra={extra} />);
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    expect(valorDe('Codigo')).toBe('R-7');
    expect(valorDe('Observacion')).toBe('abc');
    expect(screen.getByLabelText('Observacion').getAttribute('aria-invalid'), 'el intento no sobrevivio').toBe('true');
    expect(Object.keys(almacen.tecleado?.actos ?? {})).toEqual(['corregir|{}']);
  });

  it('SIN el dato, la hoja no guarda nada aunque sepa: lo tecleado muere con la pantalla, como antes de #86', () => {
    const almacen: { tecleado?: LoTecleado | undefined; llamadas: number } = { llamadas: 0 };
    const { rerender } = render(<MarcoQueGuarda definicion={sinElDato} montada almacen={almacen} />);
    escribir('Apunte', 'lo escrito');
    expect(almacen.llamadas, 'sin el dato se escribio en la hoja').toBe(0);
    rerender(<MarcoQueGuarda definicion={sinElDato} montada={false} almacen={almacen} />);
    rerender(<MarcoQueGuarda definicion={sinElDato} montada almacen={almacen} />);
    expect(valorDe('Apunte')).toBe('');
  });

  it('CON el dato pero sin una hoja que guarde, en la pantalla: la muestra se monta igual fuera del marco', () => {
    const { unmount } = monta(definicion);
    escribir('Apunte', 'lo escrito');
    expect(valorDe('Apunte')).toBe('lo escrito');
    unmount();
    monta(definicion);
    expect(valorDe('Apunte')).toBe('');
  });
});

describe('`descartar-lo-escrito` (H48)', () => {
  const { definicion } = MUESTRAS['descartar-lo-escrito'];
  const acto = definicion.bloques[0] as DefinicionDeActo;
  const sinElDato: Definicion = { instruccion: '', bloques: [{ ...acto, descartar: undefined }] };
  const abierto = { actoAbierto: { clave: 'alta' } } as const;

  it('SIN el dato, el pie del acto es el de siempre: sin boton y sin region viva', () => {
    const { container } = monta(sinElDato, {}, { ...abierto, actos: { alta: () => {} } });
    expect(screen.queryByRole('button', { name: 'Descartar lo escrito' })).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('CON el dato: vacia valores, observacion, intento y rechazo, y LO DICE en una region viva', async () => {
    const hoja = hojaEspiada();
    const { container } = monta(definicion, {}, { ...abierto, hoja, actos: { alta: () => Promise.reject(new Error('409')) } });
    const region = container.querySelector('[role="status"]');
    expect(region, 'la region viva tiene que existir ANTES de decir nada').not.toBeNull();
    expect(region?.textContent).toBe('');

    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));
      await Promise.resolve();
    });
    expect(container.querySelector('[data-rechazo-sin-fallo="alta"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar lo escrito' }));
    expect(valorDe('Codigo')).toBe('');
    expect(valorDe('Observacion')).toBe('');
    expect(container.querySelector('[data-rechazo-sin-fallo]'), 'el rechazo sobrevivio al descarte').toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Se descarto lo escrito en el alta.');
    expect(hoja.marcarGuardada, 'lo del acto era lo unico tecleado: la hoja queda limpia').toHaveBeenCalledTimes(1);
    // Y el intento: la observacion vacia ya no se pinta en rojo.
    expect(screen.getByLabelText('Observacion').getAttribute('aria-invalid')).toBeNull();

    // La siguiente tecla calla la region: ya no es verdad que este como al abrirlo.
    escribir('Codigo', 'G');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('sin `dicho`, la frase del saco', () => {
    monta({ instruccion: '', bloques: [{ ...acto, descartar: { rotulo: 'Descartar lo escrito' } }] }, {}, abierto);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar lo escrito' }));
    expect(screen.getByRole('status').textContent).toBe(T.loEscritoSeDescarto);
  });

  it('NO da la hoja por limpia si queda algo tecleado en un bloque', () => {
    const hoja = hojaEspiada();
    monta(
      { instruccion: '', bloques: [{ titulo: 'B', nota: '', campos: [{ etiqueta: 'Apunte', tipo: 't' }] }, acto] },
      {},
      { ...abierto, hoja },
    );
    escribir('Apunte', 'sigue escrito');
    escribir('Codigo', 'G-01');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar lo escrito' }));
    expect(valorDe('Codigo')).toBe('');
    expect(valorDe('Apunte')).toBe('sigue escrito');
    expect(hoja.marcarGuardada).not.toHaveBeenCalled();
  });

  it('mientras la escritura viaja, impedido CON su motivo —el del primario—, y nunca `disabled`', () => {
    monta(definicion, {}, { ...abierto, actos: { alta: () => new Promise(() => {}) } });
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));
    const boton = screen.getByRole('button', { name: 'Descartar lo escrito' });
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    expect((boton as HTMLButtonElement).disabled).toBe(false);
    expect(descripcionDe(boton)).toBe(T.escribiendo);
    fireEvent.click(boton);
    expect(valorDe('Codigo'), 'descarto un formulario en vuelo').toBe('G-01');
  });

  it('TECLADO: Tab llega a «Descartar» despues del primario, y Enter descarta', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, {}, { ...abierto, actos: { alta: () => {} } });
    await teclado.tab(); // Cerrar
    await teclado.tab(); // Codigo
    await teclado.keyboard('G-01');
    await teclado.tab(); // Observacion
    await teclado.tab(); // el primario
    await teclado.tab(); // Descartar
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Descartar lo escrito' }));
    await teclado.keyboard('{Enter}');
    expect(valorDe('Codigo')).toBe('');
    expect(screen.getByRole('status').textContent).toBe('Se descarto lo escrito en el alta.');
  });
});

// ── Grupo B ─────────────────────────────────────────────────────────────────────────────────────

/** La marca «(opcional)» dentro del rotulo de un campo, buscada por su rotulo. */
function marcadoOpcional(rotulo: string): boolean {
  const etiqueta = [...document.querySelectorAll('[data-slot="etiqueta"]')].find(
    (e) => e.querySelector('label span')?.textContent === rotulo,
  );
  if (etiqueta === undefined) throw new Error(`No hay ningun campo «${rotulo}».`);
  return etiqueta.querySelector('label')?.textContent?.includes(TEXTOS_DE_LAS_PIEZAS_Y_EL_INTERPRETE.opcional) === true;
}

describe('`obligatorio-u-opcional-por-campo` (H05b): «(opcional)» es un dato, no una palabra de la ayuda', () => {
  const { definicion } = MUESTRAS['obligatorio-u-opcional-por-campo'];

  it('se marca por el DATO, en lo que se teclea y en una lista; lo obligatorio no se marca', () => {
    monta(definicion);
    expect(marcadoOpcional('Alias')).toBe(true);
    expect(marcadoOpcional('Categoria')).toBe(true);
    expect(marcadoOpcional('Codigo')).toBe(false);
  });

  it('una ayuda que DICE «opcional» ya no marca nada: la regla vieja la marcaba, y «no es opcional» tambien', () => {
    monta({
      instruccion: '',
      bloques: [
        {
          titulo: 'B',
          nota: '',
          campos: [
            { etiqueta: 'Uno', tipo: '', ayuda: 'Es opcional.' },
            { etiqueta: 'Otro', tipo: '', ayuda: 'No es opcional: sin el no se envia.' },
          ],
        },
      ],
    });
    expect(marcadoOpcional('Uno'), 'la ayuda volvio a decidir la marca').toBe(false);
    expect(marcadoOpcional('Otro'), 'la ayuda volvio a decidir la marca').toBe(false);
  });

  it('en un acto, el MISMO dato decide la marca y si se puede enviar en blanco', () => {
    monta(definicion, {}, { actoAbierto: { clave: 'alta' }, actos: { alta: () => {} } });
    const acto = document.querySelector('[data-acto="alta"]') as HTMLElement;
    const alias = [...acto.querySelectorAll('[data-slot="etiqueta"]')].find((e) => e.textContent?.startsWith('Alias'));
    expect(alias?.textContent).toContain(TEXTOS_DE_LAS_PIEZAS_Y_EL_INTERPRETE.opcional);
    // Y lo que falta rellenar no lo nombra: es el mismo `opcional`.
    const primario = acto.querySelector('button[type="submit"]') as HTMLElement;
    expect(descripcionDe(primario)).toBe(T.faltaRellenar(['Codigo']));
  });
});

describe('`errores-tras-el-primer-intento` (H07)', () => {
  const { definicion } = MUESTRAS['errores-tras-el-primer-intento'];
  const acto = definicion.bloques[0] as DefinicionDeActo;
  const sinElDato: Definicion = { instruccion: '', bloques: [{ ...acto, errores: undefined }] };
  const abierto = { actoAbierto: { clave: 'alta' }, actos: { alta: () => {} } } as const;
  const primarioDelActo = () => screen.getByRole('button', { name: 'Dar de alta' });

  it('ANTES del primer intento, nada en rojo', () => {
    monta(definicion, {}, abierto);
    for (const rotulo of ['Codigo', 'Nombre', 'Alias', 'Observacion']) {
      expect(screen.getByLabelText(new RegExp(`^${rotulo}`)).getAttribute('aria-invalid'), rotulo).toBeNull();
    }
  });

  it('TRAS el primer intento, cada obligatorio vacio dice SU error —el propio o el del saco—, y el opcional no', () => {
    monta(definicion, {}, abierto);
    fireEvent.click(primarioDelActo());
    const codigo = screen.getByLabelText('Codigo');
    const nombre = screen.getByLabelText('Nombre');
    expect(codigo.getAttribute('aria-invalid')).toBe('true');
    expect(descripcionDe(codigo)).toBe('Falta el codigo del grupo.');
    expect(nombre.getAttribute('aria-invalid')).toBe('true');
    expect(descripcionDe(nombre)).toBe(T.campoObligatorio);
    expect(screen.getByLabelText(/^Alias/).getAttribute('aria-invalid')).toBeNull();

    // Relleno, el error se va: se mira lo de ahora, no lo del intento.
    escribir('Codigo', 'G-01');
    expect(codigo.getAttribute('aria-invalid')).toBeNull();
    expect(nombre.getAttribute('aria-invalid')).toBe('true');
  });

  it('SIN el dato, como desde #66: tras el intento solo la observacion dice su error bajo el campo', () => {
    monta(sinElDato, {}, abierto);
    fireEvent.click(primarioDelActo());
    expect(screen.getByLabelText('Codigo').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByLabelText('Observacion').getAttribute('aria-invalid')).toBe('true');
  });

  it('TECLADO: Enter sobre el primario impedido cuenta como intento, y los errores salen', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, {}, abierto);
    act(() => {
      primarioDelActo().focus();
    });
    await teclado.keyboard('{Enter}');
    expect(screen.getByLabelText('Codigo').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('`ayuda-en-un-campo-de-solo-lectura` (H50)', () => {
  const { definicion, datos } = MUESTRAS['ayuda-en-un-campo-de-solo-lectura'];

  it('se dibuja bajo el dato, y el dato la anuncia con `aria-describedby`', () => {
    monta(definicion, datos);
    const dato = document.querySelector('[data-slot="dato"]') as HTMLElement;
    expect(dato.textContent).toBe('1200.00');
    expect(descripcionDe(dato)).toBe('La calcula el servidor con la tabla vigente: aqui no se corrige.');
  });

  it('SIN ayuda, el campo de solo lectura es el de siempre: ni linea ni `aria-describedby`', () => {
    const { container } = monta({ instruccion: '', bloques: [{ titulo: 'B', nota: '', campos: [{ etiqueta: 'Base', tipo: 'r' }] }] });
    expect(container.querySelector('[data-slot="ayuda"]')).toBeNull();
    expect(container.querySelector('[data-slot="dato"]')?.getAttribute('aria-describedby')).toBeNull();
  });
});

// ── El centinela ───────────────────────────────────────────────────────────────────────────────

describe('LAS MUESTRAS DE #86: una por hueco, y todas se dibujan', () => {
  const ESTA_TANDA = [
    'la-hoja-se-marca-sucia-al-teclear',
    'lo-tecleado-y-la-negativa-sobreviven',
    'descartar-lo-escrito',
    'obligatorio-u-opcional-por-campo',
    'errores-tras-el-primer-intento',
    'ayuda-en-un-campo-de-solo-lectura',
  ];

  it('EL CENTINELA: estan los huecos de esta tanda, ni uno menos ni uno de mas', () => {
    expect(Object.keys(MUESTRAS).sort()).toEqual([...ESTA_TANDA].sort());
  });

  it('NINGUNA clave es una pieza local de `catastro`: la subida es ADITIVA', () => {
    for (const suya of ['paginacion', 'orden', 'buscador', 'chips-de-filtro', 'descarga-de-documento']) {
      expect(Object.keys(MUESTRAS), `«${suya}» rompe la guarda de catastro`).not.toContain(suya);
    }
  });

  it.each(Object.entries(MUESTRAS))('«%s» se dibuja, con sus actos abiertos', (_hueco, muestra) => {
    const piezas: readonly PiezaDeLaPantalla[] = muestra.definicion.bloques;
    const primerActo = piezas.find((pieza) => pieza.tipo === 'acto');
    const { container } = monta(muestra.definicion, muestra.datos, {
      ...(primerActo === undefined ? {} : { actoAbierto: { clave: primerActo.clave } }),
    });
    expect(container.textContent?.trim()).not.toBe('');
    expect(container.querySelector('button[disabled]'), 'un `disabled` mudo').toBeNull();
    expect(container.querySelector('[data-pieza-sin-registrar], [data-lectura-sin-estado]')).toBeNull();
  });
});
