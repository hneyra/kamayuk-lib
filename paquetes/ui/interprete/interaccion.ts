import type { TecleadoDeUnActo } from './hoja.ts';
import type {
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
} from './tipos-de-los-actos.ts';

/**
 * **Lo que la pantalla sabe hacer, partido en lo que cada pieza usa** (#66; partido en dos en #125).
 *
 * `Pantalla` lo compone con lo que el sistema le pasa —manejadores, navegacion, el acto abierto— y
 * lo baja en **dos objetos**, y no en diez `props` sueltas: cruzan varios niveles (`Pantalla` →
 * `BloqueDeLaPantalla` → `TablaDelBloque` → `FilaDelBloque` → `AccionesDeLaFila` → el grupo), y
 * cada `prop` suelta es una que un dia se olvida de pasar en uno de ellos.
 *
 * Hasta #125 era un solo `InteraccionDeLaPantalla` de diez miembros, y casi nadie lo usaba entero:
 * `GrupoDeAcciones` usaba cuatro, el acto ocho, y el bloque, la tabla y las acciones de la fila solo
 * lo pasaban. Ahora son dos, por quien los usa:
 *
 * · **`AccionesDeLaHoja`** (cuatro) — lo que una accion puede hacer: abrir un acto, ir a otra hoja
 *   o hacer una operacion. Lo usa `GrupoDeAcciones`, dondequiera que este: en el bloque, en la fila,
 *   en el vacio de una tabla y en el acto hecho.
 * · **`CicloDelActo`** (seis) — la vida del acto abierto: cual es, donde guarda lo tecleado, cuando
 *   ensucia la hoja, cuando se descarta y cuando queda guardada. Solo lo usan `PiezaDeLaPantalla`,
 *   que mira cual esta abierto, y `ActoDeLaPantalla`.
 *
 * Ninguno de los dos se exporta por `index.ts`: lo publico es `ActoAbierto`, que el sistema pasa.
 */

/** El acto abierto y lo que la accion que lo abrio le dio. */
export interface ActoAbierto {
  readonly clave: string;
  readonly parametros?: Readonly<Record<string, string>>;
}

/** Lo que una accion puede hacer: abrir un acto, ir a otra hoja o hacer una operacion. */
export interface AccionesDeLaHoja {
  readonly actos: ManejadoresDeLosActos | undefined;
  readonly alHacer: ManejadoresDeLasAcciones | undefined;
  readonly navegacion: NavegacionDeLaPantalla | undefined;
  /** Abre un acto —o, con `null`, cierra el que haya—. */
  readonly abrirActo: (clave: string | null, parametros?: Readonly<Record<string, string>>) => void;
}

/** La vida del acto abierto: cual es, lo tecleado, cuando ensucia y cuando queda guardado. */
export interface CicloDelActo {
  readonly abierto: ActoAbierto | null;
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
