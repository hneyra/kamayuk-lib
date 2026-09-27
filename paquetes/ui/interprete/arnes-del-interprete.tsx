import { render } from '@testing-library/react';
import { useState, type ReactElement } from 'react';

import type { Ausencia, DatosDeLaPantalla } from './datos.ts';
import { actoEnLaRuta, type CambioDeLaRuta, type HojaDelMarco, type RutaDeLaHoja } from './hoja.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDePantalla, PiezaDeLaPantalla, TonoDeInsignia } from './tipos.ts';

/**
 * **La pantalla montada en una prueba del interprete, escrita una vez** (#127).
 *
 * Hasta #127 cada suite se escribia lo suyo: `SIN_FRASE` en siete archivos, `monta` en seis,
 * `ConHoja` en cuatro —con un reductor de dieciocho lineas que imita al marco copiado letra a letra—
 * y `descripcionDe` en dos. Lo que variaba de una copia a otra (el formulario de fuera, el tono de la
 * insignia, lo que dice el hueco de un campo sin dato) son aqui opciones con nombre.
 *
 * **Todo monta por `<Pantalla>`**, y por tanto con el entorno del interprete que ella da
 * (`entorno.tsx`, #125): ninguna pieza se prueba suelta por aqui, porque una pieza fuera de
 * `<Pantalla>` revienta a proposito.
 *
 * <h2>Por que este archivo no lleva `.test.` en el nombre, y lo que eso implica</h2>
 *
 * Porque no tiene pruebas: con `.test.` Vitest lo cargaria como una suite vacia. Sin el, las guardas
 * lo leen como codigo de produccion de `@kamayuk/ui`, como leen ya las `muestras-*.ts` de este
 * directorio, y **eso es lo que se quiere**: `sin-suponer-un-sistema` le barre el vocabulario y
 * `el-texto-visible-es-dato` le mira el JSX. Por eso aqui no hay ni una palabra: lo que el hueco de un
 * campo dice lo pone la suite que lo comprueba. Los dos centinelas lo declaran. No se exporta desde
 * `index.ts`: no viaja en el paquete servido.
 */

/** Una pantalla sin frase para la pantalla entera: sus estados, si los tiene, van por lectura. */
export const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const satisfies Ausencia;

/** La misma ausencia, con lo que dice el hueco de un campo: para la suite que comprueba ese texto. */
export function ausenciaQueDice(enElCampo: string): Ausencia {
  return { ...SIN_FRASE, enElCampo };
}

/** El tono de insignia de las pruebas que no miran el color de ninguna. */
const TONO_DE_SIEMPRE = (): TonoDeInsignia => 'ok';

/**
 * Radix acompana el disparador de un desplegable con un `<select>` nativo **solo dentro de un
 * formulario**, y es el que se lee para no abrir su capa (el motivo, medido, en
 * `shadcn/capa-del-desplegable.test.tsx`). Con un acto no se envuelve: el acto ES un `<form>`, y
 * anidarlos no es HTML valido —React lo dice en la consola—.
 */
function envuelto(pantalla: ReactElement, enUnFormulario: boolean): ReactElement {
  return enUnFormulario ? <form>{pantalla}</form> : pantalla;
}

/** Lo que cambia de una suite a otra al montar una pantalla. */
export interface ComoSeMonta {
  /** La ausencia de la pantalla. Por omision, `SIN_FRASE`. */
  readonly ausencia?: Ausencia;
  /** Por omision, todo `ok`. */
  readonly tonoDeLaInsignia?: (texto: string) => TonoDeInsignia;
  /** Dentro de un `<form>`, para leer un desplegable por su `<select>`. Por omision, no. */
  readonly enUnFormulario?: boolean;
}

/** El tipo de `monta`: la definicion, los datos que se anaden a la ausencia y las `props` de encima. */
export type Montador = (
  definicion: DefinicionDePantalla<PiezaDeLaPantalla>,
  datos?: Partial<DatosDeLaPantalla>,
  extra?: Partial<PantallaProps>,
) => ReturnType<typeof render>;

/**
 * Un `monta` con lo de una suite. La que no necesita nada distinto usa `monta`, que es este con
 * todo por omision.
 */
