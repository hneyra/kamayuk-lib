import { createContext, useContext, type ReactNode } from 'react';

import type { CambioDeLaRuta, CambioDeLoTecleado, LoTecleado, RutaDeLaHoja } from '../ui/index.ts';

import type { Catalogo, HojaDelCatalogo } from './catalogo.ts';
import type { ActoDelPie } from './acciones.ts';
import { TEXTOS_DEL_ARMAZON, type TextosDelArmazon } from './textos.ts';

/**
 * Lo que el armazón sabe, y lo que le tienen que decir.
 *
 * Tres contextos y no uno, porque son tres vidas distintas: la **configuración** la fija el sistema
 * al montar y no cambia; la **hoja abierta** cambia con cada destino y sólo existe cuando hay uno;
 * los **textos** no cambian nunca y —a diferencia de los otros dos— **tienen valor por omisión**.
 * Juntos, una pantalla tendría que comprobar en cada lectura si hay hoja, y el compilador no la
 * ayudaría.
 */

/** Una opción del menú de sesión. Las cuatro de V8 las pone el sistema, no esto. */
export interface OpcionDeSesion {
  readonly rotulo: string;
  /** La que no se deshace —cerrar sesión—: se pinta en la tinta del error. */
  readonly peligrosa?: boolean;
  readonly al: () => void;
}

/** Quién entró. Lo que la barra dibuja a la derecha. */
export interface CuentaEnLaBarra {
  readonly nombre: string;
  /** Las dos letras del círculo. */
  readonly iniciales: string;
  /** La línea de debajo: qué es esta cuenta aquí. */
  readonly nota?: string;
}

/** Lo que el armazón delega en el sistema cuando se pulsa una acción al pie. */
export type AccionesDelSistema = Partial<Record<ActoDelPie, (clave: string) => void>>;

export interface ConfiguracionDelArmazon {
  /** El título de la barra global. */
  readonly titulo: string;
  /** La entidad, bajo el título. */
  readonly entidad: string;
  /** El escudo. Un `<img>`, un `<svg>`; el armazón no sabe cuál. */
  readonly escudo?: ReactNode;
  /** El catálogo YA filtrado. Ver `catalogo.ts`. */
  readonly catalogo: Catalogo;
  readonly cuenta: CuentaEnLaBarra;
  readonly opcionesDeSesion: readonly OpcionDeSesion[];
  /** Cuántos avisos sin leer marca la campana. Cero: no se dibuja la marca. */
  readonly avisosSinLeer?: number;
  readonly alVerAvisos?: () => void;
  /** La pantalla de un destino. El armazón no sabe dibujar ninguna. */
  readonly pantalla: (hoja: HojaDelCatalogo) => ReactNode;
  /** Qué hacer con cada acción del pie. Lo que no se pase, no se puede pulsar. */
  readonly acciones?: AccionesDelSistema;
  /** La línea del pie del carril. */
  readonly pieDelCarril?: string;
  /**
   * **Las palabras del marco** (#19). Lo que no se pase, en castellano.
   *
   * Es `Partial` a propósito: traducir el marco no puede ser todo o nada. Un sistema que sólo
   * quiera cambiar «Guardar» pasa esa, y las otras treinta siguen saliendo como hoy — sin que
   * cambiar el saco aquí le rompa el suyo mañana. Ver `textos.ts`.
   */
  readonly textos?: Partial<TextosDelArmazon>;
  /**
   * **Los parametros globales del marco** (#67, `parametro-del-marco`): el ejercicio de la barra,
   * por ejemplo — `{ ejercicio: '2026' }`.
   *
   * Los pone el sistema y **no viajan en la ruta**: son de la sesion, no de la hoja, igual que en la
   * V6 de `catastro`. Cambiarlos vuelve a pintar la hoja abierta con los nuevos en `useHoja().marco`,
   * y la pantalla vuelve a pedir si su lectura los lleva.
   */
  readonly marco?: Readonly<Record<string, string>>;
  /**
   * Lo que el sistema pone en la barra global, antes del buscador: el control que cambia `marco`.
   * El marco no sabe dibujarlo —no sabe qué ejercicios hay, ni si hay ejercicio—, y por eso no
   * escribe ninguna palabra suya aquí.
   */
  readonly enLaBarra?: ReactNode;
  /**
   * Se avisa cuando la dirección trae algo que la hoja no declara (#67). Por omisión,
   * `console.warn`. Existe para que un sistema lo recoja donde recoge lo demás.
   */
  readonly alIgnorarDeLaRuta?: (aviso: AvisoDeLaRuta) => void;
}

/** Lo que se ignoró de una dirección: de qué hoja, y cada trozo como se veía (`/42`, `?ver`). */
export interface AvisoDeLaRuta {
  readonly destino: string;
  readonly ignorados: readonly string[];
}

