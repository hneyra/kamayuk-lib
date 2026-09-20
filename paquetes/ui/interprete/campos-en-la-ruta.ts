import { tipoDe } from '../shadcn/campos.ts';
import { cambiosEn, valorEnLaRuta, type CambioDeLaRuta, type RutaDeLaHoja } from './hoja.ts';
import type {
  DefinicionDeBloque,
  DefinicionDeCampo,
  EleccionDelCampo,
  MomentoDeLaEleccion,
  OpcionDelCampo,
  Texto,
} from './tipos.ts';

/**
 * **Las reglas de #94 que no dibujan nada**: que campo escribe en la ruta, cuando lo escribe, que
 * vale hoy y que movimiento de la ruta produce cambiarlo.
 *
 * Puras y aparte de las piezas, por lo mismo que `composicion.ts` y `reglas-de-las-tablas.ts`: se
 * prueban sin montar, y un sistema puede recorrer sus definiciones con ellas —para comprobar que
 * cada `enLaRuta` de un campo esta declarado en el `Destino` de su hoja, por ejemplo— sin dibujar
 * una pantalla.
 */

/** Lo que un campo declara de la ruta, si declara algo. Un campo de solo lectura nunca declara. */
export function eleccionDe(campo: DefinicionDeCampo<OpcionDelCampo>): EleccionDelCampo | undefined {
  return 'eleccion' in campo ? campo.eleccion : undefined;
}

/**
 * Cuando escribe este campo, con el valor por omision de su tipo.
 *
 * **Sale del tipo, que es lo que ya decide que control se dibuja** (`tipoDe`), y no de una segunda
 * lista que mantener: una lista y un calendario se eligen de un gesto —y ese gesto es la eleccion
 * entera—, mientras que lo que se teclea tiene tantos estados intermedios como letras. Por eso el
 * primero escribe `alElegir` y el segundo `alSalir`, y cualquiera de los dos se puede pisar.
 */
export function momentoDeLaEleccion(campo: DefinicionDeCampo<OpcionDelCampo>): MomentoDeLaEleccion {
  const declarado = eleccionDe(campo)?.cuando;
  if (declarado !== undefined) return declarado;
  const tipo = tipoDe(campo.tipo);
  return tipo === 's' || tipo === 'd' ? 'alElegir' : 'alSalir';
}

/**
 * Lo que la ruta dice hoy de este campo, o `undefined` si el campo no escribe en la ruta o la ruta
 * no lo trae.
 *
 * Es lo que hace que recargar `#/aut-cat?descripcion=bodega` ensene «bodega» escrito en la caja: un
 * filtro puesto que la pantalla no dijera seria una lista acotada sin ninguna senal de por que.
 */
export function valorElegido(
  campo: DefinicionDeCampo<OpcionDelCampo>,
  ruta: RutaDeLaHoja,
): string | undefined {
  const eleccion = eleccionDe(campo);
  if (eleccion === undefined) return undefined;
  return valorEnLaRuta(ruta, eleccion.enLaRuta) ?? undefined;
}

/**
 * **El movimiento de la ruta que produce elegir `valor`**, con la vuelta a la primera pagina
 * dentro.
 *
 * Un solo `CambioDeLaRuta` y no dos: ver `cambiosEn`. Se reinician los sitios de paginacion de las
 * tablas **de este bloque** —las que el filtro acota— y no los de la hoja entera: un bloque no
 * sabe que pagina lleva la tabla de otro, y devolverla a la primera seria mover una lista que nadie
 * toco.
 *
 * **El sitio del campo se escribe el ultimo**, para que gane si una tabla del mismo bloque pagina
 * en ese mismo nombre. Es una definicion mal escrita, pero de las dos formas de salir mal —perder
 * el filtro o perder la pagina— la segunda se ve y la primera no.
 *
 * Un valor vacio **quita el parametro** en vez de dejarlo en blanco: una ruta guarda lo que se
 * eligio, y `?descripcion=` no es haber elegido nada.
 */
export function cambioAlElegir(
  bloque: DefinicionDeBloque<Texto, OpcionDelCampo>,
  eleccion: EleccionDelCampo,
  valor: string,
): CambioDeLaRuta {
  const sitios: Record<string, string | null> = {};
  for (const tabla of [bloque.tabla, ...(bloque.tablas ?? [])]) {
    const paginacion = tabla?.paginacion;
    if (paginacion !== undefined) sitios[paginacion.enLaRuta] = '0';
  }
  sitios[eleccion.enLaRuta] = valor === '' ? null : valor;
  return cambiosEn(sitios);
}
