import type { Destino } from './catalogo.ts';

/**
 * **Las acciones al pie las decide el dato** (#13, AC8).
 *
 * V8 pone al pie de cada pantalla cuatro cosas: «Volver» a la izquierda, un aviso en medio y **dos
 * acciones a la derecha**. Cuáles son las dos no lo elige quien dibuja la pantalla: lo dice el
 * `seEscribe` de la hoja.
 *
 * <table>
 *   <tr><td>la pantalla se escribe</td><td>«Limpiar» + «Guardar»</td></tr>
 *   <tr><td>la pantalla es de sólo consulta</td><td>«Exportar» + «Imprimir»</td></tr>
 * </table>
 *
 * <h2>Por qué esto es una función y no un `if` dentro del componente</h2>
 *
 * Porque lo que hay que poder comprobar es la correspondencia entera, y un `if` dentro del JSX sólo
 * se puede mirar montando la pantalla. Como función, una prueba la recorre con las dos formas del
 * dato y compara las dos listas — que es exactamente el AC8.
 *
 * Y porque el modo de fallo es silencioso: una pantalla de consulta que ofreciera «Guardar»
 * mandaría a pulsar un botón que no tiene nada que guardar, y una que se escribe y ofreciera
 * «Imprimir» **dejaría el trabajo sin forma de guardarse**. Ninguna de las dos se ve como un error
 * en la pantalla: se ven como una pantalla.
 */

/** Qué acto pide una acción del pie. El armazón no sabe hacer ninguno: los delega. */
export type ActoDelPie = 'limpiar' | 'guardar' | 'exportar' | 'imprimir';

export interface AccionDelPie {
  readonly acto: ActoDelPie;
  readonly rotulo: string;
  /** La de la derecha del todo, en azul. Hay exactamente una por pantalla. */
  readonly principal: boolean;
}

/** Las dos acciones de una pantalla que se escribe. */
const DE_ESCRITURA: readonly AccionDelPie[] = [
  { acto: 'limpiar', rotulo: 'Limpiar', principal: false },
  { acto: 'guardar', rotulo: 'Guardar', principal: true },
];

/** Las dos de una pantalla de sólo consulta. */
const DE_CONSULTA: readonly AccionDelPie[] = [
  { acto: 'exportar', rotulo: 'Exportar', principal: false },
  { acto: 'imprimir', rotulo: 'Imprimir', principal: true },
];

/** Las dos acciones que ofrece una hoja. */
export function accionesDelPie(destino: Destino): readonly AccionDelPie[] {
  return destino.seEscribe ? DE_ESCRITURA : DE_CONSULTA;
}

/**
 * El aviso del medio, que también lo decide el dato.
 *
 * Una pantalla que se escribe avisa de que nada se ha escrito todavía —es lo que evita que alguien
 * cierre creyendo que ya está—; una de consulta dice a qué fecha son los datos, que es lo único
 * que puede estar mal en ella.
 */
export function avisoDelPie(destino: Destino): string {
  return destino.seEscribe
    ? 'Nada se escribe hasta que pulse Guardar.'
    : 'Los datos son los que figuran a la fecha de hoy.';
}
