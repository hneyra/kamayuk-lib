import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Avisos, avisar } from '../shadcn/avisos.tsx';
import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { datosQueLee } from './componer.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import type { HojaDelMarco, LoTecleado } from './hoja.ts';
import { MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA as MUESTRAS } from './muestras-de-los-campos-los-actos-y-la-prosa.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import { conteoDelFiltro, filtrarLasFilas, SIN_FILTRO } from './reglas-de-las-tablas.ts';
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
  // Y el de `sonner`, que la llama al resolver el modo `system`: medido en #13, ver `el-texto-propio-es-dato`.
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

// ── Grupo C ─────────────────────────────────────────────────────────────────────────────────────

describe('`aviso-efimero-tras-un-acto` (H37): `avisar`, con `<Avisos>` montado', () => {
  const { definicion } = MUESTRAS['aviso-efimero-tras-un-acto'];
  const acto = definicion.bloques[0] as DefinicionDeActo;
  const sinElDato: Definicion = { instruccion: '', bloques: [{ ...acto, alTerminar: undefined, alFallar: undefined }] };

  afterEach(() => {
    act(() => {
      avisar.dismiss();
    });
  });

  /** La pantalla con la region de avisos al lado, como la monta el marco. */
  const conAvisos = (def: Definicion, manejador: () => void | Promise<unknown>) =>
    render(
      <>
        <Pantalla
          definicion={def}
          datos={{ ausencia: SIN_FRASE }}
          tonoDeLaInsignia={() => 'ok'}
          actos={{ alta: manejador }}
          actoAbierto={{ clave: 'alta' }}
        />
        <Avisos />
      </>,
    );

  const rellenarYEnviar = async () => {
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));
      await Promise.resolve();
    });
  };

  it('aceptada la escritura, sale el aviso de `alTerminar`; y lo hecho se sigue diciendo en la tarjeta', async () => {
    const { container } = conAvisos(definicion, () => Promise.resolve());
    await rellenarYEnviar();
    expect(await screen.findByText('Grupo dado de alta.')).toBeTruthy();
    // El mismo selector con el que la prueba sin el dato afirma que NO hay aviso: aqui lo encuentra.
    expect(container.querySelector('[data-sonner-toast]')).not.toBeNull();
    expect(container.querySelector('[data-fase-del-acto="hecho"]')).not.toBeNull();
  });

  it('rechazada, el de `alFallar`', async () => {
    conAvisos(definicion, () => Promise.reject(new Error('409')));
    await rellenarYEnviar();
    expect(await screen.findByText('El alta no se completo: el motivo esta encima del formulario.')).toBeTruthy();
    expect(screen.queryByText('Grupo dado de alta.')).toBeNull();
  });

  it('SIN el dato, ningun aviso: la region de avisos se queda vacia, como antes de #86', async () => {
    const { container } = conAvisos(sinElDato, () => Promise.resolve());
    await rellenarYEnviar();
    expect(container.querySelector('[data-fase-del-acto="hecho"]')).not.toBeNull();
    expect(container.querySelector('[data-sonner-toast]'), 'salio un aviso que nadie pidio').toBeNull();
  });

  it('TECLADO: se envia con Enter sobre el primario, y el aviso sale igual', async () => {
    const teclado = userEvent.setup({ delay: null });
    conAvisos(definicion, () => Promise.resolve());
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    act(() => {
      screen.getByRole('button', { name: 'Dar de alta' }).focus();
    });
    await teclado.keyboard('{Enter}');
    expect(await screen.findByText('Grupo dado de alta.')).toBeTruthy();
  });
});

