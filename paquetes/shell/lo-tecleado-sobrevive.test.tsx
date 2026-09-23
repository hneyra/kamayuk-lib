import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Pantalla, type DefinicionDePantalla, type PiezaDeLaPantalla } from '../ui/index.ts';

import { Armazon } from './Armazon.tsx';
import type { Catalogo } from './catalogo.ts';
import { useHoja, type HojaAbierta } from './contexto.tsx';

/**
 * **La marca de sucia y lo tecleado, con el `Armazon` de verdad** (#86, `la-hoja-se-marca-sucia-al-teclear`
 * y `lo-tecleado-y-la-negativa-sobreviven`, opcion C).
 *
 * <h2>El invariante, en una frase</h2>
 *
 * **Si el arbol dice «SIN GUARDAR» para una hoja, al volver a ella esta lo tecleado; si no lo dice,
 * al volver el formulario esta vacio.** Las dos mitades a la vez, porque cada una por separado ya
 * tuvo su defecto: la `key` por destino (normativa#58) vaciaba el formulario de una hoja que el arbol
 * seguia marcando sucia, y conservarlo siempre (la V6) habria traido lo escrito a una hoja que nadie
 * iba a guardar.
 *
 * <h2>Como se sale sin pasar por `irA`</h2>
 *
 * Dentro del marco una hoja sucia solo se deja por `irA`, que pregunta y limpia. Las salidas que no
 * pasan por ahi son la direccion escrita a mano, el boton de atras y un enlace: aqui se escribe el
 * `hash` y se avisa como avisa el navegador. Es el camino por el que el arbol se quedaba diciendo
 * «SIN GUARDAR» sobre un formulario vacio.
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

/** Un campo que se teclea, una accion que abre un acto y el acto. La hoja cambia por destino. */
function definicionCon(hoja: DefinicionDePantalla<PiezaDeLaPantalla>['hoja']): DefinicionDePantalla<PiezaDeLaPantalla> {
  return {
    instruccion: '',
    ...(hoja === undefined ? {} : { hoja }),
    bloques: [
      {
        titulo: 'Registro',
        nota: '',
        campos: [{ etiqueta: 'Apunte', tipo: 't1' }],
        acciones: [{ rotulo: 'Corregir el registro', principal: true, abre: 'corregir' }],
      },
      {
        tipo: 'acto',
        clave: 'corregir',
        titulo: 'Corregir el registro',
        campos: [{ nombre: 'codigo', etiqueta: 'Codigo', tipo: '' }],
        observacion: { etiqueta: 'Observacion', largo: { minimo: 5, maximo: 500 } },
      },
    ],
  };
}

/** Por destino: las dos marcas, cada una sola, y ninguna —la hoja de antes de #86—. */
const DEFINICIONES: Readonly<Record<string, DefinicionDePantalla<PiezaDeLaPantalla>>> = {
  'las-dos': definicionCon({ suciaAlTeclear: true, conservaLoTecleado: 'soloSiSucia' }),
  'solo-sucia': definicionCon({ suciaAlTeclear: true }),
  'solo-conserva': definicionCon({ conservaLoTecleado: 'soloSiSucia' }),
  ninguna: definicionCon(undefined),
};

const CATALOGO: Catalogo = [
  {
    clave: 'registro',
    rotulo: 'Registro',
    nota: 'Lo que se corrige',
    icono: 'capas',
    destinos: [
      { clave: 'las-dos', rotulo: 'Con las dos', seEscribe: true },
      { clave: 'solo-sucia', rotulo: 'Solo sucia', seEscribe: true },
      { clave: 'solo-conserva', rotulo: 'Solo conserva', seEscribe: true },
      { clave: 'ninguna', rotulo: 'Sin ninguna', seEscribe: true },
      { clave: 'otra', rotulo: 'Otra hoja', seEscribe: false },
    ],
  },
];

/** La ultima hoja abierta que vio una pantalla: es como la prueba llama a `marcarGuardada`. */
let vista: HojaAbierta | null = null;

function HojaInterpretada({ clave }: { readonly clave: string }) {
  const hoja = useHoja();
  vista = hoja;
  const definicion = DEFINICIONES[clave];
  if (definicion === undefined) return <p>Nada que interpretar.</p>;
  return (
    <Pantalla
      definicion={definicion}
      datos={{ ausencia: { enElCampo: '—', explicacion: '', tono: 'info' } }}
      tonoDeLaInsignia={() => 'ok'}
      actos={{ corregir: () => {} }}
      hoja={hoja}
    />
  );
}

