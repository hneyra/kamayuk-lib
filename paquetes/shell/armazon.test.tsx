import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Armazon } from './Armazon.tsx';
import { CarrilDeModulos } from './CarrilDeModulos.tsx';
import type { Catalogo } from './catalogo.ts';
import { useHoja, type ConfiguracionDelArmazon } from './contexto.tsx';

/**
 * **El armazón montado entero, con un catálogo INVENTADO** (#13: AC3, AC4, AC5, AC6, AC7 y AC8).
 *
 * <h2>Por qué el catálogo está inventado, y por qué eso es la prueba</h2>
 *
 * «Almacén» y «Flota» no son módulos de ningún sistema del producto: están escritos aquí y en
 * ninguna otra parte. Si el armazón tuviera dentro un árbol propio, una lista de slugs o un mapa de
 * rótulos, **ninguna de estas pruebas pasaría**, porque el marco no dibujaría nada de esto. Es la
 * única demostración de que sirve para el segundo sistema que lo estrene, que es lo que el AC3 pide
 * con todas las letras.
 *
 * <h2>Las capas que se abren aquí, y por qué este archivo no se llama `capa-`</h2>
 *
 * Se abren dos: el diálogo de `cmdk` —la paleta— y el `AlertDialog` del aviso de cambios. Las dos se
 * midieron en #13 y no llevan posicionador: 227 ms y 208 ms de archivo, frente a los 12 409 ms del
 * `DropdownMenu`. Lo caro es `@radix-ui/react-popper`, no la capa; el desglose está en
 * `paquetes/ui/shadcn/capa-del-menu.test.tsx`. El menú de sesión que la barra monta está aquí
 * CERRADO, que es lo barato.
 */

