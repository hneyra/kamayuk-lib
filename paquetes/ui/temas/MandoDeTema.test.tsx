import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IDENTIDADES, MODOS, ProveedorDeTema } from './ProveedorDeTema.tsx';
import { MandoDeTema } from './MandoDeTema.tsx';

/**
 * **El mando de preferencias: los dos ejes, y que la eleccion se recuerde** (`rentas`#111, AC1 y AC2;
 * sube con la pieza en #53).
 *
 * <h2>De donde salen estas pruebas</h2>
 *
 * Las seis primeras son las de `rentas/frontend/src/preferencias/MandoDeTema.test.tsx`, que se borra
 * en el PR pareado: **las mismas aserciones**, con el mismo `fireEvent.click`. Las que se anaden son
 * las dos que alli no habia y el issue pide: **accesibilidad** —cada eje es un grupo con nombre, cada
 * opcion un radio con nombre, y los dos ejes no comparten `name`— y **teclado**, con `userEvent`:
 * ninguna prueba del mando usaba el teclado, ni en vitest ni en el e2e de `rentas`.
 *
 * <h2>Lo que esta prueba SI puede decir, y lo que no</h2>
 *
 * Puede decir que los dos atributos se estampan, que «el del sistema» **quita** el atributo en vez
 * de ponerlo en claro, y que lo elegido sobrevive a volver a montar — que es lo que una recarga
 * hace con el arbol de React.
 *
 * **No puede decir que la pantalla cambie de color**: aqui no hay CSS aplicado, ni cascada, ni
 * `prefers-color-scheme`. Eso se mide donde se puede medir: en el navegador, sobre el valor
 * computado (`rentas/frontend/e2e/los-temas-llegan-al-navegador.spec.ts`), y el contraste de las
 * dos notas en las seis combinaciones, tambien alli.
 */

const PREFIJO = 'kamayuk.prueba';

function montar() {
  return render(
    <ProveedorDeTema configuracion={{ identidadPorOmision: 'institucional', prefijoDeClaves: PREFIJO }}>
      <MandoDeTema abierto alCerrar={() => {}} />
    </ProveedorDeTema>,
  );
}

const raiz = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  raiz().removeAttribute('data-tema');
  raiz().removeAttribute('data-modo');
});

afterEach(cleanup);

describe('el mando de preferencias', () => {
  it('EL CENTINELA: ofrece TODO lo que la libreria publica, y no una lista escrita aqui', () => {
    // Sin esto, el dia que entre una quinta identidad el mando se quedaria corto en silencio: el
    // tema existiria, su CSS viajaria en el paquete, y aqui no habria como elegirlo.
    montar();
    for (const identidad of IDENTIDADES) {
      expect(
        screen.getByRole('radio', { name: ROTULOS[identidad] }),
        `la identidad «${identidad}» no se ofrece`,
      ).toBeTruthy();
    }
    // Los modos son los de la libreria MAS uno que no es un modo: no elegir.
    expect(screen.getAllByRole('radio')).toHaveLength(IDENTIDADES.length + MODOS.length + 1);
    expect(screen.getByRole('radio', { name: 'El del sistema' })).toBeTruthy();
  });

  it('por omision: la identidad del servicio, y NINGUN modo', () => {
    montar();
    expect(raiz().getAttribute('data-tema')).toBe('institucional');
    // Ausente y no «claro»: es lo que devuelve el mando al sistema operativo. Un `claro` de
    // fabrica congelaria en claro a quien tenga el equipo en oscuro.
    expect(raiz().hasAttribute('data-modo')).toBe(false);
    expect(screen.getByRole('radio', { name: 'Institucional' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'El del sistema' })).toBeChecked();
  });

  it('elegir una identidad la estampa y la recuerda', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Sepia' }));
    expect(raiz().getAttribute('data-tema')).toBe('sepia');
    expect(localStorage.getItem(`${PREFIJO}.tema`)).toBe('sepia');
    // Y el otro eje no se mueve: son independientes, que es el motivo de que sean dos atributos.
    expect(raiz().hasAttribute('data-modo')).toBe(false);
  });

  it('elegir un modo lo estampa, y volver a «el del sistema» lo QUITA', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(raiz().getAttribute('data-modo')).toBe('oscuro');
    expect(localStorage.getItem(`${PREFIJO}.modo`)).toBe('oscuro');

    fireEvent.click(screen.getByRole('radio', { name: 'El del sistema' }));
    // Quitado, no puesto en claro: sin esto, quien devuelve el mando al equipo se quedaria
    // clavado en el modo que tuviera puesto al hacerlo.
    expect(raiz().hasAttribute('data-modo')).toBe(false);
    expect(localStorage.getItem(`${PREFIJO}.modo`)).toBeNull();
  });

  it('y lo elegido SOBREVIVE a volver a montar, que es lo que hace una recarga', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Alto contraste' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    cleanup();
    raiz().removeAttribute('data-tema');
    raiz().removeAttribute('data-modo');

    montar();
    expect(raiz().getAttribute('data-tema')).toBe('alto-contraste');
    expect(raiz().getAttribute('data-modo')).toBe('claro');
    expect(screen.getByRole('radio', { name: 'Alto contraste' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
  });

  it('las dos claves llevan el prefijo del sistema: dos interfaces del mismo origen no se pisan', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Sepia' }));
    // `/rentas/` y `/caja/` se sirven del mismo origen y comparten `localStorage`. Con una clave
    // pelada —`tema`—, cambiar el tema aqui se lo cambiaria a la otra.
    expect(Object.keys(localStorage).every((c) => c.startsWith(`${PREFIJO}.`))).toBe(true);
  });
});

