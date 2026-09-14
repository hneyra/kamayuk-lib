import type {
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
} from './tipos-de-los-actos.ts';

/**
 * **Lo que la pantalla sabe hacer, reunido en un objeto** para bajarlo a las piezas (#66).
 *
 * `Pantalla` lo compone con lo que el sistema le pasa —manejadores, navegacion, el acto abierto— y
 * lo baja entero. Un objeto y no siete `props` sueltas porque cruzan dos niveles (`Pantalla` →
 * `PiezaDeLaPantalla` → la pieza), y cada `prop` suelta es una que un dia se olvida de pasar en uno de
 * los dos.
 */

/** El acto abierto y lo que la accion que lo abrio le dio. */
export interface ActoAbierto {
  readonly clave: string;
  readonly parametros?: Readonly<Record<string, string>>;
}

export interface InteraccionDeLaPantalla {
  readonly actos: ManejadoresDeLosActos | undefined;
  readonly alHacer: ManejadoresDeLasAcciones | undefined;
  readonly navegacion: NavegacionDeLaPantalla | undefined;
  readonly abierto: ActoAbierto | null;
  /** Abre un acto —o, con `null`, cierra el que haya—. */
  readonly abrirActo: (clave: string | null, parametros?: Readonly<Record<string, string>>) => void;
  readonly alEnsuciar: () => void;
  readonly alQuedarGuardada: () => void;
}