function montar(hash: string) {
  window.location.hash = hash;
  return render(
    <Armazon
      titulo="Sistema de prueba"
      entidad="Entidad de prueba"
      catalogo={CATALOGO}
      cuenta={{ nombre: 'J. Ruiz', iniciales: 'JR' }}
      opcionesDeSesion={[]}
      acciones={{ guardar: () => {} }}
      pantalla={(hoja) => <HojaInterpretada clave={hoja.destino.clave} />}
    />,
  );
}

/** Sale escribiendo la direccion, como un enlace o la barra: NO pasa por `irA`, y no pregunta. */
function salirPorLaDireccion(hash: string): void {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

/** Vuelve por el arbol. Sale de una hoja limpia, asi que no pregunta. */
function volverPorElArbol(rotulo: string): void {
  const arbol = document.querySelector('[data-slot="arbol-de-modulos"]') ?? document.body;
  const disparador = within(arbol as HTMLElement).getByRole('button', { name: /^Registro/ });
  if (disparador.getAttribute('aria-expanded') !== 'true') fireEvent.click(disparador);
  fireEvent.click(within(arbol as HTMLElement).getByRole('button', { name: new RegExp(rotulo) }));
}

/** Si el arbol marca esa hoja «SIN GUARDAR». */
function marcadaSinGuardar(rotulo: string): boolean {
  const hojas = [...document.querySelectorAll('[data-slot="arbol-de-modulos"] [data-slot="hoja-del-arbol"]')];
  const hoja = hojas.find((boton) => boton.textContent?.startsWith(rotulo) === true);
  if (hoja === undefined) throw new Error(`El arbol no ensena la hoja «${rotulo}»: la prueba no puede mirar su marca.`);
  return hoja.querySelector('[data-slot="marca-sin-guardar"]') !== null;
}

const escribir = (rotulo: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
};

const valorDe = (rotulo: string) => (screen.getByLabelText(rotulo) as HTMLInputElement).value;

const titulo = () => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => {
  window.location.hash = '';
  vista = null;
});

describe('EL INVARIANTE: «SIN GUARDAR» en el arbol si y solo si lo tecleado espera al volver', () => {
  it('(1) sucia, se sale por la direccion y se vuelve: el arbol lo decia, y lo tecleado esta', () => {
    montar('#/las-dos');
    escribir('Apunte', 'lo escrito');
    expect(marcadaSinGuardar('Con las dos'), 'teclear no ensucio la hoja').toBe(true);

    salirPorLaDireccion('#/otra');
    expect(titulo()).toBe('Otra hoja');
    expect(marcadaSinGuardar('Con las dos'), 'la hoja dejo de estar sucia sin que nadie la guardara').toBe(true);

    volverPorElArbol('Con las dos');
    expect(titulo()).toBe('Con las dos');
    expect(valorDe('Apunte'), 'el arbol decia SIN GUARDAR y el formulario volvio vacio').toBe('lo escrito');
  });

  it('(2) NO sucia, se sale y se vuelve: el formulario esta vacio (lo que normativa#58 pedia)', () => {
    // Sin `suciaAlTeclear`, y sin que el sistema la marque: lo tecleado no hace sucia la hoja.
    montar('#/solo-conserva');
    escribir('Apunte', 'lo escrito');
    expect(marcadaSinGuardar('Solo conserva')).toBe(false);

    salirPorLaDireccion('#/otra');
    volverPorElArbol('Solo conserva');
    expect(valorDe('Apunte'), 'una hoja limpia conservo lo tecleado: la `key` por destino no sirve de nada').toBe('');
  });

  it('(3a) «Salir y perder los cambios»: al volver, vacio y sin marca', () => {
    montar('#/las-dos');
    escribir('Apunte', 'lo escrito');
    volverPorElArbol('Otra hoja');
    fireEvent.click(screen.getByRole('button', { name: 'Salir y perder los cambios' }));
    expect(titulo()).toBe('Otra hoja');
    expect(marcadaSinGuardar('Con las dos')).toBe(false);
    volverPorElArbol('Con las dos');
    expect(valorDe('Apunte'), 'se salio perdiendo los cambios y los cambios siguen ahi').toBe('');
  });

  it('(3b) «Guardar y cerrar»: al volver, vacio y sin marca', () => {
    montar('#/las-dos');
    escribir('Apunte', 'lo escrito');
    volverPorElArbol('Otra hoja');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y cerrar' }));
    expect(titulo()).toBe('Otra hoja');
    volverPorElArbol('Con las dos');
    expect(valorDe('Apunte')).toBe('');
  });

  it('(4) lo mismo con un acto abierto: sucia, se sale, se vuelve y se reabre, y lo escrito esta', () => {
    montar('#/las-dos');
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    escribir('Codigo', 'R-7');
    escribir('Observacion', 'Lo dice el acta.');
    expect(marcadaSinGuardar('Con las dos')).toBe(true);

    salirPorLaDireccion('#/otra');
    volverPorElArbol('Con las dos');
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    expect(valorDe('Codigo'), 'el acto volvio vacio con la hoja SIN GUARDAR').toBe('R-7');
    expect(valorDe('Observacion')).toBe('Lo dice el acta.');
  });

  it('(4b) y salir perdiendo los cambios vacia tambien el acto', () => {
    montar('#/las-dos');
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    escribir('Codigo', 'R-7');
    volverPorElArbol('Otra hoja');
    fireEvent.click(screen.getByRole('button', { name: 'Salir y perder los cambios' }));
    volverPorElArbol('Con las dos');
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    expect(valorDe('Codigo')).toBe('');
  });

  it('(5) guardada SIN salir —el sistema llama a `marcarGuardada`—: lo tecleado se olvida en el acto', () => {
    // Es lo unico que solo `limpiar` puede hacer: al salir, el efecto del destino ya olvida lo de una
    // hoja limpia. Quedandose, una hoja guardada con lo tecleado todavia en el marco ensenaria encima
    // de lo que el sistema acaba de leer lo que ya se guardo, y volveria a aparecer si se ensucia.
    montar('#/las-dos');
    escribir('Apunte', 'lo escrito');
    act(() => {
      vista?.marcarGuardada();
    });
    expect(marcadaSinGuardar('Con las dos')).toBe(false);
    expect(valorDe('Apunte'), 'guardada, la hoja sigue ensenando lo tecleado: `limpiar` no lo olvido').toBe('');
    expect(vista?.tecleado).toBeUndefined();
  });

  it('SIN los datos de #86, la hoja de antes: teclear no la marca, y lo tecleado muere al salir', () => {
    montar('#/ninguna');
    escribir('Apunte', 'lo escrito');
    expect(marcadaSinGuardar('Sin ninguna')).toBe(false);
    salirPorLaDireccion('#/otra');
    volverPorElArbol('Sin ninguna');
    expect(valorDe('Apunte')).toBe('');
  });
});