/**
 * **Lo que el lector de pantalla recibe** (#53, AC5).
 *
 * `jsx-a11y` no lo distingue, y esta medido: con el `<input type="radio">` cambiado por un
 * `<button role="radio" aria-checked>` o por un `<div role="radio">` con su teclado, `eslint` sobre
 * `paquetes/ui/temas/` sale en verde. Dibujan lo mismo y dejan fuera el recorrido con flechas del
 * navegador y el `name` del grupo. Asi que se pregunta al arbol de accesibilidad, que es lo que el
 * lector lee, y al elemento: un radio de verdad es un `<input>`.
 */
describe('accesibilidad: dos grupos con nombre, y radios de verdad dentro', () => {
  it('cada eje es un grupo con el nombre de su `legend`, y cada opcion un radio con nombre', () => {
    montar();
    const identidad = screen.getByRole('group', { name: 'Identidad visual' });
    const apariencia = screen.getByRole('group', { name: 'Apariencia' });

    expect(within(identidad).getAllByRole('radio')).toHaveLength(IDENTIDADES.length);
    expect(within(apariencia).getAllByRole('radio')).toHaveLength(MODOS.length + 1);
    for (const radio of screen.getAllByRole('radio')) {
      // Un radio sin nombre se anuncia «boton de opcion, 2 de 4» y nada mas.
      expect(radio.closest('label')?.textContent?.trim(), 'hay un radio sin rotulo').not.toBe('');
    }
    // Y son radios NATIVOS, no un `role` puesto encima: el recorrido con flechas es del navegador.
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.tagName, 'el radio no es un `<input>`').toBe('INPUT');
      expect(radio.getAttribute('type')).toBe('radio');
    }
    // Y el cajon es un dialogo que se llama como su titulo.
    expect(screen.getByRole('dialog', { name: 'Preferencias' })).toBeTruthy();
  });

  it('los dos ejes tienen `name` distinto, y cada uno el suyo en todas sus opciones', () => {
    montar();
    const nombreDe = (grupo: string): readonly string[] => [
      ...new Set(
        within(screen.getByRole('group', { name: grupo }))
          .getAllByRole('radio')
          .map((r) => r.getAttribute('name') ?? ''),
      ),
    ];
    const deLaIdentidad = nombreDe('Identidad visual');
    const deLaApariencia = nombreDe('Apariencia');
    // Un solo `name` por eje —si no, cada opcion seria un grupo de uno y las flechas no moverian
    // nada— y distinto entre los dos.
    expect(deLaIdentidad).toHaveLength(1);
    expect(deLaApariencia).toHaveLength(1);
    expect(deLaIdentidad[0]).not.toBe('');
    expect(deLaIdentidad[0]).not.toBe(deLaApariencia[0]);
  });

  it('elegir en un eje NO desmarca el otro', () => {
    // Es lo que el `name` compartido rompe: para el navegador los siete radios serian un grupo, y
    // marcar «Oscuro» desmarcaria «Sepia».
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Sepia' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(screen.getByRole('radio', { name: 'Sepia' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Alto contraste' }));
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
    expect(raiz().getAttribute('data-tema')).toBe('alto-contraste');
    expect(raiz().getAttribute('data-modo')).toBe('oscuro');
  });
});

/**
 * **Con el teclado, que es como lo recorre quien no usa raton** (#53, AC5).
 *
 * `userEvent` mueve la eleccion con las flechas dentro de `input[type="radio"][name=…]`
 * (`@testing-library/user-event/dist/esm/event/radio.js`) y tabula saltando al radio marcado de
 * cada grupo (`utils/focus/getTabDestination.js`), que es lo que hace el navegador. Con `fireEvent`
 * nada de esto se ejerce: un clic llega igual a un `<div>` que a un radio.
 */