describe('`insignias-fijas-en-la-cabecera` (H42)', () => {
  const { definicion, datos } = MUESTRAS['insignias-fijas-en-la-cabecera'];
  const bloque = definicion.bloques[0];
  const sinElDato: Definicion = { instruccion: '', bloques: [{ ...bloque, insignias: undefined, aLaDerecha: undefined }] };

  it('SIN el dato, la cabecera es la de antes BYTE A BYTE', () => {
    const { container } = monta(sinElDato, datos);
    expect(container.querySelector('[data-slot="tarjeta-cabecera"]')?.outerHTML).toBe(
      '<div data-slot="tarjeta-cabecera" class="px-[15px] py-[11px] bg-azul text-sobre-azul">' +
        '<h2 class="m-0 text-[14.5px] font-bold">Detalle del registro</h2></div>',
    );
  });

  it('CON el dato, las insignias y el codigo van en la cabecera y FUERA del encabezado: su nombre no cambia', () => {
    const { container } = monta(definicion, datos);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Detalle del registro');
    expect(screen.getByRole('heading', { name: 'Detalle del registro' })).toBeTruthy();
    const cabecera = container.querySelector('[data-slot="tarjeta-cabecera"]') as HTMLElement;
    const junto = cabecera.querySelector('[data-slot="tarjeta-cabecera-junto"]') as HTMLElement;
    expect(junto.closest('h2')).toBeNull();
    expect([...junto.querySelectorAll('span.rounded-full')].map((i) => i.textContent)).toEqual(['Vigente', 'Solo lectura']);
    // El tono es el del dato, no el que diria el texto.
    expect(within(junto).getByText('Vigente').className).toContain('bg-ok-fondo');
    expect(within(junto).getByText('Solo lectura').className).toContain('bg-info-fondo');
    expect(junto.querySelector('[data-slot="codigo-de-la-cabecera"]')?.textContent).toBe('R-00042');
  });

  it('`tonoDeLaInsignia` NO se llama para ellas: el tono es dato de la definicion', () => {
    const tono = vi.fn(() => 'mal' as const);
    render(<Pantalla definicion={definicion} datos={datos} tonoDeLaInsignia={tono} />);
    expect(tono).not.toHaveBeenCalled();
  });

  it('TECLADO: no son mandos: el tabulador no se para en la cabecera', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta({ instruccion: '', bloques: [{ ...bloque, acciones: [{ rotulo: 'Volver a leer', hace: 'releer' }] }] }, datos, {
      alHacer: { releer: () => {} },
    });
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Volver a leer');
  });
});

// ── Grupo D ─────────────────────────────────────────────────────────────────────────────────────

describe('`texto-con-marcas` (H43, N6): `code` y `strong` dentro de la MISMA frase', () => {
  const { definicion, datos } = MUESTRAS['texto-con-marcas'];
  const bloque = definicion.bloques[0];
  const notaDelBloque = (container: HTMLElement) =>
    container.querySelector('[data-slot="tarjeta"]:not([data-acto]) [data-slot="tarjeta-nota"]') as HTMLElement;

  it('CON el dato: una sola nota, con el codigo en `<code>` y el enfasis en `<strong>`, en su orden', () => {
    const { container } = monta(definicion, datos);
    const nota = notaDelBloque(container);
    expect(nota.tagName).toBe('P');
    expect(nota.textContent).toBe('Lo impide fk_cita_registro: retirarlo no se deshace, y el registro sigue citado.');
    expect(nota.querySelector('code')?.textContent, 'el codigo salio como texto plano').toBe('fk_cita_registro');
    expect(nota.querySelector('strong')?.textContent).toBe('retirarlo no se deshace');
    // Los tramos van en la MISMA frase: ni un parrafo por tramo, ni una caja por el texto corrido.
    expect([...nota.children].map((hijo) => hijo.tagName)).toEqual(['CODE', 'STRONG']);
  });

  it('`traducir` pasa por el texto y el enfasis, y NUNCA por el codigo ni por el dato', () => {
    const { container } = monta(definicion, datos, { traducir: (t) => t.toUpperCase() });
    const nota = notaDelBloque(container);
    expect(nota.querySelector('code')?.textContent).toBe('fk_cita_registro');
    expect(nota.querySelector('strong')?.textContent).toBe('RETIRARLO NO SE DESHACE');
    expect(nota.textContent?.startsWith('LO IMPIDE ')).toBe(true);

    // Y un codigo ESCRITO en la definicion —no un dato— tampoco: es codigo, como un campo del contrato.
    const literal = monta(
      { instruccion: '', bloques: [{ titulo: 'B', nota: '', notaConMarcas: [{ texto: 'usa ' }, { codigo: 'fk_cita' }], campos: [] }] },
      {},
      { traducir: (t) => t.toUpperCase() },
    );
    const suya = literal.container.querySelector('[data-slot="tarjeta-nota"]') as HTMLElement;
    expect(suya.querySelector('code')?.textContent, 'el codigo paso por `traducir`').toBe('fk_cita');
    expect(suya.textContent).toBe('USA fk_cita');
  });

  it('un dato que no llego se escribe con la palabra del saco, tambien dentro de una marca', () => {
    const { container } = monta(definicion, {});
    expect(notaDelBloque(container).querySelector('code')?.textContent).toBe(T.datoAusente);
  });

  it('en un acto, igual: la plantilla del codigo se llena y la frase es una', () => {
    const { container } = monta(definicion, datos, { actoAbierto: { clave: 'retirar' } });
    const nota = container.querySelector('[data-acto="retirar"] [data-slot="tarjeta-nota"]') as HTMLElement;
    expect(nota.textContent).toBe('Se retira R-00042.');
    expect(nota.querySelector('code')?.textContent).toBe('R-00042');
  });

  it('SIN el dato, la nota es la de antes BYTE A BYTE; y con los dos, gana la de las marcas', () => {
    const conNota = (extra: object): Definicion => ({
      instruccion: '',
      bloques: [{ titulo: 'B', nota: 'Una nota sin marcas.', campos: [], ...extra }],
    });
    const { container, unmount } = monta(conNota({}));
    expect(container.querySelector('[data-slot="tarjeta-nota"]')?.outerHTML).toBe(
      '<p data-slot="tarjeta-nota" class="m-0 px-[15px] py-[11px] border-b border-linea-2 text-[13px] leading-[1.55] text-tinta-2 max-w-[80ch] text-pretty">' +
        'Una nota sin marcas.</p>',
    );
    unmount();
    const otra = monta(conNota({ notaConMarcas: [{ fuerte: 'La de las marcas.' }] }));
    expect(otra.container.querySelector('[data-slot="tarjeta-nota"]')?.innerHTML).toBe(
      '<strong data-slot="marca-fuerte" class="font-bold text-tinta">La de las marcas.</strong>',
    );
  });

  it('`datosQueLee` nombra lo que se lee DENTRO de una marca: sin eso, nadie lo pediria', () => {
    expect(datosQueLee(bloque.notaConMarcas)).toEqual(['restriccion']);
    const acto = definicion.bloques[1] as DefinicionDeActo;
    expect(datosQueLee(acto.notaConMarcas ?? [])).toEqual(['registroId']);
    // Y las cuatro formas de `Texto`, como desde #66.
    expect(datosQueLee('fija')).toEqual([]);
    expect(datosQueLee({ desde: 'a' })).toEqual(['a']);
    expect(datosQueLee({ segun: 'b', casos: {} })).toEqual(['b']);
    expect(datosQueLee({ plantilla: '{c} y {d.e}' })).toEqual(['c', 'd.e']);
  });

  it('TECLADO: las marcas no son mandos: el tabulador va de la accion al campo sin pararse en la nota', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, datos, { actos: { retirar: () => {} } });
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Retirar');
    await teclado.tab();
    expect(document.activeElement?.closest('[data-slot="tarjeta-nota"]')).toBeNull();
  });
});