const DeLaConfiguracion = createContext<ConfiguracionDelArmazon | null>(null);

export const ProveedorDeLaConfiguracion = DeLaConfiguracion.Provider;

/** La configuración del armazón. Revienta fuera de él, en vez de inventarse una. */
export function useArmazon(): ConfiguracionDelArmazon {
  const valor = useContext(DeLaConfiguracion);
  if (valor === null) {
    throw new Error(
      'useArmazon() fuera de <Armazon>. Devolver una configuracion por omision aqui dejaria un ' +
        'marco que se ve bien y cuyo arbol esta vacio.',
    );
  }
  return valor;
}

/**
 * La hoja abierta, y cómo se marca sucia.
 *
 * **Quién marca es la pantalla, y eso no se puede automatizar desde aquí.** El armazón no toca los
 * campos —no sabe que existen— así que no puede saber que alguien escribió en uno. Lo que sí hace
 * es lo que la pantalla no debe repetir cuarenta veces: acordarse de qué hojas están sucias,
 * dibujar la marca en el árbol y cortar el paso al salir.
 */
export interface HojaAbierta {
  readonly hoja: HojaDelCatalogo;
  readonly sucia: boolean;
  /** Hay cambios sin guardar. Idempotente: llamarla en cada tecleo es lo esperado. */
  readonly marcarSucia: () => void;
  /** Ya no los hay. La llama la pantalla cuando guarda por su cuenta. Olvida tambien lo tecleado (#86). */
  readonly marcarGuardada: () => void;
  /**
   * **Lo tecleado en esta hoja, guardado por el marco** (#86, `lo-tecleado-y-la-negativa-sobreviven`).
   *
   * El marco no lo lee: lo guarda con la misma clave que la marca de sucia —el destino— y lo devuelve.
   * Sobrevive a irse y volver **solo si la hoja sigue sucia**; ver `Armazon.tsx`. `undefined`: nada.
   */
  readonly tecleado: LoTecleado | undefined;
  /** Cambia lo que el marco guarda de esta hoja. Lo llama `<Pantalla hoja>`, no el sistema. */
  readonly alTeclear: (cambio: CambioDeLoTecleado) => void;
  /**
   * **Lo que la ruta guarda de esta hoja** (#67): su sujeto y sus parámetros, **solo los
   * declarados** en `Destino.enLaRuta`. Recargar o compartir el enlace da lo mismo.
   */
  readonly ruta: RutaDeLaHoja;
  /**
   * Cambia la ruta de ESTA hoja: lo que no se nombra se queda, `null` lo quita. Con `replace`, como
   * todo el enrutado del marco (#13), y sin preguntar por cambios sin guardar: no se sale de la hoja.
   */
  readonly moverLaRuta: (cambio: CambioDeLaRuta) => void;
  /** Los parámetros globales del marco (`ConfiguracionDelArmazon.marco`). Sin ellos, `{}`. */
  readonly marco: Readonly<Record<string, string>>;
  // Ir a OTRA hoja con su sujeto y sus parámetros no está aquí: es `useNavegacion().ir` (#66), que
  // pasa por el mismo `irA` y escribe la misma forma de ruta que esto lee (`ruta.ts`).
}

/**
 * Los textos del marco, con los de castellano como valor del contexto.
 *
 * **Fuera de `<Armazon>` NO revienta, y esa es la diferencia con los otros dos.** Las siete piezas
 * se publican sueltas y se montan sueltas —`armazon.test.tsx` monta `CarrilDeModulos` por su
 * cuenta—: una pieza que exigiera proveedor de idioma para dibujar un árbol convertiría la
 * traducción en un requisito para usar el marco, que es lo que este issue existe para evitar.
 */
const DeLosTextos = createContext<TextosDelArmazon>(TEXTOS_DEL_ARMAZON);

export const ProveedorDeLosTextos = DeLosTextos.Provider;

/** Las palabras del marco. Sin proveedor, las de castellano. */
export function useTextos(): TextosDelArmazon {
  return useContext(DeLosTextos);
}

const DeLaHoja = createContext<HojaAbierta | null>(null);

export const ProveedorDeLaHoja = DeLaHoja.Provider;

/** La hoja abierta. Revienta fuera de una: no hay «la hoja de ninguna pantalla». */
export function useHoja(): HojaAbierta {
  const valor = useContext(DeLaHoja);
  if (valor === null) {
    throw new Error(
      'useHoja() fuera de una pantalla del <Armazon>. Sin hoja abierta no hay nada que marcar ' +
        'sucio, y devolver una vacia dejaria el aviso de cambios sin guardar sin disparar nunca.',
    );
  }
  return valor;
}
