import { createContext, useContext } from 'react';

import type { NavegacionDeLaPantalla, PeticionDeNavegacion } from '../ui/index.ts';

/**
 * **Ir a otra hoja desde una pantalla, por el mismo sitio que el arbol** (#66, `navegar-a-otra-hoja`).
 *
 * Hasta #66 una pantalla no podia llevar a otro destino: `HojaAbierta` solo sabia marcarse sucia, y
 * el `irA` que respeta el aviso de cambios vivia dentro de `Cascara` sin salir de ahi (#61, H12). Lo
 * que aqui se expone es **ese mismo `irA`**, y no uno nuevo: una segunda forma de navegar que no
 * preguntara por los cambios sin guardar perderia el trabajo justo por la puerta que nadie prueba.
 *
 * <h2>Dos garantias, y las dos las da el marco y no la pantalla</h2>
 *
 *   · **Lo que el catalogo no ofrece no se abre.** `ofrece` mira el mismo indice que dibuja el arbol,
 *     la paleta y la miga, y `ir` lo vuelve a mirar antes de moverse: una pantalla que llamara a `ir`
 *     sin preguntar no abre nada, ni pregunta si perder los cambios por ir a ninguna parte.
 *   · **Con la hoja sucia, pregunta.** Pasa por `irA`, asi que salta `AvisoDeCambios` y el destino
 *     —con su sujeto y sus parametros— espera en `pendiente` hasta que se conteste.
 *
 * <h2>Donde viajan el sujeto y los parametros lo decide #67, y se escribe en UN sitio</h2>
 *
 * `ubicacionDe` es la unica funcion que lo escribe. Hasta que #67 decida la ruta, van en la busqueda
 * —`#/<slug>?sujeto=42&estado=BAJA`— y no en el camino, porque `#/entradas/` tiene que seguir sin
 * abrir nada (`armazon.test.tsx`, #20) y el camino lo lee `useHojaDeLaRuta` entero como slug.
 */

/** Lo que pasa al pedir ir a otra hoja. */
export type ResultadoDeIr =
  /** Se fue. */
  | 'abierta'
  /** La hoja de la que se sale tiene cambios: el aviso pregunta, y el destino espera. */
  | 'pregunta'
  /** El catalogo de hoy no la ofrece: ni se abre, ni se pregunta nada. */
  | 'no-ofrecida';

/** Lo que una pantalla recibe del marco. Cabe tal cual en `<Pantalla navegacion>` de `@kamayuk/ui`. */
export interface NavegacionDelArmazon extends NavegacionDeLaPantalla {
  readonly ofrece: (clave: string) => boolean;
  readonly ir: (peticion: PeticionDeNavegacion) => ResultadoDeIr;
}

/** El sujeto y los parametros de un destino, lo que acompana a la clave. */
export type ExtraDeLaPeticion = Pick<PeticionDeNavegacion, 'sujeto' | 'parametros'>;

/**
 * **La direccion de un destino con su sujeto y sus parametros.** El unico sitio que la escribe.
 *
 * Sin sujeto ni parametros, `/<slug>` tal cual: la forma canonica de #13 no cambia, y `rentas` —que
 * no pasa ninguno— no cambia de URL. El sujeto va primero, y un parametro que se llame `sujeto` no lo
 * pisa.
 */
export function ubicacionDe(slug: string, extra: ExtraDeLaPeticion = {}): string {
  const busqueda = new URLSearchParams();
  if (extra.sujeto !== undefined && extra.sujeto !== '') busqueda.set('sujeto', extra.sujeto);
  for (const [clave, valor] of Object.entries(extra.parametros ?? {})) {
    if (!busqueda.has(clave)) busqueda.set(clave, valor);
  }
  const cadena = busqueda.toString();
  return cadena === '' ? `/${slug}` : `/${slug}?${cadena}`;
}

const DeLaNavegacion = createContext<NavegacionDelArmazon | null>(null);

export const ProveedorDeLaNavegacion = DeLaNavegacion.Provider;

/** Como ir a otra hoja. Revienta fuera del `<Armazon>`: fuera no hay catalogo que consultar. */
export function useNavegacion(): NavegacionDelArmazon {
  const valor = useContext(DeLaNavegacion);
  if (valor === null) {
    throw new Error(
      'useNavegacion() fuera del <Armazon>. Devolver una que no navega dejaria botones que no hacen ' +
        'nada al pulsarlos; sin ella, `<Pantalla>` los dibuja impedidos y con su motivo.',
    );
  }
  return valor;
}