// ── Grupo E ─────────────────────────────────────────────────────────────────────────────────────

describe('`filtro-en-el-cliente-con-conteo` (H02): acota lo que LLEGO, y dice cuantas deja', () => {
  const { definicion, datos } = MUESTRAS['filtro-en-el-cliente-con-conteo'];
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
    const grupo = screen.getByRole('group', { name: T.filtrarLaTabla('Registros de la pagina') });
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
    expect(estado().textContent).toBe(T.filasQueDejaElFiltro(2, 4, '57'));
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
    expect(otra.container.querySelector('[data-sin-coincidencias]')?.textContent).toBe(T.ningunaPasaElFiltro);
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
  const filtro = MUESTRAS['filtro-en-el-cliente-con-conteo'].definicion.bloques[0].tablas[0].filtroLocal;
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

// ── Grupo F ─────────────────────────────────────────────────────────────────────────────────────

describe('`guardar-como-archivo` (H30a): se guarda EL TEXTO QUE SE VERIFICO, y se dice si no se puede', () => {
  const { definicion, datos } = MUESTRAS['guardar-como-archivo'];
  const verificado = datos.nombrados.get('lectura.texto') as string;
  const guardar = () => screen.getByRole('button', { name: 'Guardar como archivo' });

  /** Lo que `entregarAlNavegador` hace, espiado como en `api/entregar.test.ts`: jsdom no descarga. */
  interface Entrega {
    readonly nombre: string;
    readonly contenido: Blob;
  }
  let entregas: Entrega[];
  let creadas: Blob[];
  const ORIGINALES = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
  const DESCARGA = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'download');

  beforeEach(() => {
    entregas = [];
    creadas = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      creadas.push(blob as Blob);
      return `blob:http://localhost/${String(creadas.length)}`;
    };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      entregas.push({ nombre: this.download, contenido: creadas.at(-1) as Blob });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = ORIGINALES.crear;
    URL.revokeObjectURL = ORIGINALES.revocar;
    if (DESCARGA !== undefined) Object.defineProperty(HTMLAnchorElement.prototype, 'download', DESCARGA);
  });

  /** Un navegador cuyo enlace no sabe `download`: el caso que `sinDescarga` dice. */
  const sinDescargaEnElNavegador = () => {
    Reflect.deleteProperty(HTMLAnchorElement.prototype, 'download');
    expect('download' in HTMLAnchorElement.prototype).toBe(false);
  };

  /** Lo que hay dentro del `Blob`, byte a byte, leido como texto. */
  const leer = (blob: Blob) =>
    new Promise<string>((si) => {
      const lector = new FileReader();
      lector.onload = () => {
        si(lector.result as string);
      };
      lector.readAsText(blob);
    });

  it('guarda el texto de `nombrados` TAL CUAL —`1.0`, el escape y el salto final—, con su tipo y su nombre', async () => {
    monta(definicion, datos);
    fireEvent.click(guardar());
    expect(entregas).toHaveLength(1);
    const [entrega] = entregas as [Entrega];
    expect(entrega.nombre).toBe('registro-00042.json');
    expect(entrega.contenido.type).toBe('application/json');
    expect(await leer(entrega.contenido), 'se guardo otro texto que el verificado').toBe(verificado);
  });

  it('el texto NO pasa por `traducir`: es un dato, y traducirlo lo cambia', async () => {
    monta(definicion, datos, { traducir: (t) => `«${t}»` });
    fireEvent.click(screen.getByRole('button', { name: '«Guardar como archivo»' }));
    // El rotulo y el nombre SI son frases de la definicion; el contenido, no.
    expect((entregas[0] as Entrega).nombre).toBe('«registro-00042.json»');
    expect(await leer((entregas[0] as Entrega).contenido)).toBe(verificado);
  });

  it('sin el texto todavia, impedido CON su motivo —nunca `disabled`— y pulsarlo no entrega nada', () => {
    monta(definicion, { ...datos, nombrados: new Map([['registroId', '00042']]) });
    expect(guardar().getAttribute('aria-disabled')).toBe('true');
    expect((guardar() as HTMLButtonElement).disabled).toBe(false);
    expect(descripcionDe(guardar())).toBe(T.faltaParaGuardar('lectura.texto'));
    fireEvent.click(guardar());
    expect(entregas).toEqual([]);
  });

  it('y sin el dato de su nombre, tampoco: se guardaria un archivo llamado «—»', () => {
    monta(definicion, { ...datos, nombrados: new Map([['lectura.texto', verificado]]) });
    expect(descripcionDe(guardar())).toBe(T.faltaParaGuardar('registroId'));
  });

  it('un navegador sin descarga lo DICE con `sinDescarga`, antes de pulsar; sin ella, con la frase del saco', () => {
    sinDescargaEnElNavegador();
    const { unmount } = monta(definicion, datos);
    expect(guardar().getAttribute('aria-disabled')).toBe('true');
    expect(descripcionDe(guardar()), '`sinDescarga` se quedo mudo').toBe(
      'Este navegador no guarda archivos: copie el texto desde la vista.',
    );
    fireEvent.click(guardar());
    expect(entregas).toEqual([]);
    unmount();

    const bloque = definicion.bloques[0];
    const [accion] = bloque.acciones;
    monta({ instruccion: '', bloques: [{ ...bloque, acciones: [{ ...accion, sinDescarga: undefined }] }] }, datos);
    expect(descripcionDe(guardar())).toBe(T.sinDescarga);
  });

  it('si la entrega revienta al pulsar, lo dice desde ese momento: nunca un boton que no hizo nada', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('el navegador rechazo la descarga');
    });
    monta(definicion, datos);
    fireEvent.click(guardar());
    expect(guardar().getAttribute('aria-disabled')).toBe('true');
    expect(descripcionDe(guardar())).toBe('Este navegador no guarda archivos: copie el texto desde la vista.');
  });

  it('SIN la accion, las de siempre no cambian: el mismo grupo, y nada se entrega', () => {
    const { container } = monta(
      { instruccion: '', bloques: [{ titulo: 'B', nota: '', campos: [], acciones: [{ rotulo: 'Volver a leer', hace: 'releer' }] }] },
      {},
      { alHacer: { releer: () => {} } },
    );
    expect(container.querySelector('[data-slot="grupo-de-acciones"]')?.outerHTML).toBe(
      '<div data-slot="grupo-de-acciones" class="flex flex-col gap-[6px]"><div class="flex flex-wrap items-center gap-2">' +
        (container.querySelector('[data-accion="hace:releer"]')?.outerHTML ?? '«no hay boton»') +
        '</div></div>',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Volver a leer' }));
    expect(creadas).toEqual([]);
  });

  it('TECLADO: Tab llega al boton, y Enter guarda', async () => {
    const teclado = userEvent.setup({ delay: null });
    monta(definicion, datos);
    await teclado.tab();
    expect(document.activeElement).toBe(guardar());
    await teclado.keyboard('{Enter}');
    expect(entregas).toHaveLength(1);
    expect(await leer((entregas[0] as Entrega).contenido)).toBe(verificado);
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
    'aviso-efimero-tras-un-acto',
    'insignias-fijas-en-la-cabecera',
    'texto-con-marcas',
    'filtro-en-el-cliente-con-conteo',
    'guardar-como-archivo',
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
