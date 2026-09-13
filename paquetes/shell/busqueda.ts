import {
  cuantosDestinos,
  type Catalogo,
  type Destino,
  type ModuloDelCatalogo,
} from './catalogo.ts';
import { TEXTOS_DEL_ARMAZON, type TextosDelArmazon } from './textos.ts';

/**
 * Las dos búsquedas del armazón: la del carril y la de la paleta de mando.
 *
 * Están aparte de los componentes porque son funciones puras sobre el catálogo, y porque sus casos
 * —un módulo que casa sin que case ninguna hoja, el recorte a doce, el pie que cuenta— se prueban
 * mejor sin teclear en un `input`.
 *
 * **Y las dos recorren el catálogo y nada más.** Es la mitad del AC4 que se pierde con más
 * facilidad: una lista filtrada no se parece a la lista de al lado, así que un filtro que leyera
 * un catálogo completo seguiría enseñando lo que la cuenta no puede abrir a quien escribiera su
 * nombre. Aquí el catálogo entra como argumento y no hay otro que leer.
 */

/** Un módulo con sólo las hojas que el filtro deja ver. */
export interface ModuloFiltrado {
  readonly modulo: ModuloDelCatalogo;
  readonly destinos: readonly Destino[];
}

const normalizado = (texto: string): string => texto.trim().toLowerCase();

/**
 * Los módulos que casan con el filtro del carril, con sus hojas visibles.
 *
 * La regla no es «se queda lo que casa»: **si casa el rótulo del MÓDULO, el módulo entra con todas
 * sus hojas**, aunque ninguna case. Buscar el nombre de un módulo tiene que enseñar lo que hay
 * dentro, no una lista vacía debajo de un título que sí casaba.
 */
export function modulosQueCasan(catalogo: Catalogo, filtro: string): readonly ModuloFiltrado[] {
  const busqueda = normalizado(filtro);
  if (busqueda === '') {
    return catalogo.map((modulo) => ({ modulo, destinos: modulo.destinos }));
  }

  return catalogo.flatMap((modulo) => {
    const casaElModulo = modulo.rotulo.toLowerCase().includes(busqueda);
    const casan = modulo.destinos.filter((destino) =>
      destino.rotulo.toLowerCase().includes(busqueda),
    );
    if (!casaElModulo && casan.length === 0) {
      return [];
    }
    return [{ modulo, destinos: casaElModulo ? modulo.destinos : casan }];
  });
}

/** Un resultado de la paleta: la hoja, y el módulo que se dibuja a su derecha. */
export interface ResultadoDelMando {
  readonly clave: string;
  readonly rotulo: string;
  readonly modulo: string;
}

/**
 * Cuántos resultados enseña la paleta. El artboard corta en doce.
 *
 * No es una cifra de adorno: la lista de la paleta se recorre con las flechas, y una lista de
 * cuarenta convierte «escribir dos letras y pulsar Enter» en «escribir dos letras y buscar». Doce
 * caben en la altura que el artboard le da sin desplazar.
 */
export const RESULTADOS_DE_LA_PALETA = 12;

/**
 * Los destinos que casan con lo que se escribió en la paleta, recortados a doce.
 *
 * Casa por el rótulo de la hoja **y también por el del módulo**: quien escribe el nombre de un
 * módulo está pidiendo sus hojas, y devolverle nada porque ninguna hoja se llama como el módulo
 * sería contestar a la pregunta que no hizo.
 */
export function resultadosDelMando(
  catalogo: Catalogo,
  consulta: string,
  limite: number = RESULTADOS_DE_LA_PALETA,
): readonly ResultadoDelMando[] {
  const busqueda = normalizado(consulta);
  const todos: ResultadoDelMando[] = [];
  for (const modulo of catalogo) {
    for (const destino of modulo.destinos) {
      const casa =
        busqueda === '' ||
        destino.rotulo.toLowerCase().includes(busqueda) ||
        modulo.rotulo.toLowerCase().includes(busqueda);
      if (casa) {
        todos.push({ clave: destino.clave, rotulo: destino.rotulo, modulo: modulo.rotulo });
      }
    }
  }
  return todos.slice(0, limite);
}

/**
 * El pie de la paleta: «N de M destinos».
 *
 * **Las palabras son del saco desde #19** —el singular y el plural los decide él, porque no en todo
 * idioma el plural es una `s`— y el `textos` va al final y con valor por omisión: quien la llamaba
 * con dos argumentos la sigue llamando igual.
 *
 * **N es cuántos casan, no cuántos se enseñan**, y la diferencia importa: con el recorte a doce, un
 * pie que dijera «12 de 40» cuando casan treinta estaría escondiendo que la búsqueda no discrimina
 * nada. Lo que la persona necesita saber es si le falta afinar.
 */
export function pieDeLaPaleta(
  catalogo: Catalogo,
  consulta: string,
  textos: TextosDelArmazon = TEXTOS_DEL_ARMAZON,
): string {
  const casan = resultadosDelMando(catalogo, consulta, Number.POSITIVE_INFINITY).length;
  return textos.cuantosDestinos(casan, cuantosDestinos(catalogo));
}
