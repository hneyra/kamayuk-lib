import type { Nombrados } from './componer.ts';
import type { DatoConNombre } from './datos.ts';
import { EL_SUJETO, type HojaDelMarco } from './hoja.ts';
import type { DefinicionDePantalla, DefinicionDePestanas, PestanaDeLaPantalla, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Las reglas de #67 que no dibujan nada**: que piezas cuelgan de otra, que indice tiene cada una,
 * que pestana esta abierta y que datos con nombre aporta la ruta.
 *
 * Puras y aparte de las piezas, por lo mismo que `componer.ts`: se prueban sin montar, y un
 * sistema las usa para saber donde poner los datos de un bloque anidado sin montar nada.
 */

/** Las piezas que cuelgan de una: las de todas sus pestanas, en orden, o las de su detalle. */
export function hijasDe(pieza: PiezaDeLaPantalla): readonly PiezaDeLaPantalla[] {
  if (pieza.tipo === 'pestanas') return pieza.pestanas.flatMap((pestana) => pestana.bloques);
  if (pieza.tipo === 'maestroDetalle') return pieza.detalle.bloques;
  return [];
}

/** Una pieza en su sitio: `sitio` es el camino por la definicion (`'2'`, `'2.0'`) e `indice`, su numero. */
export interface PiezaEnSuSitio {
  readonly sitio: string;
  readonly indice: number;
  readonly pieza: PiezaDeLaPantalla;
}

/**
 * **Todas las piezas de una definicion, con su indice**, anidadas incluidas.
 *
 * <h2>Por que en anchura, y no en profundidad</h2>
 *
 * `datos.filas`, `valores` y `conteos` van por indice de pieza desde #27. Numerando en anchura, las
 * de primer nivel **conservan el indice de hoy** —`0..n-1`— aunque una de ellas pase a tener
 * pestanas dentro; las anidadas siguen detras, nivel a nivel y en el orden de la definicion. En
 * profundidad, meter dos bloques en una pestana corria el indice de todo lo que viniera despues, y
 * los datos de un bloque que nadie toco caerian en otro sin ningun error.
 *
 * Las pestanas cerradas **tambien cuentan**: el indice de un bloque no puede depender de que
 * pestana este abierta, o sus datos cambiarian de sitio al cambiar de pestana.
 */
export function recorrerLasPiezas(definicion: DefinicionDePantalla<PiezaDeLaPantalla>): readonly PiezaEnSuSitio[] {
  const cola: { sitio: string; pieza: PiezaDeLaPantalla }[] = definicion.bloques.map((pieza, i) => ({
    sitio: String(i),
    pieza,
  }));
  const salida: PiezaEnSuSitio[] = [];
  for (let siguiente = cola.shift(); siguiente !== undefined; siguiente = cola.shift()) {
    const { sitio, pieza } = siguiente;
    salida.push({ sitio, indice: salida.length, pieza });
    hijasDe(pieza).forEach((hija, j) => {
      cola.push({ sitio: `${sitio}.${String(j)}`, pieza: hija });
    });
  }
  return salida;
}

/** El indice de cada sitio. Lo que `Pantalla` consulta al dibujar una pieza anidada. */
export function indicesDeLasPiezas(definicion: DefinicionDePantalla<PiezaDeLaPantalla>): ReadonlyMap<string, number> {
  return new Map(recorrerLasPiezas(definicion).map(({ sitio, indice }) => [sitio, indice]));
}

/**
 * La pestana abierta: la que nombra la ruta o, si no nombra ninguna que exista, la primera.
 *
 * Un valor que no es ninguna pestana —un enlace viejo, una pestana que se quito— abre la primera en
 * vez de dejar la tira sin nada seleccionado, que es una hoja sin cuerpo y sin decir por que.
 */
export function pestanaAbierta(
  definicion: DefinicionDePestanas,
  enLaRuta: string | null,
): PestanaDeLaPantalla | undefined {
  return definicion.pestanas.find((pestana) => pestana.clave === enLaRuta) ?? definicion.pestanas[0];
}

/**
 * Los datos con nombre de la pantalla, **con los de la hoja debajo** (#67).
 *
 * La ruta aporta `ruta.sujeto` y `ruta.<parametro>`; el marco, `marco.<clave>`. Van **debajo** de
 * los del sistema: lo que el sistema ponga con el mismo nombre gana, porque es lo explicito. Asi
 * `cuando: { dato: 'ruta.ver', vale: 'historial' }` y `{ plantilla: 'Ejercicio {marco.ejercicio}' }`
 * funcionan sin que el sistema los copie a mano.
 *
 * Sin hoja, devuelve los del sistema **tal cual** —el mismo objeto—: una pieza del consumidor que
 * compare `datos` por identidad no ve ningun cambio donde no lo hay.
 */
export function nombradosConLaHoja(hoja: HojaDelMarco | undefined, nombrados: Nombrados): Nombrados {
  if (hoja === undefined) return nombrados;
  const juntos = new Map<string, DatoConNombre>();
  if (hoja.ruta.sujeto !== null) juntos.set(`ruta.${EL_SUJETO}`, hoja.ruta.sujeto);
  for (const [clave, valor] of Object.entries(hoja.ruta.parametros)) juntos.set(`ruta.${clave}`, valor);
  for (const [clave, valor] of Object.entries(hoja.marco ?? {})) juntos.set(`marco.${clave}`, valor);
  for (const [clave, valor] of nombrados ?? []) juntos.set(clave, valor);
  return juntos;
}
