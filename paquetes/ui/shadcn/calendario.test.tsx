// @vitest-environment node
//
// EL DOM SE FABRICA A MANO, y no es capricho: esta guarda necesita las dos cosas a la vez —el
// arbol que `react-day-picker` produce, para subir por los ancestros, y la paleta del disco, para
// medirla—. Y en el entorno `jsdom` de vitest `import.meta.url` no es un `file:`, asi que
// `temas/base.ts` revienta al cargarse con «The URL must be of scheme file». Se renderiza a texto
// y se monta ese texto en un `JSDOM` propio, que da el mismo arbol sin renunciar a `node:fs`.

import { createRequire } from 'node:module';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { aLaVista, contraste, distanciaDeLuminosidad, ratio, ratioQueNoLlega } from '../color.ts';
import { leerLosOrigenes } from '../temas/base.ts';
import { COMBINACIONES, derivar } from '../temas/derivar.ts';
import { MINIMOS } from '../temas/papeles.ts';
import { Calendario } from './calendario.tsx';

/**
 * **Los dias del mes vecino se LEEN, y siguen distinguiendose de los del mes** (#39).
 *
 * <h2>El defecto del que viene</h2>
 *
 * `classNames.outside` del `DayPicker` se pintaba con `--tinta-4`, que es el token que la propia
 * hoja de la libreria declara en mayusculas **NO-COLOR-DE-TEXTO**: 2.59:1 sobre papel blanco, y
 * WCAG 1.4.3 pide 4.5:1. Los otros tres usos del token son correctos —un chevron, una flecha y el
 * separador de una miga, los tres con `aria-hidden`—; este no, porque `outside` son **numeros que
 * se leen y se pulsan**, y no pueden llevar `aria-hidden` sin dejar de anunciarse.
 *
 * Lo destapo `rentas`#140 al escribir la guarda que impide la recaida en su `src/`: al medir a
 * quien alcanzaria, barrer los `@kamayuk/*` no habria sido «verde hoy» sino **rojo desde el primer
 * commit**, por este archivo.
 *
 * <h2>Por que el token se lee del RENDER y no del codigo</h2>
 *
 * Porque lo que hay que vigilar no es una cadena en un archivo sino **de que color sale un dia
 * fuera del mes**, y eso lo decide `react-day-picker` al repartir las clases. Un `grep` sobre
 * `calendario.tsx` da por buena cualquier reorganizacion que mueva la clase a otra llave del mapa
 * —`day`, `day_button`, `disabled`— y seguiria en verde pintando lo mismo.
 *
 * Del render sale ademas lo que ninguna lectura del codigo da gratis: **la HERENCIA**. Un dia del
 * mes no lleva ninguna clase de color; su color es el `text-tinta-2` de la raiz del calendario,
 * que le llega por el DOM. Sin subir por los ancestros no hay con que comparar, y la mitad de esta
 * guarda —que el dia de fuera este ATENUADO respecto del de dentro— no se podria medir.
 *
 * <h2>Las tres cosas que se miden, y por que hacen falta las tres</h2>
 *
 *   1. **Se lee**: el token del dia de fuera llega al minimo de su tema sobre los dos papeles
 *      —`--superficie`, que es donde el `Emergente` lo dibuja, y `--fondo`—, en las SEIS
 *      combinaciones. Es la que el defecto rompia.
 *   2. **Sigue atenuado**: contrasta MENOS que el dia del mes contra el mismo papel. La razon de
 *      que llevara `--tinta-4` era atenuarlo, y eso no se pierde por arreglarlo — se consigue con
 *      un token legible, no con uno ilegible. Sin esta mitad, «arreglar» el defecto pintando los
 *      dias de fuera igual que los de dentro pasaria la (1) perfectamente y borraria los bordes
 *      del mes.
 *   3. **Y se distingue de verdad**: las dos tintas estan separadas en luminosidad. La (2) sola se
 *      cumple con una diferencia de un punto en un canal, que nadie ve.
 */

const origenes = leerLosOrigenes();
/** Los tokens que existen: los del `@theme`, que todos los origenes repiten (#56). */
const base = origenes.institucional.colores;