describe('`la-hoja-se-marca-sucia-al-teclear`: guardada, PUEDE volver a ensuciarse', () => {
  it('el sistema la da por guardada por su cuenta, y la siguiente tecla la vuelve a marcar', () => {
    // Solo `suciaAlTeclear`: lo tecleado vive en la pantalla y guardar desde fuera no lo vacia. Es el
    // caso en que «avisar solo con la primera tecla» deja la hoja limpia con cambios dentro.
    montar('#/solo-sucia');
    escribir('Apunte', 'uno');
    expect(marcadaSinGuardar('Solo sucia')).toBe(true);
    act(() => {
      vista?.marcarGuardada();
    });
    expect(marcadaSinGuardar('Solo sucia')).toBe(false);
    escribir('Apunte', 'uno y dos');
    expect(marcadaSinGuardar('Solo sucia'), 'guardada una vez, la hoja ya no se ensucia').toBe(true);
  });

  it('guardar un acto la deja limpia, y teclear otra vez la ensucia', () => {
    montar('#/las-dos');
    escribir('Apunte', 'uno');
    fireEvent.click(screen.getByRole('button', { name: 'Corregir el registro' }));
    escribir('Codigo', 'R-7');
    escribir('Observacion', 'Lo dice el acta.');
    fireEvent.click(screen.getAllByRole('button', { name: 'Corregir el registro' }).at(-1) as HTMLElement);
    expect(marcadaSinGuardar('Con las dos'), 'el acto aceptado no limpio la hoja').toBe(false);
    expect(valorDe('Apunte')).toBe('');
    escribir('Apunte', 'otra vez');
    expect(marcadaSinGuardar('Con las dos')).toBe(true);
  });

  it('TECLADO: lo tecleado con el teclado marca la hoja y sobrevive a salir y volver', async () => {
    const teclado = userEvent.setup({ delay: null });
    montar('#/las-dos');
    act(() => {
      screen.getByLabelText('Apunte').focus();
    });
    await teclado.keyboard('escrito a mano');
    expect(marcadaSinGuardar('Con las dos')).toBe(true);
    salirPorLaDireccion('#/otra');
    volverPorElArbol('Con las dos');
    expect(valorDe('Apunte')).toBe('escrito a mano');
  });
});

