import { createContext, useContext } from 'react';

import { EL_SUJETO, type NavegacionDeLaPantalla, type PeticionDeNavegacion } from '../ui/index.ts';

import { escribirLaRuta } from './ruta.ts';

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
 * <h2>Donde viajan el sujeto y los parametros lo decidio #67</h2>
 *
 * `#/<slug>/<sujeto>?<parametro>=<valor>`, y **solo lo que el destino declara** en `enLaRuta`: lo
 * demas se ignora con aviso, igual que si llegara escrito en la barra. `#/entradas/` sigue sin abrir
 * nada (#20): una barra sin sujeto no es ninguna de las formas. Ver `ruta.ts`.
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
 * **La direccion de un destino con su sujeto y sus parametros**, en la forma de #67:
 * `/<slug>/<sujeto>?<parametro>=<valor>`.
 *
 * #66 la escribio provisional —el sujeto en la busqueda, `?sujeto=42`— a la espera de que #67
 * decidiera la ruta; ahora la escribe `escribirLaRuta`, la MISMA que usa `useHoja().moverLaRuta`, y
 * la lee `leerLaRuta`. Asi `ir` y la lectura de la ruta no pueden decir cosas distintas: lo vigila
 * `navegacion.test.tsx` leyendo lo que esto escribe.
 *
 * Sin sujeto ni parametros, `/<slug>` tal cual: la forma canonica de #13 no cambia, y `rentas` —que
 * no pasa ninguno— no cambia de URL. Un parametro que se llame `sujeto` no lo pisa: se descarta,
 * porque ese nombre es el del tramo del camino.
 *
 * **No filtra por lo que el destino declara**: eso lo hace el marco al navegar, que es quien tiene
 * el catalogo (`rutaDeLaHoja`). Esto solo escribe.
 */
export function ubicacionDe(slug: string, extra: ExtraDeLaPeticion = {}): string {
  const parametros = Object.fromEntries(
    Object.entries(extra.parametros ?? {}).filter(([clave]) => clave !== EL_SUJETO),
  );
  const sujeto = extra.sujeto === undefined || extra.sujeto === '' ? null : extra.sujeto;
  return escribirLaRuta(slug, { sujeto, parametros });
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