describe('teclado: Tab entra en el eje, las flechas eligen y Escape cierra', () => {
  /** El mando con su `abierto` de verdad, como lo monta un sistema desde su menu de sesion. */
  function ConSuEstado({ alCerrar }: { readonly alCerrar: () => void }) {
    const [abierto, setAbierto] = useState(true);
    return (
      <MandoDeTema
        abierto={abierto}
        alCerrar={() => {
          alCerrar();
          setAbierto(false);
        }}
      />
    );
  }

  function montarConSuEstado(alCerrar: () => void = () => {}) {
    return render(
      <ProveedorDeTema configuracion={{ identidadPorOmision: 'institucional', prefijoDeClaves: PREFIJO }}>
        <ConSuEstado alCerrar={alCerrar} />
      </ProveedorDeTema>,
    );
  }

  it('Tab entra en el eje por la opcion ELEGIDA, y el siguiente Tab pasa al otro eje', async () => {
    const persona = userEvent.setup();
    // Elegida una que NO es la primera: si no, «cae en la elegida» y «cae en la primera» serian lo
    // mismo y la prueba no distinguiria un grupo de radios de siete botones seguidos.
    localStorage.setItem(`${PREFIJO}.tema`, 'sepia');
    montarConSuEstado();
    // Desde el propio cajon. Radix, al abrir, deja el foco en el primer elemento que se puede
    // tabular —«Institucional», medido—, que no es la opcion elegida: por eso se parte de fuera.
    screen.getByRole('dialog').focus();

    await persona.tab();
    expect(document.activeElement, 'Tab no entro en el eje de la identidad por la opcion elegida').toBe(
      screen.getByRole('radio', { name: 'Sepia' }),
    );

    // Un Tab mas y esta en el otro eje, en «El del sistema», que es la marcada: NO en la identidad
    // siguiente. Con un solo `name` para los dos ejes, este Tab se saltaria el segundo entero.
    await persona.tab();
    expect(document.activeElement, 'Tab no paso al eje de la apariencia').toBe(
      screen.getByRole('radio', { name: 'El del sistema' }),
    );

    await persona.tab({ shift: true });
    expect(document.activeElement, 'Mayus+Tab no volvio a la identidad elegida').toBe(
      screen.getByRole('radio', { name: 'Sepia' }),
    );
  });

  it('las flechas mueven la eleccion dentro del eje, y cada paso estampa el atributo', async () => {
    const persona = userEvent.setup();
    montarConSuEstado();
    screen.getByRole('radio', { name: 'Institucional' }).focus();

    await persona.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Alto contraste' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Alto contraste' })).toHaveFocus();
    expect(raiz().getAttribute('data-tema')).toBe('alto-contraste');
    expect(localStorage.getItem(`${PREFIJO}.tema`)).toBe('alto-contraste');

    await persona.keyboard('{ArrowRight}');
    expect(raiz().getAttribute('data-tema')).toBe('sepia');

    // Y no se sale del eje: la flecha no cruza a la apariencia.
    await persona.keyboard('{ArrowUp}{ArrowUp}');
    expect(raiz().getAttribute('data-tema')).toBe('institucional');
    expect(raiz().hasAttribute('data-modo')).toBe(false);

    // En el otro eje, igual: de «El del sistema» hacia arriba es «Oscuro», y se estampa.
    screen.getByRole('radio', { name: 'El del sistema' }).focus();
    await persona.keyboard('{ArrowUp}');
    expect(raiz().getAttribute('data-modo')).toBe('oscuro');
    expect(raiz().getAttribute('data-tema')).toBe('institucional');
  });

  it('Escape cierra el cajon, y lo dice UNA vez a quien lo abrio', async () => {
    const persona = userEvent.setup();
    const alCerrar = vi.fn();
    montarConSuEstado(alCerrar);
    expect(document.querySelector('[data-slot="mando-de-tema"]')).not.toBeNull();

    await persona.keyboard('{Escape}');
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-slot="mando-de-tema"]')).toBeNull();
  });
});

/**
 * **`catastro` e `identidad` lo montan sin copiar nada** (#53, AC7).
 *
 * Con otro prefijo, otra identidad de fabrica y **sin pasarle ni una palabra**: lo que tiene que
 * poner quien lo monta es el proveedor por encima, `abierto` y `alCerrar`. Nada mas.
 */
describe('otro sistema lo monta con su prefijo y sin textos', () => {
  it('se ve en castellano, y lo elegido va a SUS claves', () => {
    render(
      <ProveedorDeTema configuracion={{ identidadPorOmision: 'clasico', prefijoDeClaves: 'kamayuk.catastro' }}>
        <MandoDeTema abierto alCerrar={() => {}} />
      </ProveedorDeTema>,
    );
    expect(screen.getByRole('radio', { name: 'Clásico' })).toBeChecked();
    expect(raiz().getAttribute('data-tema')).toBe('clasico');

    fireEvent.click(screen.getByRole('radio', { name: 'Sepia' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(localStorage.getItem('kamayuk.catastro.tema')).toBe('sepia');
    expect(localStorage.getItem('kamayuk.catastro.modo')).toBe('oscuro');
    expect(localStorage.getItem(`${PREFIJO}.tema`)).toBeNull();
  });

  it('y fuera de un `ProveedorDeTema` revienta diciendo por que, en vez de dibujar un mando mudo', () => {
    // Es el primer requisito del docblock, y el que se olvida: sin proveedor no hay tema que elegir.
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<MandoDeTema abierto alCerrar={() => {}} />)).toThrow(/ProveedorDeTema/);
    consola.mockRestore();
  });
});

/** Como se lee cada identidad en el mando. Vive aqui para que el centinela no dependa del orden. */
const ROTULOS: Readonly<Record<(typeof IDENTIDADES)[number], string>> = {
  institucional: 'Institucional',
  'alto-contraste': 'Alto contraste',
  sepia: 'Sepia',
  clasico: 'Clásico',
};