/** Los dos papeles sobre los que se dibuja un calendario: el emergente y el lienzo. */
const PAPELES_DEL_CALENDARIO = ['--superficie', '--fondo'] as const;

/**
 * Lo lejos que tienen que estar, en luminosidad de OKLab, el dia de fuera y el del mes.
 *
 * <h2>De donde sale el 0.05, medido y no elegido</h2>
 *
 * De la combinacion en la que las dos tintas estan MAS juntas, que es `alto-contraste/oscuro`:
 *
 * ```
 *   institucional/claro   0.1188     alto-contraste/claro   0.0735     sepia/claro   0.1110
 *   institucional/oscuro  0.1140     alto-contraste/oscuro  0.0538     sepia/oscuro  0.1012
 * ```
 *
 * `alto-contraste` es el mas estrecho por construccion: su rampa de tinta va de 0.05 a 0.22 para
 * que las cuatro tintas pasen AAA, y comprimir la rampa es exactamente lo que acerca los extremos.
 * El umbral se pone **justo por debajo de ese minimo**: mas alto pondria rojo a un tema que es
 * correcto —ahi el dia de fuera se distingue, solo que menos—, y mas bajo dejaria de morder.
 */
const SEPARACION_MINIMA = 0.05;

/**
 * El token de color de texto que le toca a un elemento, subiendo por sus ancestros.
 *
 * Es lo que hace el navegador con `color`: hereda. Un dia del mes no declara ninguno y le llega el
 * de la raiz del calendario. Se descartan las utilidades que no son color —`text-[13px]`,
 * `text-left`— porque el token que nombran no esta en la paleta.
 */
function tokenDeTexto(elemento: Element | null): string | null {
  for (let actual = elemento; actual !== null; actual = actual.parentElement) {
    for (const clase of Array.from(actual.classList)) {
      const casa = /^text-([a-z][a-z0-9-]*)$/.exec(clase);
      if (casa === null) continue;
      const token = `--${casa[1] ?? ''}`;
      if (base.has(token)) return token;
    }
  }
  return null;
}

/**
 * `jsdom` entra por `createRequire` y con la forma que se le pide escrita aqui.
 *
 * No trae tipos y este arbol no declara `@types/jsdom`; un `import` pelado deja el `document` en
 * `any` y con el se cae toda la comprobacion de abajo —`querySelectorAll` devolveria `unknown` y
 * `tsc --noEmit` lo dice—. Declarando las dos propiedades que se usan, el `Document` es el de
 * `lib.dom`, que este `tsconfig` ya carga, y el resto del archivo se tipa solo.
 */
const requerir = createRequire(import.meta.url);
const { JSDOM } = requerir('jsdom') as {
  JSDOM: new (html: string) => { readonly window: { readonly document: Document } };
};

/** Enero de 2026 empieza en jueves, asi que su rejilla trae dias de diciembre y de febrero. */
const UN_MES_CON_VECINOS = new Date(2026, 0, 1);

