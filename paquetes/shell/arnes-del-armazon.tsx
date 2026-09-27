import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { Armazon, type ArmazonProps } from './Armazon.tsx';
import type { Catalogo } from './catalogo.ts';

/**
 * **El armazon montado en una prueba, escrito una vez** (#127).
 *
 * Las cinco suites que montan el `Armazon` entero —`armazon`, `estado-en-la-ruta`,
 * `lo-tecleado-sobrevive`, `navegacion` y `todo-el-texto-del-armazon-es-dato`— se escribian cada una
 * su `montar()`: fijar `window.location.hash` y pintar el `Armazon` con las mismas cinco propiedades
 * de relleno. Lo que cambia de una a otra —el catalogo, la pantalla, las acciones— lo pasa cada suite;
 * lo que no cambia vive aqui.
 *
 * <h2>Por que este archivo no lleva `.test.` en el nombre, y lo que eso implica</h2>
 *
 * Porque no tiene pruebas: con `.test.` Vitest lo cargaria como una suite vacia. Sin el, las guardas
 * lo leen como codigo de produccion de `@kamayuk/shell`, y **eso es lo que se quiere**:
 * `sin-suponer-un-sistema` le barre los prefijos y el vocabulario, `el-texto-visible-es-dato` le
 * mira el JSX y `el-marco-no-decide-permisos` los imports. Por eso aqui no hay ni una palabra dibujada
 * —la pantalla que se ensucia, con su texto, la escribe cada suite— y el catalogo inventado habla de
 * un almacen y una flota, que no son de ningun sistema. Los dos centinelas lo declaran. No se exporta
 * desde `index.ts`: no viaja en el paquete servido.
 */

/**
 * **Dos modulos inventados.** `alm-entradas` se escribe y se enlaza con un slug propio; los otros dos
 * son de consulta, y `alm-panel` es el unico con instruccion. Es todo lo que el armazon va a saber del
 * sistema que lo monta.
 *
 * «Almacen» y «Flota» no son modulos de ningun sistema del producto: si el armazon tuviera dentro un
 * arbol propio, una lista de slugs o un mapa de rotulos, no dibujaria esto. Una funcion y no una
 * constante: cada suite recibe su copia y ninguna puede ensuciar la de otra.
 */
export function catalogoInventado(): Catalogo {
  return [
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
}

/**
 * El relleno de siempre: lo que el armazon exige y a ninguna suite le importa. Va como objeto y no
 * como valores por omision de una firma, porque un valor por omision de `titulo` es la tercera puerta
 * que mira `el-texto-visible-es-dato`, y aqui no hay ninguna palabra del marco.
 */
const RELLENO = {
  titulo: 'Sistema de prueba',
  entidad: 'Entidad de prueba',
  cuenta: { nombre: 'J. Ruiz', iniciales: 'JR' },
  opcionesDeSesion: [],
  pantalla: () => null,
} satisfies Partial<ArmazonProps>;

/**
 * Lo que una suite le pasa al armazon: cualquiera de sus propiedades, y la direccion con la que se
 * abre. Lo que no pase lleva el relleno de arriba y el catalogo inventado.
 */
export type OpcionesDelArmazon = Partial<ArmazonProps> & {
  /** El `hash` con el que se abre, que es lo que el navegador trae al cargar. Por omision, ninguno. */
  readonly hash?: string;
};

/** El armazon de la prueba, SIN montarlo: es lo que se le da a un `rerender`. */
export function armazonDePrueba(propiedades: Partial<ArmazonProps> = {}): ReactElement {
  return <Armazon {...RELLENO} catalogo={catalogoInventado()} {...propiedades} />;
}

/**
 * Fija la direccion y monta el armazon. **La direccion antes que el armazon**: el marco la lee al
 * montarse, igual que al cargar la pagina, y una que se escribiera despues seria una navegacion.
 */
export function montarElArmazon(opciones: OpcionesDelArmazon = {}) {
  const { hash = '', ...propiedades } = opciones;
  window.location.hash = hash;
  return render(armazonDePrueba(propiedades));
}

/** Abre el modulo en el arbol, si no lo estaba ya, y pulsa una de sus hojas. */
export function irPorElArbol(modulo: string, hoja: string): void {
  const disparador = screen.getByRole('button', { name: new RegExp(modulo) });
  if (disparador.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(disparador);
  }
  fireEvent.click(screen.getByRole('button', { name: new RegExp(hoja) }));
}