beforeAll(() => {
  // Los mismos cuatro remiendos de `piezas-del-armazon.test.tsx`. jsdom no trae ninguno de ellos y
  // Radix, `cmdk` y `sonner` se apoyan en los cuatro.
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

/**
 * Dos modulos inventados. `alm-entradas` se escribe y se enlaza con un slug propio; los otros dos
 * son de consulta. Es todo lo que el armazon va a saber del sistema que lo monta.
 */
const CATALOGO: Catalogo = [
  {
    clave: 'almacen',
    rotulo: 'Almacen',
    nota: 'Lo que entra y lo que sale',
    icono: 'capas',
    destinos: [
      {
        clave: 'alm-panel',
        rotulo: 'Panel del almacen',
        seEscribe: false,
        instruccion: 'revise lo que entro y lo que salio hoy.',
      },
      { clave: 'alm-entradas', rotulo: 'Entradas', seEscribe: true, slug: 'entradas' },
    ],
  },
  {
    clave: 'flota',
    rotulo: 'Flota',
    nota: 'Los vehiculos y sus turnos',
    icono: 'vehiculo',
    destinos: [{ clave: 'flo-turnos', rotulo: 'Turnos', seEscribe: true }],
  },
];

/** La pantalla que el sistema aporta. Se ensucia sola al pulsar, que es lo que hace una de verdad. */
function PantallaDePrueba({ clave }: { readonly clave: string }) {
  const { marcarSucia, sucia } = useHoja();
  return (
    <div>
      <p>Contenido de {clave}</p>
      <button type="button" onClick={marcarSucia}>
        Escribir algo
      </button>
      <p>{sucia ? 'esta sucia' : 'esta limpia'}</p>
    </div>
  );
}

function montar(
  opciones: {
    readonly catalogo?: Catalogo;
    readonly hash?: string;
    readonly acciones?: ConfiguracionDelArmazon['acciones'];
  } = {},
) {
  const { catalogo = CATALOGO, hash = '', acciones } = opciones;
  window.location.hash = hash;
  return render(
    <Armazon
      titulo="Sistema de prueba"
      entidad="Entidad de prueba"
      catalogo={catalogo}
      cuenta={{ nombre: 'J. Ruiz', iniciales: 'JR', nota: 'ventanilla' }}
      opcionesDeSesion={[{ rotulo: 'Cerrar sesion', peligrosa: true, al: () => {} }]}
      pantalla={(hoja) => <PantallaDePrueba clave={hoja.destino.clave} />}
      acciones={acciones}
      pieDelCarril="Dos modulos inventados."
    />,
  );
}

/** Abre el modulo en el arbol y pulsa una de sus hojas. */
function irPorElArbol(modulo: string, hoja: string): void {
  const disparador = screen.getByRole('button', { name: new RegExp(modulo) });
  if (disparador.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(disparador);
  }
  fireEvent.click(screen.getByRole('button', { name: new RegExp(hoja) }));
}

beforeEach(() => {
  window.location.hash = '';
});

describe('EL AC3: el arbol, la paleta y la cabecera se alimentan del catalogo que entra', () => {
  it('dibuja los dos modulos INVENTADOS, y abre una de sus hojas', () => {
    montar();

    // Los dos rotulos salen del argumento y de ningun otro sitio: el paquete no los tiene escritos.
    expect(screen.getByRole('button', { name: /Almacen/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Flota/ })).toBeTruthy();
    // Y sin ninguna hoja abierta, lo que se ve es el vacio y no una pantalla en blanco muda.
    expect(screen.getByText(/No hay ningun destino abierto/)).toBeTruthy();

    irPorElArbol('Almacen', 'Panel del almacen');

    // La pantalla la dibuja el sistema, no el armazon.
    expect(screen.getByText('Contenido de alm-panel')).toBeTruthy();
    // Y la cabecera —la tercera lista— nombra el modulo y la hoja, los dos del catalogo.
    const miga = screen.getByRole('navigation', { name: 'Ruta' });
    expect(miga.textContent).toContain('Almacen');
    expect(miga.textContent).toContain('Panel del almacen');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Panel del almacen');
  });

  it('un catalogo DISTINTO da un marco distinto, sin tocar una linea del armazon', () => {
    // Es la mitad del AC3 que no se ve con un solo catalogo: el mismo componente, otro sistema.
    const otro: Catalogo = [
      {
        clave: 'padron',
        rotulo: 'Padron',
        nota: 'Las fichas',
        icono: 'documento',
        destinos: [{ clave: 'pad-fichas', rotulo: 'Fichas', seEscribe: false }],
      },
    ];
    montar({ catalogo: otro });

    expect(screen.getByRole('button', { name: /Padron/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Almacen/ })).toBeNull();
    irPorElArbol('Padron', 'Fichas');
    expect(screen.getByText('Contenido de pad-fichas')).toBeTruthy();
  });
});

describe('el carril en pantalla estrecha', () => {
  it('es el MISMO arbol, dentro de un cajon', () => {
    // V8 esconde el carril por debajo de 1 040 px con una regla de su hoja de estilos, y ahi deja un
    // agujero: sin el, la unica forma de llegar a otro modulo es la paleta, que se abre con un atajo
    // de teclado — y en una pantalla estrecha eso suele significar que no hay teclado.
    //
    // Se monta la pieza directamente porque `useEsEstrecho()` pregunta por `matchMedia`, y el doble
    // de jsdom contesta siempre que no: montar el armazon entero probaria la otra rama.
    const ido: string[] = [];
    render(
      <CarrilDeModulos
        catalogo={CATALOGO}
        filtro=""
        alFiltrar={() => {}}
        moduloDesplegado="flota"
        alDesplegar={() => {}}
        destinoActual={null}
        sucias={new Set()}
        alIr={(clave) => ido.push(clave)}
        enCajon
        abierto
        alCerrarElCajon={() => {}}
      />,
    );

    const panel = screen.getByRole('dialog');
    expect(panel.getAttribute('data-lado')).toBe('izquierda');
    expect(panel.querySelector('[data-slot="arbol-de-modulos"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Turnos/ }));
    expect(ido).toEqual(['flo-turnos']);
  });

  it('y en pantalla ancha, plegado, no deja rastro en el documento', () => {
    render(
      <CarrilDeModulos
        catalogo={CATALOGO}
        filtro=""
        alFiltrar={() => {}}
        moduloDesplegado={null}
        alDesplegar={() => {}}
        destinoActual={null}
        sucias={new Set()}
        alIr={() => {}}
        enCajon={false}
        abierto={false}
        alCerrarElCajon={() => {}}
      />,
    );
    // Y no «escondido con CSS»: un arbol con `display:none` sigue siendo alcanzable con el tabulador
    // y sigue estando en el arbol de accesibilidad de algunos lectores.
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button', { name: /Almacen/ })).toBeNull();
  });
});

/**
 * **La barra de instruccion** (#15).
 *
 * Su defecto era el mas silencioso posible: `CabeceraDePantalla` sabia dibujarla y `Armazon` no
 * se la pasaba nunca, asi que **no se dibujaba en ningun sistema** — y la cabecera salia entera y
 * correcta sin ella, con su miga, su titulo y su nota. Una pantalla a la que le falta la
 * instruccion parece una pantalla, no un defecto. Lo destapo `rentas`#90 al montar la aplicacion
 * de verdad: cuarenta pruebas pidiendo un texto que nadie dibujaba.
 */
describe('la barra de instruccion', () => {
  it('sale con el modulo en negrita delante, que es como V8 la escribe', () => {
    montar({ hash: '#/alm-panel' });
    const barra = screen.getByText(/revise lo que entro y lo que salio hoy/);
    expect(barra).toBeTruthy();
    // El modulo va delante y en negrita: es lo que dice de QUE procedimiento se habla.
    expect(barra.querySelector('strong')?.textContent).toBe('Almacen:');
  });

  it('y un destino SIN instruccion no dibuja la barra, en vez de dibujarla vacia', () => {
    // Un filo que encierra nada es peor que ningun filo: se lee como un hueco donde falta algo.
    montar({ hash: '#/flo-turnos' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turnos');
    expect(screen.queryByText(/revise lo que entro/)).toBeNull();
    expect(document.querySelector('[data-slot="cabecera-de-pantalla"] .bg-sup')).toBeNull();
  });
});

describe('EL AC4: lo que el catalogo no trae no se ofrece en ninguna parte', () => {
  /** El mismo catalogo sin «Flota»: lo que verian dos cuentas con permisos distintos. */
  const SIN_FLOTA = CATALOGO.filter((modulo) => modulo.clave !== 'flota');

  it('ni en el arbol', () => {
    montar({ catalogo: SIN_FLOTA });
    expect(screen.getByRole('button', { name: /Almacen/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Flota/ })).toBeNull();
    expect(screen.queryByText('Turnos')).toBeNull();
  });

  it('ni en la paleta, ni aunque se escriba su nombre entero', () => {
    montar({ catalogo: SIN_FLOTA });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    fireEvent.change(screen.getByPlaceholderText(/Un modulo o un destino/), {
      target: { value: 'Turnos' },
    });

    expect(screen.queryByRole('option', { name: /Turnos/ })).toBeNull();
    // Y el pie no lo cuenta: si lo contara, la paleta estaria confirmando que existe algo que no
    // ofrece, que es la peor de las dos formas de fallar.
    expect(screen.getByText('0 de 2 destinos')).toBeTruthy();
  });

  it('EL CENTINELA: con el modulo en el catalogo, ese MISMO hash si abre la pantalla', () => {
    // Sin esta mitad, la de abajo pasaria igual con un armazon que no abriera nada por hash — que
    // es una guarda cumpliendose por estar rota.
    montar({ hash: '#/flo-turnos' });
    expect(screen.getByText('Contenido de flo-turnos')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turnos');
  });

  it('NI POR EL HASH, que es la puerta que las tres listas no cierran', () => {
    // Un enlace viejo, una direccion pegada o la vuelta de la autenticacion escriben el hash sin
    // pasar por ninguna lista.
    montar({ catalogo: SIN_FLOTA, hash: '#/flo-turnos' });

    expect(screen.queryByText('Contenido de flo-turnos')).toBeNull();
    expect(screen.getByText(/no corresponde a ningun destino disponible/)).toBeTruthy();
    // Se DICE, no se salta en silencio a la raiz: un salto mudo deja a quien siguio el enlace
    // mirando una pantalla vacia sin saber por que, y a quien depura sin nada que buscar.
    expect(screen.queryByText(/No hay ningun destino abierto/)).toBeNull();
  });
});

describe('EL AC5: el enrutado es por hash, y no toca la ruta de verdad', () => {
  it('abrir una hoja escribe el hash y deja la ruta como estaba', () => {
    const antes = window.location.pathname;
    montar();
    irPorElArbol('Almacen', 'Panel del almacen');

    expect(window.location.hash).toBe('#/alm-panel');
    // La raiz de la aplicacion no se mueve: es la URI de retorno que vive en el realm de Keycloak
    // (`rentas`#73). Con rutas de verdad, cada destino enlazable exigiria la suya registrada.
    expect(window.location.pathname).toBe(antes);
  });

  it('el slug propio de una hoja es el que viaja al hash', () => {
    montar();
    irPorElArbol('Almacen', 'Entradas');
    expect(window.location.hash).toBe('#/entradas');
    expect(screen.getByText('Contenido de alm-entradas')).toBeTruthy();
  });

  it('y un hash abre su hoja al arrancar, con su modulo YA desplegado en el arbol', () => {
    montar({ hash: '#/entradas' });
    expect(screen.getByText('Contenido de alm-entradas')).toBeTruthy();
    // Sin esto, la hoja actual quedaria marcada dentro de un modulo plegado: el arbol diria que no
    // hay nada abierto mientras hay algo abierto.
    expect(
      screen.getByRole('button', { name: /Almacen/ }).getAttribute('aria-expanded'),
    ).toBe('true');
  });
});

describe('EL AC6: salir de una hoja sucia pregunta, y las tres salidas hacen lo que dicen', () => {
  /** Abre `alm-entradas`, la ensucia y pide salir a otra hoja. Deja el aviso en pantalla. */
  function ensuciarYSalir(acciones?: ConfiguracionDelArmazon['acciones']) {
    montar({ hash: '#/entradas', acciones });
    fireEvent.click(screen.getByRole('button', { name: 'Escribir algo' }));
    expect(screen.getByText('esta sucia')).toBeTruthy();
    // Y la marca sale en el arbol, que es lo que V8 pone EN LUGAR de la tira de pestanas.
    expect(screen.getAllByText('sin guardar').length).toBeGreaterThan(0);

    irPorElArbol('Almacen', 'Panel del almacen');
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Entradas tiene cambios sin guardar',
    );
  }

  it('«Guardar y cerrar» guarda POR EL SISTEMA y entonces sale', () => {
    const guardar = vi.fn();
    ensuciarYSalir({ guardar });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar y cerrar' }));

    // El armazon no sabe guardar nada: avisa a quien sabe, con la clave de la hoja.
    expect(guardar).toHaveBeenCalledWith('alm-entradas');
    expect(screen.getByText('Contenido de alm-panel')).toBeTruthy();
    expect(window.location.hash).toBe('#/alm-panel');
    // Y la hoja deja de estar sucia: la marca se va del arbol.
    expect(screen.queryByText('sin guardar')).toBeNull();
  });

  it('«Salir y perder los cambios» sale SIN guardar, y no vuelve a preguntar', () => {
    const guardar = vi.fn();
    ensuciarYSalir({ guardar });

    fireEvent.click(screen.getByRole('button', { name: 'Salir y perder los cambios' }));

    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByText('Contenido de alm-panel')).toBeTruthy();
    expect(screen.queryByText('sin guardar')).toBeNull();
  });

  it('«Seguir editando» no sale, y la hoja SIGUE sucia', () => {
    const guardar = vi.fn();
    ensuciarYSalir({ guardar });

    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));

    expect(guardar).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Contenido de alm-entradas')).toBeTruthy();
    expect(window.location.hash).toBe('#/entradas');
    // ESTA es la fila que se rompe sin que se note: un «cancelar» que limpiara la marca dejaria la
    // SIGUIENTE salida sin preguntar nada, y el trabajo se perderia en la segunda.
    expect(screen.getByText('esta sucia')).toBeTruthy();
    expect(screen.getAllByText('sin guardar').length).toBeGreaterThan(0);
  });

  it('y `Esc` sobre el aviso es «seguir editando», no «salir»', () => {
    // Medido en `paquetes/ui/shadcn/piezas-del-armazon.test.tsx`: Radix NO le quita el `Esc` al
    // `AlertDialog`. Asi que el cierre tiene que caer en la salida inocua; si cayera en «salir», la
    // tecla que todo el mundo pulsa para quitarse un dialogo de encima perderia el trabajo.
    const guardar = vi.fn();
    ensuciarYSalir({ guardar });

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByText('Contenido de alm-entradas')).toBeTruthy();
    expect(screen.getByText('esta sucia')).toBeTruthy();
  });

  it('y una hoja LIMPIA sale sin preguntar nada', () => {
    montar({ hash: '#/entradas' });
    irPorElArbol('Almacen', 'Panel del almacen');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Contenido de alm-panel')).toBeTruthy();
  });
});

describe('EL AC7: la paleta se abre con Ctrl+K y con Cmd+K', () => {
  it('con Ctrl+K, filtra, y navegar por ella la cierra', () => {
    montar();
    expect(screen.queryByPlaceholderText(/Un modulo o un destino/)).toBeNull();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText(/Un modulo o un destino/)).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('3 de 3 destinos')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Un modulo o un destino/), {
      target: { value: 'turn' },
    });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['TurnosFlota']);
    expect(screen.getByText('1 de 3 destinos')).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: /Turnos/ }));

    expect(screen.getByText('Contenido de flo-turnos')).toBeTruthy();
    // Y se va: una paleta que se queda abierta encima de la pantalla que acaba de abrir obliga a
    // un gesto mas para ver lo que se pidio.
    expect(screen.queryByPlaceholderText(/Un modulo o un destino/)).toBeNull();
  });

  it('con Cmd+K, que es la MISMA tecla en el otro teclado', () => {
    // Las dos, y no una: con solo `ctrlKey`, el atajo no existe en un Mac; con solo `metaKey`, no
    // existe en ninguna de las maquinas de una ventanilla.
    montar();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/Un modulo o un destino/)).toBeTruthy();
  });

  it('y el boton de la barra la abre igual, que es como se aprende el atajo', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    expect(screen.getByPlaceholderText(/Un modulo o un destino/)).toBeTruthy();
  });
});

describe('EL AC8: las acciones al pie las decide el dato', () => {
  it('una pantalla que se ESCRIBE ofrece limpiar y guardar', () => {
    const acciones = { limpiar: vi.fn(), guardar: vi.fn() };
    montar({ hash: '#/entradas', acciones });

    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Imprimir' })).toBeNull();
    expect(screen.getByText('Nada se escribe hasta que pulse Guardar.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(acciones.guardar).toHaveBeenCalledWith('alm-entradas');
  });

  it('una de solo CONSULTA ofrece exportar e imprimir, en la MISMA pantalla', () => {
    const acciones = { exportar: vi.fn(), imprimir: vi.fn() };
    montar({ hash: '#/alm-panel', acciones });

    expect(screen.getByRole('button', { name: 'Exportar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    expect(screen.getByText('Los datos son los que figuran a la fecha de hoy.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(acciones.exportar).toHaveBeenCalledWith('alm-panel');
  });

  it('una accion que el sistema no atiende se dibuja DESHABILITADA, no se esconde', () => {
    // Un pie con un solo boton donde deberia haber dos se lee como una pantalla a medias, y uno que
    // no responde al pulsarlo se lee como una averia.
    montar({ hash: '#/alm-panel' });
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
  });
});