function tokensDelCalendario(): { fuera: string; dentro: string } {
  const html = renderToStaticMarkup(<Calendario mode="single" month={UN_MES_CON_VECINOS} />);
  const { document } = new JSDOM(`<body>${html}</body>`).window;
  const dias = Array.from(document.querySelectorAll('td'));

  // CON UN NUMERO DENTRO, y no solo con la clase. Medido: con `showOutsideDays` apagado,
  // `react-day-picker` sigue emitiendo las mismas celdas `outside` —les anade `rdp-hidden` y las
  // deja vacias—, asi que mirar solo la clase deja esta guarda midiendo el color de unas casillas
  // que nadie ve, y en VERDE. Un dia que no se pinta no tiene color que medir.
  const seVe = (dia: Element): boolean => (dia.textContent ?? '').trim() !== '';
  const esDeFuera = (dia: Element): boolean =>
    seVe(dia) && Array.from(dia.classList).some((c) => c.includes('outside'));

  const fuera = tokenDeTexto(dias.find(esDeFuera) ?? null);
  const dentro = tokenDeTexto(dias.find((d) => seVe(d) && !esDeFuera(d)) ?? null);

  // El centinela va aqui dentro y no en un `it` aparte: si el calendario dejara de pintar dias de
  // fuera —o si `react-day-picker` cambiara el nombre de la clase— todo lo de abajo recorreria el
  // conjunto vacio EN VERDE, que es como una guarda se queda sin sujeto sin que nadie la borre.
  expect(dias.length, 'el calendario no pinto ni un dia').toBeGreaterThan(28);
  expect(
    fuera,
    'ningun dia PINTADO de la rejilla es de fuera del mes: o se apago `showOutsideDays` —y ' +
      'entonces las celdas siguen ahi, con `rdp-hidden` y vacias—, o la clase dejo de llamarse ' +
      'asi. En los dos casos esta guarda se quedaria sin nada que medir',
  ).not.toBeNull();
  expect(dentro, 'ningun dia del mes hereda un color de la paleta').not.toBeNull();
  expect(
    fuera,
    'el dia de fuera y el dia del mes se pintan con el MISMO token: entonces no hay nada que ' +
      'distinga un mes de su vecino',
  ).not.toBe(dentro);

  return { fuera: fuera as string, dentro: dentro as string };
}

describe('los dias del mes vecino, en las seis combinaciones (#39)', () => {
  const { fuera, dentro } = tokensDelCalendario();

  it.each(COMBINACIONES)('%s: un dia de fuera SE LEE', (clave) => {
    const paleta = derivar(origenes, clave);
    const identidad = (clave.split('/')[0] ?? '') as keyof typeof MINIMOS;
    const exigido = MINIMOS[identidad].texto;

    for (const papel of PAPELES_DEL_CALENDARIO) {
      const tinta = paleta.get(fuera) ?? '';
      const fondo = paleta.get(papel) ?? '';
      // Se decide con el crudo y se escribe con el redondeado (#48).
      const medido = contraste(tinta, fondo);
      expect(
        medido,
        `El dia de fuera del mes se pinta con «${fuera}» (${tinta}) y sobre «${papel}» (${fondo}) ` +
          `en «${clave}» da ${ratioQueNoLlega(tinta, fondo, exigido)}:1, cuando WCAG 1.4.3 ` +
          `pide ${String(exigido)}:1.\n` +
          '  Son numeros que se leen y se pulsan: no llevan `aria-hidden` y no pueden llevarlo.\n' +
          '  Si lo que se buscaba era atenuarlos, eso se consigue con un token legible —`--tinta-3`\n' +
          '  esta medido por encima del minimo en las seis— y no con uno que la hoja declara\n' +
          '  NO-COLOR-DE-TEXTO.',
      ).toBeGreaterThanOrEqual(exigido);
    }
  });

  it.each(COMBINACIONES)('%s: y SIGUE ATENUADO respecto de un dia del mes', (clave) => {
    const paleta = derivar(origenes, clave);
    const papel = paleta.get('--superficie') ?? '';
    const deFuera = paleta.get(fuera) ?? '';
    const delMes = paleta.get(dentro) ?? '';

    const atenuado = contraste(deFuera, papel);
    const lleno = contraste(delMes, papel);
    expect(
      atenuado,
      `En «${clave}» el dia de fuera («${fuera}», ${deFuera}) da ${ratio(deFuera, papel)}:1 sobre ` +
        `la superficie y el dia del mes («${dentro}», ${delMes}) da ${ratio(delMes, papel)}:1. El ` +
        'de fuera tiene que contrastar MENOS: si pesa lo mismo o mas, el mes deja de tener bordes.',
    ).toBeLessThan(lleno);

    const separacion = distanciaDeLuminosidad(deFuera, delMes);
    expect(
      separacion,
      `En «${clave}» las dos tintas estan a ${aLaVista(separacion, 4)} de luminosidad y hacen ` +
        `falta ${String(SEPARACION_MINIMA)}. Contrastar menos no basta: a esta distancia los dos ` +
        'dias se ven del mismo color y la rejilla no dice donde acaba el mes.',
    ).toBeGreaterThanOrEqual(SEPARACION_MINIMA);
  });
});
