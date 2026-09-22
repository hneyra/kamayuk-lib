import type { TecleadoDeUnActo } from './hoja.ts';
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
  /**
   * La marca de sucia de CADA cambio (#86, `la-hoja-se-marca-sucia-al-teclear`). Sin
   * `definicion.hoja.suciaAlTeclear` no hace nada: `alEnsuciar` sigue siendo el aviso de siempre.
   */
  readonly marcarSucia: () => void;
  /**
   * Se descarto lo escrito en el acto de esa apertura (#86, `descartar-lo-escrito`): la pantalla deja
   * la hoja limpia si eso era lo unico tecleado.
   */
  readonly alDescartar: (apertura: string) => void;
  /**
   * **Donde guarda un acto lo tecleado**, cuando no es en su estado (#86,
   * `lo-tecleado-y-la-negativa-sobreviven`). Solo con `definicion.hoja.conservaLoTecleado` y una hoja
   * que lo guarde; sin eso, `undefined`, y el acto lo guarda en su estado como desde #66.
   */
  readonly tecleadoDeLosActos: TecleadoDeLosActos | undefined;
}

/** Lo tecleado en los actos de la hoja, por apertura. `undefined` es «nada tecleado». */
export interface TecleadoDeLosActos {
  readonly leer: (apertura: string) => TecleadoDeUnActo | undefined;
  /** `undefined` quita lo de esa apertura: descartar no deja un acto vacio guardado. */
  readonly cambiar: (
    apertura: string,
    cambio: (antes: TecleadoDeUnActo | undefined) => TecleadoDeUnActo | undefined,
  ) => void;
}
