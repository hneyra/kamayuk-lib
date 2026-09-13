import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ABRE,
  CIERRA,
  elRojo,
  loQueNoPasoPorElSaco,
  marca,
  marcarElSaco,
  type TrozoVisible,
} from '../verificaciones/marcas.ts';

import { Armazon } from './Armazon.tsx';
import { CarrilDeModulos } from './CarrilDeModulos.tsx';
import type { Catalogo } from './catalogo.ts';
import { ProveedorDeLosTextos, useHoja } from './contexto.tsx';
import { TEXTOS_DEL_ARMAZON } from './textos.ts';

/**
 * **NINGUNA cadena llega al DOM del armazón sin pasar por el saco de textos** (#19, AC1 y AC2).
 *
 * <h2>Por qué se MONTA y no se barren las fuentes</h2>
 *
 * Un escáner de fuentes contesta otra pregunta —«¿hay literales en el código?»— y la contesta mal en
 * las dos direcciones: da rojos sobre cadenas que nunca se dibujan y **se calla sobre las que sí**,
 * porque no sabe cuáles llegan a la pantalla. Montando, la pregunta es la de verdad: lo que se ve.
 * Se monta el armazón con **todas** sus palabras sustituidas por marcas y lo que salga sin marcar es
 * texto que se escapó del saco.
 *
 * Ver `verificaciones/marcas.ts` para el arnés, y para por qué la marca aquí **no depende de que
 * falte nada** —que es la trampa en la que cayó la primera versión de `rentas`#103—.
 *
 * <h2>Por qué esto CAZA al componente nuevo que se olvida de declarar su texto</h2>
 *
 * Porque el armazón es **un solo árbol con una sola entrada**. Una pieza nueva del marco se dibuja
 * dentro de `<Armazon>` o no se dibuja en ninguna parte; y en cuanto se dibuja, cualquier palabra que
 * lleve escrita dentro sale sin marcar en alguno de los estados de abajo. No hay que acordarse de
 * añadir nada a ninguna lista: la lista es el árbol.
 *
 * <h2>Los ESTADOS, que son la única lista que sí hay que mantener</h2>
 *
 * Un solo montaje no dibuja el marco entero: el vacío sin destino, el destino que no se ofrece, el
 * árbol sin coincidencias, la paleta abierta —con resultados y sin ellos—, el aviso de cambios y el
 * carril en cajón son pantallas distintas del mismo armazón, y cada una tiene palabras que las otras
 * no. Están recorridas una a una abajo.
 *
 * **El menú de sesión se queda CERRADO, y es deliberado.** Su nombre accesible —lo único que el marco
 * pone ahí— está en el disparador, que se dibuja cerrado; sus opciones son dato del sistema. Abrirlo
 * costaría los 12 409 ms del `DropdownMenu` medidos en #13 y obligaría a mudar este archivo a
 * `test:capas` sin comprobar ni una palabra más.
 *
 * <h2>Lo que NO tiene que estar marcado, y por qué</h2>
 *
 * **Los datos.** El catálogo, el título, la entidad, la cuenta y el pie del carril son de quien monta
 * el armazón, no del marco: aquí entran **ya marcados** desde el fixture, que es la forma de dejarlos
 * fuera de la pregunta sin abrirle un agujero a la guarda. Lo único que queda sin marcar es lo que no
 * es una palabra, y está declarado abajo con su motivo.
 */

