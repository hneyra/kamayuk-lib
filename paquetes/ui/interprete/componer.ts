import type { ComponentType } from 'react';

import type { DatoConNombre } from './datos.ts';
import type {
  Condicion,
  DefinicionDeBloque,
  DefinicionDePantalla,
  PiezaDeLaPantalla,
  Texto,
} from './tipos.ts';

/**
 * **Las tres reglas de #44 que no dibujan nada**: que dice un `Texto`, cuando existe una pieza y
 * que claves del consumidor faltan.
 *
 * Son funciones puras, y por eso van aparte de las piezas: se prueban sin montar, y una pieza del
 * consumidor —que recibe `datos` y `traducir`— puede usar las mismas en vez de escribir su copia.
 */

/** Los datos con nombre, tal como llegan en `DatosDeLaPantalla.nombrados`. */
export type Nombrados = ReadonlyMap<string, DatoConNombre> | undefined;

/** Un dato como texto. `true`/`false` se escriben como tales: quien quiera «Si» usa `segun`. */
function comoTexto(valor: DatoConNombre | undefined, ausente: string): string {
  if (valor === undefined || valor === null || valor === '') return ausente;
  return typeof valor === 'boolean' ? String(valor) : valor;
}

/** El hueco de una plantilla: `{nombre}`, con puntos si el nombre los lleva. */
const HUECO = /\{([A-Za-z0-9_.-]+)\}/g;

/**
 * Lo que dice un `Texto`.
 *
 * **`traducir` pasa por la frase y nunca por el dato**: en una plantilla se traduce la plantilla
 * y DESPUES se ponen los datos; en `segun`, el caso elegido; en `desde`, nada. Un dato que no llego
 * se escribe `ausente`, que es una palabra del saco y no un cero.
 */
export function resolverTexto(
  texto: Texto,
  nombrados: Nombrados,
  traducir: (texto: string) => string,
  ausente: string,
): string {
  if (typeof texto === 'string') return traducir(texto);
  if ('desde' in texto) return comoTexto(nombrados?.get(texto.desde), ausente);
  if ('plantilla' in texto) {
    return traducir(texto.plantilla).replace(HUECO, (_hueco, nombre: string) =>
      comoTexto(nombrados?.get(nombre), ausente),
    );
  }
  const valor = nombrados?.get(texto.segun);
  const clave = valor === undefined || valor === null ? undefined : String(valor);
  const caso = clave === undefined ? undefined : texto.casos[clave];
  if (caso !== undefined) return traducir(caso);
  return texto.otro === undefined ? ausente : traducir(texto.otro);
}

/**
 * Si una pieza existe. Sin condicion, siempre.
 *
 * `hay` es «ni ausente, ni `null`, ni `''`»; un `false` SI es un dato. `vale` compara sin
 * convertir: `false` no vale `'false'`, porque un dato que llega como texto donde se esperaba un
 * booleano es un defecto de quien lo pone, y convertirlo aqui lo taparia.
 */
export function seCumple(condicion: Condicion | undefined, nombrados: Nombrados): boolean {
  if (condicion === undefined) return true;
  const valor = nombrados?.get(condicion.dato);
  if ('hay' in condicion) {
    const hay = valor !== undefined && valor !== null && valor !== '';
    return hay === condicion.hay;
  }
  return valor !== undefined && valor === condicion.vale;
}

/** Si una pieza es un bloque: los de #27 no llevan `tipo`, y siguen siendolo. */
export function esBloque(pieza: PiezaDeLaPantalla): pieza is DefinicionDeBloque<Texto> {
  return pieza.tipo === undefined || pieza.tipo === 'bloque';
}

/**
 * Las claves de pieza del consumidor que la definicion usa y el registro no trae, en su orden y
 * sin repetir.
 *
 * La pantalla ya lo dice montada —con un aviso visible en el sitio—, pero esa mitad solo se ve en
 * la hoja que alguien abre. Con esto, cada sistema escribe una guarda que recorre sus definiciones
 * sin montar nada.
 */
export function piezasSinRegistrar(
  definicion: DefinicionDePantalla<PiezaDeLaPantalla>,
  piezas: Readonly<Record<string, ComponentType<never>>> | undefined,
): readonly string[] {
  const faltan: string[] = [];
  for (const pieza of definicion.bloques) {
    if (pieza.tipo !== 'delConsumidor') continue;
    if (piezas !== undefined && Object.hasOwn(piezas, pieza.clave)) continue;
    if (!faltan.includes(pieza.clave)) faltan.push(pieza.clave);
  }
  return faltan;
}