export function montadorDeLaPantalla({
  ausencia = SIN_FRASE,
  tonoDeLaInsignia = TONO_DE_SIEMPRE,
  enUnFormulario = false,
}: ComoSeMonta = {}): Montador {
  return (definicion, datos = {}, extra = {}) =>
    render(
      envuelto(
        <Pantalla
          definicion={definicion}
          datos={{ ausencia, ...datos }}
          tonoDeLaInsignia={tonoDeLaInsignia}
          {...extra}
        />,
        enUnFormulario,
      ),
    );
}

/** Monta la pantalla SIN marco: la ausencia `SIN_FRASE`, todo `ok` y sin formulario. */
export const monta: Montador = montadorDeLaPantalla();

/** La ruta de una hoja recien abierta: sin sujeto y sin parametros. */
export const RUTA_VACIA: RutaDeLaHoja = { sujeto: null, parametros: {} };

/**
 * Lo que hace el marco con la ruta cuando la pantalla pide moverla: el sujeto, si viene, sustituye
 * al de antes; los parametros se funden, y uno que llega a `null` se quita. Es el marco sin el hash.
 */
function rutaTrasElCambio(antes: RutaDeLaHoja, cambio: CambioDeLaRuta): RutaDeLaHoja {
  return {
    sujeto: cambio.sujeto === undefined ? antes.sujeto : cambio.sujeto,
    parametros: Object.fromEntries(
      Object.entries({ ...antes.parametros, ...cambio.parametros }).filter(
        (par): par is [string, string] => par[1] !== null,
      ),
    ),
  };
}

/** Las `props` de `ConHoja`. */
export interface PropsDeConHoja extends ComoSeMonta {
  /** La ruta con la que se abre. Recargar es montar con una ruta que ya trae la eleccion. */
  readonly inicial?: RutaDeLaHoja;
  /** Donde se anota cada cambio que la pantalla pide, en orden. */
  readonly cambios: CambioDeLaRuta[];
  readonly definicion: DefinicionDePantalla<PiezaDeLaPantalla>;
  /** Por omision, solo la ausencia. */
  readonly datos?: DatosDeLaPantalla;
  /** Las `props` de la pantalla que la suite quiera encima. */
  readonly extra?: Partial<PantallaProps>;
  /** Lo que el marco pone en la hoja ademas de la ruta, como el ejercicio. */
  readonly marco?: HojaDelMarco['marco'];
  /** El acto abierto sale de la ruta, con `actoEnLaRuta`, en vez de ser `props` de la suite. */
  readonly conElActoEnLaRuta?: boolean;
}

/**
 * **Una hoja de prueba**: la ruta en un estado y cada cambio anotado. Es lo que el marco hace con el
 * hash, sin el hash: la mitad «recargar restituye» con la barra de direcciones de verdad la miden
 * las suites del armazon, en `@kamayuk/shell`.
 */
export function ConHoja({
  inicial = RUTA_VACIA,
  cambios,
  definicion,
  datos,
  extra = {},
  marco,
  conElActoEnLaRuta = false,
  ausencia = SIN_FRASE,
  tonoDeLaInsignia = TONO_DE_SIEMPRE,
  enUnFormulario = false,
}: PropsDeConHoja) {
  const [ruta, setRuta] = useState<RutaDeLaHoja>(inicial);
  const hoja: HojaDelMarco = {
    ruta,
    ...(marco === undefined ? {} : { marco }),
    moverLaRuta: (cambio) => {
      cambios.push(cambio);
      setRuta((antes) => rutaTrasElCambio(antes, cambio));
    },
  };
  const conActo = conElActoEnLaRuta ? actoEnLaRuta(hoja) : {};
  return envuelto(
    <Pantalla
      definicion={definicion}
      datos={datos ?? { ausencia }}
      tonoDeLaInsignia={tonoDeLaInsignia}
      hoja={hoja}
      {...extra}
      {...conActo}
    />,
    enUnFormulario,
  );
}

/**
 * Lo que un lector de pantalla oye al llegar a un elemento, ademas de su nombre: el texto de cada
 * `aria-describedby`, en orden. Un id que no existe sale nombrado, para que el rojo lo diga.
 */
export function descripcionDe(elemento: HTMLElement): string {
  return (elemento.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent ?? `«${id} no existe»`)
    .join(' ');
}
