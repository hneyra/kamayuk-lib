import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { claseDe, motivoDelActo, peticionDe, valoresQueViajan } from './acciones.ts';
import type { DatosDeLaPantalla, EstadoDeUnaLectura } from './datos.ts';
import { MUESTRAS_DE_LOS_ACTOS } from './muestras.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDeAccion, DefinicionDeActo, EnvioDeUnActo, NavegacionDeLaPantalla } from './tipos-de-los-actos.ts';
import type { DefinicionDePantalla, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Los cinco huecos de #66: lo que una hoja HACE.**
 *
 * Cada `describe` es un hueco de `HUECOS.md`. Las definiciones son neutras —un grupo, un registro—
 * por lo mismo que en `piezas.test.tsx`: una prueba de la libreria escrita con las palabras de un
 * sistema es la API de ese sistema con otro nombre.
 *
 * <h2>Las tres roturas del issue salen rojas aqui</h2>
 *
 *   · **enviar un acto sin observacion** — `no envia SIN observacion, y dice por que`;
 *   · **un impedimento sin motivo** — `aria-disabled, sigue en el tabulador y describe con el motivo
 *     VISIBLE` (y la barrera de tipo de `barreras-de-tipos.tsx`);
 *   · **navegar a un destino que el catalogo no ofrece** — `un destino que el catalogo NO ofrece`, y
 *     del lado del marco, `shell/navegacion.test.tsx`.
 */

beforeAll(() => {
  // Los remiendos que Radix pide a jsdom para abrir la `Confirmacion`: los de `armazon.test.tsx`.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;
const T = TEXTOS_DE_LAS_PIEZAS;

const monta = (definicion: Definicion, datos: Partial<DatosDeLaPantalla> = {}, extra: Partial<PantallaProps> = {}) =>
  render(
    <Pantalla definicion={definicion} datos={{ ausencia: SIN_FRASE, ...datos }} tonoDeLaInsignia={() => 'ok'} {...extra} />,
  );

/** Un acto con un campo obligatorio, uno opcional y la observacion de 5 a 500. */
const ACTO: DefinicionDeActo = MUESTRAS_DE_LOS_ACTOS['acto-con-observacion'].definicion.bloques[0];

/** La hoja del acto, con el boton que lo abre. */
const HOJA_CON_ACTO = (acto: DefinicionDeActo = ACTO): Definicion => ({
  instruccion: '',
  bloques: [
    { titulo: 'El grupo', nota: '', campos: [], acciones: [{ rotulo: 'Abrir el acto', principal: true, abre: acto.clave }] },
    acto,
  ],
});

/** El primario del acto: el boton de envio, que se llama como el acto. */
const primario = () => screen.getByRole('button', { name: 'Abrir un grupo' });

/** El texto al que apunta `aria-describedby`, que es lo que el lector de pantalla lee al enfocarlo. */
function descripcionDe(elemento: HTMLElement): string {
  const ids = elemento.getAttribute('aria-describedby') ?? '';
  return ids
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent ?? `«${id} no existe»`)
    .join(' ');
}

/** Una promesa que se resuelve o se rechaza desde fuera. */
function diferida() {
  let resolver: () => void = () => {};
  let rechazar: (motivo: unknown) => void = () => {};
  const promesa = new Promise<void>((si, no) => {
    resolver = si;
    rechazar = no;
  });
  return { promesa, resolver, rechazar };
}

/**
 * Las excepciones que escapan de un manejador de React y acaban en `window` como `error` (#117):
 * la que nadie captura. Se recogen —y se callan, para que no ensucien la salida— hasta que acaba la
 * prueba, y la prueba afirma que no hubo ninguna.
 */
function recogerLasExcepcionesSueltas(): readonly unknown[] {
  const sueltas: unknown[] = [];
  const oir = (evento: ErrorEvent) => {
    sueltas.push(evento.error);
    evento.preventDefault();
  };
  window.addEventListener('error', oir);
  onTestFinished(() => {
    window.removeEventListener('error', oir);
  });
  return sueltas;
}

const abrirElActo = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir el acto' }));
};

const escribir = (rotulo: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
};

describe('`impedido-con-motivo`', () => {
  const { definicion } = MUESTRAS_DE_LOS_ACTOS['impedido-con-motivo'];
  const actos = { corregir: () => {}, baja: () => {} };

  it('aria-disabled, sigue en el tabulador y describe con el motivo VISIBLE; nunca `disabled`', () => {
    const alAbrirActo = vi.fn();
    const { container } = monta(definicion, {}, { actos, alAbrirActo, actoAbierto: null });
    const boton = screen.getByRole('button', { name: 'Corregir' });

    expect(boton.getAttribute('aria-disabled'), 'el boton impedido no se anuncia impedido').toBe('true');
    expect((boton as HTMLButtonElement).disabled, 'un `disabled` mudo: sale del tabulador').toBe(false);
    expect(descripcionDe(boton), 'el boton impedido NO dice por que').toBe('Falta elegir un grupo en la lista.');
    // Visible: un parrafo en la pantalla, no un `title` que solo sale al pasar el raton.
    const motivo = screen.getByText('Falta elegir un grupo en la lista.');
    expect(motivo.closest('[hidden], [aria-hidden="true"]')).toBeNull();

    fireEvent.click(boton);
    expect(alAbrirActo).not.toHaveBeenCalled();
    // Dos impedidos por lo mismo comparten UN parrafo, y los dos lo nombran.
    expect(container.querySelectorAll('[data-slot="motivo"]')).toHaveLength(1);
    expect(descripcionDe(screen.getByRole('button', { name: 'Dar de baja' }))).toBe(
      'Falta elegir un grupo en la lista.',
    );
  });

  it('con el dato, deja de estar impedido y el motivo se va', () => {
    const alAbrirActo = vi.fn();
    monta(definicion, { nombrados: new Map([['grupoId', '7']]) }, { actos, alAbrirActo, actoAbierto: null });
    const boton = screen.getByRole('button', { name: 'Corregir' });
    expect(boton.getAttribute('aria-disabled')).toBeNull();
    expect(boton.getAttribute('aria-describedby')).toBeNull();
    fireEvent.click(boton);
    expect(alAbrirActo).toHaveBeenCalledWith('corregir', {});
  });

  it('TECLADO: el tabulador LLEGA al impedido, y Enter y Espacio no hacen nada', async () => {
    const teclado = userEvent.setup({ delay: null });
    const alAbrirActo = vi.fn();
    monta(definicion, {}, { actos, alAbrirActo, actoAbierto: null });
    await teclado.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Corregir' }));
    await teclado.keyboard('{Enter}');
    await teclado.keyboard(' ');
    expect(alAbrirActo).not.toHaveBeenCalled();
  });

  it('gana el PRIMER impedimento que se cumple, y su motivo puede llevar un dato', () => {
    monta(
      {
        instruccion: '',
        bloques: [
          {
            titulo: 'B',
            nota: '',
            campos: [],
            acciones: [
              {
                rotulo: 'Hacer',
                hace: 'hacer',
                impedida: [
                  { si: { dato: 'cerrado', vale: true }, motivo: { plantilla: 'El grupo {grupo} esta cerrado.' } },
                  { si: { dato: 'grupo', hay: true }, motivo: 'No deberia salir: ya impidio el primero.' },
                ],
              },
            ],
          },
        ],
      },
      { nombrados: new Map<string, string | boolean>([['cerrado', true], ['grupo', 'G-01']]) },
      { alHacer: { hacer: () => {} } },
    );
    expect(descripcionDe(screen.getByRole('button', { name: 'Hacer' }))).toBe('El grupo G-01 esta cerrado.');
  });
});

describe('`acciones-del-bloque`', () => {
  const { definicion } = MUESTRAS_DE_LOS_ACTOS['acciones-del-bloque'];

  it('van bajo la cabecera, y la principal en azul', () => {
    const { container } = monta(definicion, {}, { actos: { abrir: () => {}, cerrar: () => {} }, alHacer: { releer: () => {} } });
    const fila = container.querySelector('[data-slot="acciones-del-bloque"]');
    expect(fila?.previousElementSibling?.getAttribute('data-slot')).toBe('tarjeta-cabecera');
    expect(within(fila as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Abrir un grupo',
      'Cerrar el grupo',
      'Volver a leer',
    ]);
  });

  it('se QUEDAN aunque la lectura del bloque este pidiendo, como la cabecera', () => {
    monta(
      { instruccion: '', bloques: [{ ...definicion.bloques[0], lectura: { clave: 'l' } }] },
      { lecturas: new Map([['l', { estado: 'pidiendo' }]]) },
      { alHacer: { releer: () => {} } },
    );
    expect(screen.getByRole('button', { name: 'Volver a leer' })).toBeTruthy();
  });

  it('una accion que nadie atiende sale impedida con su motivo, y no muda', () => {
    monta(definicion);
    for (const [rotulo, clave] of [
      ['Abrir un grupo', 'abrir'],
      ['Volver a leer', 'releer'],
    ] as const) {
      expect(descripcionDe(screen.getByRole('button', { name: rotulo }))).toBe(T.sinQuienLoAtienda(clave));
    }
  });

  it('`hace` con promesa: en curso hasta que acaba, y una segunda pulsacion NO vuelve a llamar', async () => {
    const pendiente = diferida();
    const releer = vi.fn(() => pendiente.promesa);
    monta(definicion, {}, { alHacer: { releer } });
    const boton = screen.getByRole('button', { name: 'Volver a leer' });

    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(releer, 'dos pulsaciones, dos llamadas').toHaveBeenCalledTimes(1);
    expect(boton.getAttribute('aria-busy')).toBe('true');
    expect(descripcionDe(boton)).toBe(T.enCurso);

    await act(async () => {
      pendiente.resolver();
      await pendiente.promesa;
    });
    expect(boton.getAttribute('aria-busy')).toBeNull();
    fireEvent.click(boton);
    expect(releer).toHaveBeenCalledTimes(2);
  });

  it('`hace` que LANZA en sincrono: la excepcion no se escapa y el boton queda libre (#117)', () => {
    // Lo coherente con el acto: soltar el boton y no dejar la excepcion suelta. Decir «fallo» es del
    // sistema, en `lecturas`, y no de la pieza: aqui no se dibuja ningun aviso.
    const sueltas = recogerLasExcepcionesSueltas();
    const releer = vi.fn((): void => {
      throw new Error('la operacion revento antes de devolver nada');
    });
    monta(definicion, {}, { alHacer: { releer } });
    const boton = screen.getByRole('button', { name: 'Volver a leer' });

    fireEvent.click(boton);
    expect(sueltas, 'la excepcion de `hace` salio del manejador de clic sin que nadie la capturara').toEqual([]);
    expect(boton.getAttribute('aria-busy'), 'el boton se quedo en curso').toBeNull();
    expect(boton.getAttribute('aria-disabled'), 'el boton se quedo impedido').toBeNull();
    fireEvent.click(boton);
    expect(releer, 'el boton no quedo libre para otra pulsacion').toHaveBeenCalledTimes(2);
    expect(sueltas).toEqual([]);
  });

  it('TECLADO: Tab llega a la accion y Enter la hace', async () => {
    const teclado = userEvent.setup({ delay: null });
    const releer = vi.fn();
    monta({ instruccion: '', bloques: [{ titulo: 'B', nota: '', campos: [], acciones: [{ rotulo: 'Volver a leer', hace: 'releer' }] }] }, {}, { alHacer: { releer } });
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Volver a leer');
    await teclado.keyboard('{Enter}');
    expect(releer).toHaveBeenCalledTimes(1);
  });
});

describe('`acto-con-observacion`', () => {
  it('cerrado no existe; la accion lo abre y «Cerrar» lo cierra, sin enviar nada', () => {
    const abrir = vi.fn();
    const { container } = monta(HOJA_CON_ACTO(), {}, { actos: { abrir } });
    expect(container.querySelector('[data-acto]')).toBeNull();
    abrirElActo();
    expect(container.querySelector('[data-acto="abrir"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: T.cerrarElActo }));
    expect(container.querySelector('[data-acto]')).toBeNull();
    expect(abrir).not.toHaveBeenCalled();
  });

  it('el primario NACE impedido y dice que falta rellenar; la observacion va la ULTIMA y es un area', () => {
    const { container } = monta(HOJA_CON_ACTO(), {}, { actos: { abrir: () => {} } });
    abrirElActo();
    expect(primario().getAttribute('aria-disabled')).toBe('true');
    expect(descripcionDe(primario())).toBe(T.faltaRellenar(['Codigo']));
    const controles = [...(container.querySelector('[data-acto] form')?.querySelectorAll('input, textarea') ?? [])];
    expect(controles.at(-1)?.tagName, 'la observacion no es la ultima, o no es un area').toBe('TEXTAREA');
    expect(screen.getByLabelText('Observacion').tagName).toBe('TEXTAREA');
  });

  it('no envia SIN observacion, y dice por que: en el boton y, tras el intento, bajo el campo', () => {
    const abrir = vi.fn();
    monta(HOJA_CON_ACTO(), {}, { actos: { abrir } });
    abrirElActo();
    escribir('Codigo', 'G-01');

    expect(descripcionDe(primario())).toBe(T.observacionCorta(5, 0));
    const observacion = screen.getByLabelText('Observacion');
    // Antes del primer intento, el campo no se pinta en rojo.
    expect(observacion.getAttribute('aria-invalid')).toBeNull();

    fireEvent.click(primario());
    expect(abrir, 'SE ENVIO un acto sin observacion').not.toHaveBeenCalled();
    expect(observacion.getAttribute('aria-invalid')).toBe('true');
    expect(descripcionDe(observacion)).toContain(T.observacionCorta(5, 0));

    // Y Enter en un campo de una linea, que es el envio implicito del navegador, tampoco.
    fireEvent.submit(screen.getByLabelText('Codigo').closest('form') as HTMLFormElement);
    expect(abrir).not.toHaveBeenCalled();
    // Solo blancos no es una observacion.
    escribir('Observacion', '       ');
    fireEvent.click(primario());
    expect(abrir).not.toHaveBeenCalled();
  });

  it('los limites son DATO de la definicion: la misma observacion vale con un minimo y no con otro', () => {
    const conMinimo = (minimo: number, maximo: number): DefinicionDeActo => ({
      ...ACTO,
      observacion: { ...ACTO.observacion, largo: { minimo, maximo } },
    });
    const probar = (definicion: DefinicionDeActo) => {
      const abrir = vi.fn();
      const { unmount } = monta(HOJA_CON_ACTO(definicion), {}, { actos: { abrir } });
      abrirElActo();
      escribir('Codigo', 'G-01');
      escribir('Observacion', 'abc');
      const motivo = primario().getAttribute('aria-disabled') === 'true' ? descripcionDe(primario()) : undefined;
      fireEvent.click(primario());
      unmount();
      return { llamadas: abrir.mock.calls.length, motivo };
    };
    expect(probar(conMinimo(2, 500))).toEqual({ llamadas: 1, motivo: undefined });
    expect(probar(conMinimo(4, 500))).toEqual({ llamadas: 0, motivo: T.observacionCorta(4, 3) });
    expect(probar(conMinimo(1, 2))).toEqual({ llamadas: 0, motivo: T.observacionLarga(2, 3) });
  });

  it('envia UNA vez lo que se escribio: por nombre, sin el opcional vacio y con la observacion recortada', async () => {
    const pendiente = diferida();
    const envios: EnvioDeUnActo[] = [];
    const abrir = vi.fn((envio: EnvioDeUnActo) => {
      envios.push(envio);
      return pendiente.promesa;
    });
    const alQuedarGuardada = vi.fn();
    const { container } = monta(
      HOJA_CON_ACTO(),
      { nombrados: new Map([['grupoId', '31']]) },
      { actos: { abrir }, alQuedarGuardada },
    );
    abrirElActo();
    escribir('Codigo', 'G-01');
    escribir('Observacion', '  Lo pide la resolucion 12.  ');

    fireEvent.click(primario());
    fireEvent.click(primario());
    expect(abrir, 'una doble pulsacion envio dos veces').toHaveBeenCalledTimes(1);
    expect(envios[0]).toEqual({ valores: { codigo: 'G-01' }, observacion: 'Lo pide la resolucion 12.', parametros: {} });
    expect(primario().getAttribute('aria-busy')).toBe('true');
    expect(descripcionDe(primario())).toBe(T.escribiendo);

    await act(async () => {
      pendiente.resolver();
      await pendiente.promesa;
    });
    const hecho = container.querySelector('[data-fase-del-acto="hecho"]');
    expect(hecho, 'el acto aceptado no dice lo que el servidor contesto').not.toBeNull();
    expect(within(hecho as HTMLElement).getByText('Identificador 31')).toBeTruthy();
    expect(within(hecho as HTMLElement).getByRole('button', { name: 'Volver a leer la lista' })).toBeTruthy();
    expect(alQuedarGuardada).toHaveBeenCalledTimes(1);
  });

  it('rechazado, lo escrito SE QUEDA y el fallo es el que el sistema puso en `lecturas` con la clave del acto', async () => {
    const fallo: EstadoDeUnaLectura = {
      estado: 'fallo',
      peldano: { titulo: 'Ya existe', detalle: 'Ese codigo ya lo tiene otro grupo.' },
      tono: 'atencion',
    };
    const pendiente = diferida();
    const { container, rerender } = monta(HOJA_CON_ACTO(), {}, { actos: { abrir: () => pendiente.promesa } });
    abrirElActo();
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    fireEvent.click(primario());
    await act(async () => {
      pendiente.rechazar(new Error('409'));
      await pendiente.promesa.catch(() => {});
    });
    // El sistema no puso el fallo: es una costura rota, y se DICE.
    expect(container.querySelector('[data-rechazo-sin-fallo="abrir"]')?.textContent).toBe(T.rechazoSinFallo('abrir'));

    rerender(
      <Pantalla
        definicion={HOJA_CON_ACTO()}
        datos={{ ausencia: SIN_FRASE, lecturas: new Map([['abrir', fallo]]) }}
        tonoDeLaInsignia={() => 'ok'}
        actos={{ abrir: () => pendiente.promesa }}
      />,
    );
    const encima = container.querySelector('[data-fallo-de="abrir"]');
    expect(within(encima as HTMLElement).getByText('Ese codigo ya lo tiene otro grupo.')).toBeTruthy();
    expect(container.querySelector('[data-rechazo-sin-fallo]')).toBeNull();
    expect((screen.getByLabelText('Codigo') as HTMLInputElement).value).toBe('G-01');
    expect(primario().getAttribute('aria-disabled'), 'tras el rechazo no se puede volver a enviar').toBeNull();
  });

  it('un manejador que LANZA en sincrono: el acto lo captura, dice «rechazado» y el primario queda libre (#117)', () => {
    // La conducta que `GrupoDeAcciones` no tenia y ahora comparte por `useEnVuelo`.
    const sueltas = recogerLasExcepcionesSueltas();
    const abrir = vi.fn((): void => {
      throw new Error('el manejador revento antes de devolver nada');
    });
    const { container } = monta(HOJA_CON_ACTO(), {}, { actos: { abrir } });
    abrirElActo();
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    fireEvent.click(primario());

    expect(sueltas, 'la excepcion del manejador salio sin que nadie la capturara').toEqual([]);
    expect(container.querySelector('[data-rechazo-sin-fallo="abrir"]')?.textContent).toBe(T.rechazoSinFallo('abrir'));
    expect(primario().getAttribute('aria-busy'), 'el primario se quedo en curso').toBeNull();
    fireEvent.click(primario());
    expect(abrir, 'el primario no quedo libre para otro envio').toHaveBeenCalledTimes(2);
  });

  it('un acto que nadie atiende no se abre, y si llega abierto su primario lo dice', () => {
    monta(HOJA_CON_ACTO(), {}, { actoAbierto: { clave: 'abrir' } });
    expect(descripcionDe(screen.getByRole('button', { name: 'Abrir el acto' }))).toBe(T.sinQuienLoAtienda('abrir'));
    escribir('Codigo', 'G-01');
    escribir('Observacion', 'Un grupo nuevo.');
    expect(descripcionDe(primario())).toBe(T.sinQuienLoAtienda('abrir'));
  });

  it('teclear avisa `alEnsuciar` UNA vez', () => {
    const alEnsuciar = vi.fn();
    monta(HOJA_CON_ACTO(), {}, { actos: { abrir: () => {} }, alEnsuciar });
    abrirElActo();
    escribir('Codigo', 'G');
    escribir('Codigo', 'G-0');
    escribir('Observacion', 'x');
    expect(alEnsuciar).toHaveBeenCalledTimes(1);
  });

  it('CONTROLADO: con `actoAbierto` manda quien lo pasa; `con` llega resuelto al manejador', () => {
    const alAbrirActo = vi.fn();
    const abrir = vi.fn();
    const definicion: Definicion = {
      instruccion: '',
      bloques: [
        {
          titulo: 'Fila',
          nota: '',
          campos: [],
          acciones: [{ rotulo: 'Abrir el acto', abre: 'abrir', con: { fila: { desde: 'filaId' } } }],
        },
        { ...ACTO, campos: [] },
      ],
    };
    const { container, rerender } = monta(
      definicion,
      { nombrados: new Map([['filaId', '9']]) },
      { actos: { abrir }, actoAbierto: null, alAbrirActo },
    );
    abrirElActo();
    expect(alAbrirActo).toHaveBeenCalledWith('abrir', { fila: '9' });
    expect(container.querySelector('[data-acto]'), 'abrio el acto por su cuenta, sin la ruta').toBeNull();

    rerender(
      <Pantalla
        definicion={definicion}
        datos={{ ausencia: SIN_FRASE }}
        tonoDeLaInsignia={() => 'ok'}
        actos={{ abrir }}
        actoAbierto={{ clave: 'abrir', parametros: { fila: '9' } }}
        alAbrirActo={alAbrirActo}
      />,
    );
    escribir('Observacion', 'Por la fila nueve.');
    fireEvent.click(primario());
    expect(abrir).toHaveBeenCalledWith({ valores: {}, observacion: 'Por la fila nueve.', parametros: { fila: '9' } });
    fireEvent.click(screen.getByRole('button', { name: T.cerrarElActo }));
    expect(alAbrirActo).toHaveBeenLastCalledWith(null, undefined);
    expect(container.querySelector('[data-acto]'), 'se cerro por su cuenta, sin la ruta').not.toBeNull();
  });

  it('TECLADO: se rellena con Tab y se envia con Enter sobre el primario', async () => {
    const teclado = userEvent.setup({ delay: null });
    const abrir = vi.fn();
    monta({ instruccion: '', bloques: [ACTO] }, {}, { actos: { abrir }, actoAbierto: { clave: 'abrir' } });
    await teclado.tab(); // Cerrar
    await teclado.tab(); // Codigo
    await teclado.keyboard('G-01');
    await teclado.tab(); // Nombre
    await teclado.tab(); // Observacion
    expect(document.activeElement).toBe(screen.getByLabelText('Observacion'));
    // Enter en el area es un salto de linea, no un envio: la regla 10 se escribe.
    await teclado.keyboard('Primera linea{Enter}segunda');
    expect(abrir).not.toHaveBeenCalled();
    await teclado.tab();
    expect(document.activeElement).toBe(primario());
    await teclado.keyboard('{Enter}');
    expect(abrir).toHaveBeenCalledWith({
      valores: { codigo: 'G-01' },
      observacion: 'Primera linea\nsegunda',
      parametros: {},
    });
  });
});

describe('`confirmacion-de-lo-irreversible`', () => {
  const { definicion, datos } = MUESTRAS_DE_LOS_ACTOS['confirmacion-de-lo-irreversible'];

  it('el primario NO envia: abre la confirmacion con la advertencia; «Cancelar» no envia y «Si, confirmar» si', () => {
    const cerrar = vi.fn();
    monta(definicion, datos, { actos: { cerrar }, actoAbierto: { clave: 'cerrar' } });
    escribir('Observacion', 'Se acabo el plazo.');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el grupo' }));

    expect(cerrar, 'lo irreversible se envio sin confirmar').not.toHaveBeenCalled();
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByText(T.estoNoSeDeshace)).toBeTruthy();
    expect(within(dialogo).getByText('El grupo deja de admitir registros para todo el mundo.')).toBeTruthy();

    fireEvent.click(within(dialogo).getByRole('button', { name: T.cancelar }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(cerrar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el grupo' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: T.siConfirmar }));
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(cerrar).toHaveBeenCalledWith({ valores: {}, observacion: 'Se acabo el plazo.', parametros: {} });
  });

  it('sin observacion no llega ni a preguntar', () => {
    monta(definicion, datos, { actos: { cerrar: () => {} }, actoAbierto: { clave: 'cerrar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el grupo' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('TECLADO: el foco cae en «Cancelar», Esc no envia, y Enter sobre «Si, confirmar» si', async () => {
    const teclado = userEvent.setup({ delay: null });
    const cerrar = vi.fn();
    monta(definicion, datos, { actos: { cerrar }, actoAbierto: { clave: 'cerrar' } });
    escribir('Observacion', 'Se acabo el plazo.');
    screen.getByRole('button', { name: 'Cerrar el grupo' }).focus();
    await teclado.keyboard('{Enter}');
    expect(document.activeElement?.textContent, 'el foco no cayo en la salida que no rompe nada').toBe(T.cancelar);
    await teclado.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(cerrar).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Cerrar el grupo' }).focus();
    await teclado.keyboard('{Enter}');
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe(T.siConfirmar);
    await teclado.keyboard('{Enter}');
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});

describe('`navegar-a-otra-hoja`', () => {
  const { definicion, datos } = MUESTRAS_DE_LOS_ACTOS['navegar-a-otra-hoja'];
  const navegacion = (ofrecidas: readonly string[]): NavegacionDeLaPantalla & { ir: ReturnType<typeof vi.fn> } => ({
    ofrece: (hoja) => ofrecidas.includes(hoja),
    ir: vi.fn(),
  });

  it('pide al marco ir, con el sujeto y los parametros ya resueltos', () => {
    const nav = navegacion(['otra-zona', 'otra-lista']);
    monta(definicion, datos, { navegacion: nav });
    fireEvent.click(screen.getByRole('button', { name: 'Ver su zona' }));
    expect(nav.ir).toHaveBeenLastCalledWith({ hoja: 'otra-zona', sujeto: '42' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver los de baja' }));
    expect(nav.ir).toHaveBeenLastCalledWith({ hoja: 'otra-lista', parametros: { estado: 'BAJA', grupo: 'G-01' } });
  });

  it('un destino que el catalogo NO ofrece: impedido con su motivo, y no se pide ir', () => {
    const nav = navegacion(['otra-lista']);
    monta(definicion, datos, { navegacion: nav });
    const boton = screen.getByRole('button', { name: 'Ver su zona' });
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    expect(descripcionDe(boton)).toBe(T.hojaNoOfrecida);
    fireEvent.click(boton);
    expect(nav.ir, 'se pidio ir a una hoja que el catalogo no ofrece').not.toHaveBeenCalled();
  });

  it('sin marco que sepa ir, impedida; y sin el dato del sujeto, tambien: nunca viaja una raya', () => {
    const { unmount } = monta(definicion, datos);
    expect(descripcionDe(screen.getByRole('button', { name: 'Ver su zona' }))).toBe(T.sinNavegacion);
    unmount();
    const nav = navegacion(['otra-zona', 'otra-lista']);
    monta(definicion, { nombrados: new Map([['grupo', 'G-01']]) }, { navegacion: nav });
    const boton = screen.getByRole('button', { name: 'Ver su zona' });
    expect(descripcionDe(boton)).toBe(T.faltaElDato('registroId'));
    fireEvent.click(boton);
    expect(nav.ir).not.toHaveBeenCalled();
  });

  it('TECLADO: Tab hasta la accion y Espacio la pide', async () => {
    const teclado = userEvent.setup({ delay: null });
    const nav = navegacion(['otra-zona', 'otra-lista']);
    monta(definicion, datos, { navegacion: nav });
    await teclado.tab();
    expect(document.activeElement?.textContent).toBe('Ver su zona');
    await teclado.keyboard(' ');
    expect(nav.ir).toHaveBeenCalledWith({ hoja: 'otra-zona', sujeto: '42' });
  });
});

describe('las reglas puras', () => {
  const contexto = {
    valores: {},
    observacion: '',
    enCurso: false,
    nombrados: undefined,
    traducir: (t: string) => t,
    textos: { ...TEXTOS_DEL_INTERPRETE, ...T },
    atendido: true,
  };

  it('`motivoDelActo`: UN motivo, en orden — en curso, lo declarado, sin quien, lo que falta, la observacion', () => {
    const conImpedimento: DefinicionDeActo = {
      ...ACTO,
      impedido: [{ si: { dato: 'grupoId', hay: false }, motivo: 'Falta el grupo.' }],
    };
    expect(motivoDelActo(conImpedimento, { ...contexto, enCurso: true })).toBe(T.escribiendo);
    expect(motivoDelActo(conImpedimento, { ...contexto, atendido: false })).toBe('Falta el grupo.');
    expect(motivoDelActo(ACTO, { ...contexto, atendido: false })).toBe(T.sinQuienLoAtienda('abrir'));
    expect(motivoDelActo(ACTO, contexto)).toBe(T.faltaRellenar(['Codigo']));
    expect(motivoDelActo(ACTO, { ...contexto, valores: { codigo: 'G' } })).toBe(T.observacionCorta(5, 0));
    expect(motivoDelActo(ACTO, { ...contexto, valores: { codigo: 'G' }, observacion: ' cinco ' })).toBeUndefined();
  });

  it('`valoresQueViajan`: sin opcionales vacios, sin los de solo lectura, y la casilla desmarcada SI viaja', () => {
    expect(
      valoresQueViajan(
        [
          { nombre: 'a', etiqueta: 'A', tipo: '' },
          { nombre: 'b', etiqueta: 'B', tipo: '', opcional: true },
          { nombre: 'c', etiqueta: 'C', tipo: 'c', casilla: 'si' },
          { nombre: 'r', etiqueta: 'R', tipo: 'r' },
        ],
        { a: 'uno', b: '  ', c: false, r: 'no viaja' },
      ),
    ).toEqual({ a: 'uno', c: false });
  });

  it('`claseDe` dice la clase de las cuatro, y revienta con una que no es ninguna (#111)', () => {
    const rotulo = 'r';
    expect(claseDe({ rotulo, abre: 'a' }).clase).toBe('abre');
    expect(claseDe({ rotulo, va: { hoja: 'h' } }).clase).toBe('va');
    expect(claseDe({ rotulo, hace: 'h' }).clase).toBe('hace');
    expect(claseDe({ rotulo, guarda: { texto: { desde: 't' }, nombre: 'n', tipoDeMedio: 'text/plain' } }).clase).toBe(
      'guarda',
    );
    // La que llega sin tipos: antes caia al final de cada cadena de `if` como si fuera otra.
    expect(() => claseDe({ rotulo, imprime: 'x' } as unknown as DefinicionDeAccion)).toThrow(
      /no es ninguna de las cuatro clases de accion/,
    );
  });

  it('`peticionDe` nombra el primer dato que falta, y un `false` SI es un dato', () => {
    const textos = { ...TEXTOS_DEL_INTERPRETE, ...T };
    expect(
      peticionDe({ hoja: 'h', parametros: { activo: { desde: 'activo' }, id: { plantilla: 'x-{id}' } } }, new Map([['activo', false]]), (t) => t, textos),
    ).toEqual({ faltaElDato: 'id' });
  });
});

describe('LAS MUESTRAS DE #66: una por hueco, y todas se dibujan', () => {
  it('EL CENTINELA: estan los cinco huecos de #66, ni uno menos ni uno de mas', () => {
    expect(Object.keys(MUESTRAS_DE_LOS_ACTOS).sort()).toEqual(
      [
        'acciones-del-bloque',
        'acto-con-observacion',
        'impedido-con-motivo',
        'confirmacion-de-lo-irreversible',
        'navegar-a-otra-hoja',
      ].sort(),
    );
  });

  it.each(Object.entries(MUESTRAS_DE_LOS_ACTOS))('«%s» se dibuja, con sus actos abiertos', (_hueco, muestra) => {
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