beforeAll(() => {
  // Los mismos cuatro remiendos de `armazon.test.tsx`. jsdom no trae ninguno, y Radix, `cmdk` y
  // `sonner` se apoyan en los cuatro.
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

/** El saco entero, marcado clave a clave. Ver `marcarElSaco`. */
const MARCADOS = marcarElSaco(TEXTOS_DEL_ARMAZON);

/**
 * El catálogo del sistema, con sus datos YA marcados.
 *
 * No es un truco para que la guarda pase: es la frontera dicha en el fixture. Los rótulos de los
 * módulos y de las hojas, sus notas y sus instrucciones **son del sistema que consume** y entran por
 * parámetro desde #13; el armazón no los traduce y no tiene con qué. Marcándolos en el origen, lo que
 * quede sin marcar en el DOM es, por construcción, del marco.
 */
const CATALOGO: Catalogo = [
  {
    clave: 'uno',
    rotulo: marca('modulo'),
    nota: marca('modulo.nota'),
    icono: 'capas',
    destinos: [
      {
        clave: 'uno-consulta',
        rotulo: marca('destino.consulta'),
        seEscribe: false,
        instruccion: marca('destino.instruccion'),
      },
      { clave: 'uno-escritura', rotulo: marca('destino.escritura'), seEscribe: true },
    ],
  },
];

/** Lo que llega a la persona sin ser una palabra del marco. Cada uno con su motivo. */
const DATOS_QUE_NO_SE_TRADUCEN = new Set([
  // La cifra de la campana. Un numero no tiene traduccion; lo que la acompana —«3 avisos sin
  // leer»— si, y ese sale del saco, en el `aria-label` y en el `title` del mismo boton.
  '3',
  // Los dos puntos que separan el modulo de su instruccion en la barra gris. Es puntuacion, y va
  // fuera del `<strong>` porque el modulo va en negrita y los dos puntos no.
  ':',
  // La barra de la miga. La dibuja el artboard como adorno y lleva `aria-hidden`.
  '/',
]);

/** Una pantalla que se ensucia al pulsarla. Es lo que levanta el aviso de cambios. */
function PantallaQueSeEnsucia() {
  const { marcarSucia } = useHoja();
  return (
    <button type="button" onClick={marcarSucia}>
      {marca('pantalla')}
    </button>
  );
}

function montar(opciones: { readonly hash?: string; readonly pantalla?: () => ReactNode } = {}) {
  const { hash = '', pantalla = () => <p>{marca('pantalla')}</p> } = opciones;
  window.location.hash = hash;
  return render(
    <Armazon
      titulo={marca('titulo')}
      entidad={marca('entidad')}
      catalogo={CATALOGO}
      cuenta={{ nombre: marca('cuenta'), iniciales: marca('iniciales'), nota: marca('nota') }}
      opcionesDeSesion={[{ rotulo: marca('opcion'), peligrosa: true, al: () => {} }]}
      avisosSinLeer={3}
      pantalla={pantalla}
      acciones={{ guardar: () => {}, limpiar: () => {}, exportar: () => {}, imprimir: () => {} }}
      pieDelCarril={marca('pie')}
      textos={MARCADOS}
    />,
  );
}

/** Lo que se escapó del saco en lo que hay montado ahora mismo. */
function escapadas(): readonly TrozoVisible[] {
  return loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
}

beforeEach(() => {
  window.location.hash = '';
});

describe('EL CENTINELA: el arnes marca de verdad, y ve lo que no esta marcado', () => {
  it('el saco marcado tiene una marca por clave, sea cadena o funcion', () => {
    const claves = Object.keys(TEXTOS_DEL_ARMAZON);
    expect(claves.length, 'el saco se quedo vacio: no habria nada que comprobar').toBeGreaterThan(20);
    for (const clave of claves) {
      const valor = (MARCADOS as unknown as Record<string, unknown>)[clave];
      const puesto = typeof valor === 'function' ? (valor as () => string)() : valor;
      expect(puesto, `«${clave}» no se marco`).toBe(`${ABRE}${clave}${CIERRA}`);
    }
  });

  it('y con un literal DELANTE, el recorrido lo denuncia por las DOS puertas', () => {
    // Esta es la mitad que impide que la guarda pase por estar rota. Si el recorrido no mirara, o
    // mirara donde no es, todo lo de abajo saldria verde sin comprobar nada. Se mete un literal por
    // la unica puerta que el armazon deja —la pantalla, que la dibuja el sistema— y otro por un
    // atributo anunciado, que es donde estaban escondidas tres de las palabras de la barra global y
    // donde un recorrido que solo mire nodos de texto no llega.
    montar({
      hash: '#/uno-consulta',
      pantalla: () => <p aria-label="Un nombre accesible sin marcar">Un literal que nadie tradujo</p>,
    });
    const fuera = escapadas().map((e) => e.texto);
    expect(fuera).toContain('Un literal que nadie tradujo');
    expect(fuera, 'el recorrido no mira los atributos anunciados').toContain(
      'Un nombre accesible sin marcar',
    );
  });
});

describe('EL AC2: montado con todo marcado, no queda una palabra sin marcar', () => {
  it('sin ningun destino abierto: la barra, el carril y el vacio', () => {
    montar();
    expect(screen.getByText(MARCADOS.sinDestinoAbierto)).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El armazon sin destino')).toEqual([]);
  });

  it('con una hoja de CONSULTA abierta: cabecera, miga, instruccion y pie de consulta', () => {
    montar({ hash: '#/uno-consulta' });
    expect(screen.getByRole('button', { name: MARCADOS.exportar })).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El armazon con una hoja de consulta')).toEqual([]);
  });

  it('con una hoja que SE ESCRIBE: el otro par de acciones y el otro aviso del pie', () => {
    montar({ hash: '#/uno-escritura' });
    expect(screen.getByRole('button', { name: MARCADOS.guardar })).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El armazon con una hoja que se escribe')).toEqual([]);
  });

  it('con un hash que el catalogo no ofrece', () => {
    montar({ hash: '#/no-existe' });
    expect(screen.getByText(MARCADOS.destinoNoOfrecido)).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El armazon con un destino no ofrecido')).toEqual([]);
  });

  it('con el filtro del carril sin coincidencias', () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText(MARCADOS.filtrarElCarril), {
      target: { value: 'nada de nada' },
    });
    expect(document.querySelector('[data-slot="arbol-sin-coincidencias"]')).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El arbol sin coincidencias')).toEqual([]);
  });

  it('con la paleta abierta, con resultados y sin ellos', () => {
    montar();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText(MARCADOS.marcadorDeLaPaleta)).toBeTruthy();
    const conResultados = escapadas();
    expect(conResultados, elRojo(conResultados, 'La paleta con resultados')).toEqual([]);

    fireEvent.change(screen.getByPlaceholderText(MARCADOS.marcadorDeLaPaleta), {
      target: { value: 'nada de nada' },
    });
    expect(screen.getByText(MARCADOS.nadaCasaEnLaPaleta)).toBeTruthy();
    const sinResultados = escapadas();
    expect(sinResultados, elRojo(sinResultados, 'La paleta sin resultados')).toEqual([]);
  });

  it('con el aviso de cambios sin guardar abierto, con sus tres salidas', () => {
    montar({ hash: '#/uno-escritura', pantalla: () => <PantallaQueSeEnsucia /> });
    fireEvent.click(screen.getByRole('button', { name: marca('pantalla') }));
    // Salir hacia otra hoja es lo que levanta el aviso.
    fireEvent.click(screen.getByRole('button', { name: marca('destino.consulta') }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El aviso de cambios sin guardar')).toEqual([]);
  });

  it('y con el carril en CAJON, que es la otra forma del mismo arbol', () => {
    // Se monta la pieza directamente porque `useEsEstrecho()` pregunta por `matchMedia`, y el doble
    // de jsdom contesta siempre que no: montar el armazon entero probaria la otra rama.
    render(
      <ProveedorDeLosTextos value={MARCADOS}>
        <CarrilDeModulos
          catalogo={CATALOGO}
          filtro=""
          alFiltrar={() => {}}
          moduloDesplegado="uno"
          alDesplegar={() => {}}
          destinoActual="uno-escritura"
          sucias={new Set(['uno-escritura'])}
          alIr={() => {}}
          enCajon
          abierto
          alCerrarElCajon={() => {}}
          pie={marca('pie')}
        />
      </ProveedorDeLosTextos>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    const fuera = escapadas();
    expect(fuera, elRojo(fuera, 'El carril en cajon')).toEqual([]);
  });
});

describe('EL AC4: sin saco, lo que se ve es lo de siempre', () => {
  it('una pieza suelta SIN proveedor de textos sigue en castellano, en vez de reventar', () => {
    // Las siete piezas se publican sueltas y `armazon.test.tsx` monta esta por su cuenta. Un
    // contexto que reventara sin proveedor —como hacen `useArmazon()` y `useHoja()`, a proposito—
    // convertiria el idioma en un requisito para dibujar un arbol, que es justo el coste que este
    // issue rechaza para `i18next`.
    render(
      <CarrilDeModulos
        catalogo={CATALOGO}
        filtro=""
        alFiltrar={() => {}}
        moduloDesplegado="uno"
        alDesplegar={() => {}}
        destinoActual={null}
        sucias={new Set()}
        alIr={() => {}}
        enCajon
        abierto
        alCerrarElCajon={() => {}}
      />,
    );
    expect(screen.getByText(TEXTOS_DEL_ARMAZON.modulos)).toBeTruthy();
    expect(screen.getByText(TEXTOS_DEL_ARMAZON.elijaUnDestino)).toBeTruthy();
    expect(screen.getByPlaceholderText(TEXTOS_DEL_ARMAZON.filtrarElCarril)).toBeTruthy();
  });

  it('y un saco A MEDIAS deja las demas palabras como estaban', () => {
    // Traducir el marco no puede ser todo o nada: un sistema que solo quiera cambiar una palabra
    // no puede quedarse con treinta huecos. Por eso `textos` es `Partial`.
    window.location.hash = '#/uno-escritura';
    render(
      <Armazon
        titulo={marca('titulo')}
        entidad={marca('entidad')}
        catalogo={CATALOGO}
        cuenta={{ nombre: marca('cuenta'), iniciales: marca('iniciales') }}
        opcionesDeSesion={[]}
        pantalla={() => <p>{marca('pantalla')}</p>}
        acciones={{ guardar: () => {}, limpiar: () => {} }}
        textos={{ guardar: 'Grabar' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Grabar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: TEXTOS_DEL_ARMAZON.limpiar })).toBeTruthy();
    expect(screen.getByRole('button', { name: TEXTOS_DEL_ARMAZON.volver })).toBeTruthy();
  });
});
