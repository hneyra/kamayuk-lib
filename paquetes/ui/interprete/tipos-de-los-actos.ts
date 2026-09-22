import type { ComunDeUnaPieza, Condicion, DefinicionDeCampo, Texto } from './tipos.ts';

/**
 * **Los tipos de lo que una hoja HACE**: sus acciones, sus actos y a donde lleva (#66).
 *
 * #44 le enseno al interprete a leer —estados de una lectura, avisos, textos con dato—; esto le
 * ensena a escribir y a moverse. Son los cinco huecos de `catastro/frontend/diseno/HUECOS.md` que
 * #66 sube: `acciones-del-bloque`, `acto-con-observacion`, `impedido-con-motivo`,
 * `confirmacion-de-lo-irreversible` y `navegar-a-otra-hoja`.
 *
 * <h2>La libreria no escribe nada: nombra, y el sistema atiende</h2>
 *
 * Igual que una lectura (#44) se nombra por su `clave` y su estado lo pone el sistema, un acto se
 * nombra por su `clave` y lo envia **el manejador que el sistema registra** en `<Pantalla actos>`.
 * Una accion que `hace` algo se busca en `<Pantalla alHacer>`, y una que `va` a otra hoja pasa por la
 * `navegacion` que el marco da. Sin quien lo atienda, el boton sale **impedido con su motivo**:
 * nunca un boton que no hace nada al pulsarlo, y nunca uno apagado sin decir por que.
 *
 * <h2>Van en su archivo, y no dentro de `tipos.ts`</h2>
 *
 * Porque #65 y #67 tocan `tipos.ts` a la vez que esto. Alli solo entra lo imprescindible: el acto en
 * la union de piezas y `acciones` en el bloque.
 */

/**
 * **Por que un boton no se puede pulsar** (#66, `impedido-con-motivo`).
 *
 * El `motivo` es obligatorio, y lo vigila una barrera de tipo: un impedimento sin motivo es el
 * `disabled` mudo que este hueco existe para quitar. Quien mira un boton apagado sin motivo concluye
 * lo que se le ocurra —«no tengo permiso», «esto esta roto»— y ninguna tiene por que ser la
 * verdadera.
 */
export interface Impedimento {
  /** Cuando impide. Lee `nombrados`, igual que `cuando`. */
  readonly si: Condicion;
  /** Lo que se dice, visible y atado al boton con `aria-describedby`. */
  readonly motivo: Texto;
}

/**
 * **A donde lleva una accion** (#66, `navegar-a-otra-hoja`).
 *
 * `hoja` es la clave del destino en el catalogo del marco; `sujeto` y `parametros` son textos que se
 * resuelven contra `nombrados` antes de viajar. Donde viajan en la ruta lo decide `@kamayuk/shell`.
 */
export interface DestinoDeUnaAccion {
  readonly hoja: string;
  readonly sujeto?: Texto;
  readonly parametros?: Readonly<Record<string, Texto>>;
}

/** Lo que tienen en comun las tres clases de accion. */
interface ComunDeUnaAccion {
  readonly rotulo: Texto;
  /** La principal, en azul. Una por grupo, como en el pie. */
  readonly principal?: boolean;
  /** Gana el primero que se cumple. */
  readonly impedida?: readonly Impedimento[];
}

/**
 * **Una accion: un boton que abre un acto, va a otra hoja o hace algo del sistema** (#66,
 * `acciones-del-bloque`).
 *
 * Es una union y no tres campos opcionales, a proposito: una accion que abriera un acto Y fuera a
 * otra hoja no tiene significado, y con tres opcionales compilaria. Los `?: never` son los que lo
 * impiden de verdad: sin ellos TypeScript admite `{ abre, va }`, porque en una union la comprobacion
 * de propiedades de mas mira todas las ramas a la vez (medido con la barrera de tipo).
 */
export type DefinicionDeAccion = ComunDeUnaAccion &
  (
    | {
        /** La `clave` del acto de esta misma hoja que se abre. */
        readonly abre: string;
        readonly va?: never;
        readonly hace?: never;
        /**
         * Lo que el acto necesita saber de donde se abrio: la fila sobre la que se actua (#65).
         * Se resuelve contra `nombrados` y llega al manejador en `EnvioDeUnActo.parametros`.
         */
        readonly con?: Readonly<Record<string, Texto>>;
      }
    | { readonly va: DestinoDeUnaAccion; readonly abre?: never; readonly hace?: never }
    | {
        /** La clave de una operacion del sistema en `<Pantalla alHacer>`: «Volver a leer la lista». */
        readonly hace: string;
        readonly abre?: never;
        readonly va?: never;
      }
  );

/**
 * Un campo de un acto: **un campo del bloque, con el nombre con que viaja**.
 *
 * Es el mismo `DefinicionDeCampo` y se dibuja con la misma pieza, asi que lo que #65 le ensene a un
 * campo vale aqui sin tocar nada. Lo que un acto necesita de mas es saber como se llama cada valor al
 * enviarlo, y si se puede dejar en blanco.
 */
export type CampoDelActo = DefinicionDeCampo & {
  /** La clave del valor en `EnvioDeUnActo.valores`. No se traduce: es codigo. */
  readonly nombre: string;
  /** Sin el, el campo es obligatorio. Un campo de solo lectura nunca lo es: no se escribe. */
  readonly opcional?: boolean;
};

/**
 * **La observacion de un acto**: la regla 10 de los cinco repositorios, como dato (#66, AC-2).
 *
 * «Toda modificacion de datos exige observacion del usuario. Sin observacion no se guarda.» Por eso
 * es obligatoria **en el tipo** del acto, y por eso sus limites no tienen valor por omision: un
 * minimo escrito en la libreria seria el de un sistema, y el dia que otro pidiera otro, la pantalla
 * afirmaria el limite viejo.
 */
export interface ObservacionDelActo {
  readonly etiqueta: Texto;
  readonly ayuda?: Texto;
  /** En caracteres, contados sobre lo escrito sin los blancos de los extremos. */
  readonly largo: { readonly minimo: number; readonly maximo: number };
}

/** Lo que se dibuja cuando el sistema acepta la escritura. */
export interface HechoDelActo {
  readonly titulo: Texto;
  /** Puede llevar lo que el servidor contesto: el sistema lo pone en `nombrados`. */
  readonly texto?: Texto;
  /** «Volver a leer la lista»: refrescar solo dejaria sin saber cual de las dos cosas se mira. */
  readonly acciones?: readonly DefinicionDeAccion[];
}

/**
 * **Un acto: un formulario que escribe, con la observacion obligatoria** (#66,
 * `acto-con-observacion` y `confirmacion-de-lo-irreversible`).
 *
 * Solo existe **abierto**: `<Pantalla actoAbierto>` —o, sin el, el estado de la pantalla— dice cual.
 * La `clave` es a la vez lo que una accion `abre`, lo que `<Pantalla actos>` atiende y la clave del
 * fallo de su escritura en `datos.lecturas`, como dejo escrito #44.
 */
export interface DefinicionDeActo extends ComunDeUnaPieza {
  readonly tipo: 'acto';
  readonly clave: string;
  /** El titulo de la tarjeta y el rotulo del primario: el acto se llama como su boton. */
  readonly titulo: Texto;
  /** Que hace, en una frase. */
  readonly nota?: Texto;
  /** Sus campos. La observacion NO va aqui: va siempre, y siempre la ultima. */
  readonly campos: readonly CampoDelActo[];
  readonly observacion: ObservacionDelActo;
  /**
   * Si esta, **el acto no se deshace**: el primario no envia y abre la confirmacion, con esto
   * escrito delante. Nunca un `confirm()` del navegador.
   */
  readonly advertencia?: Texto;
  /** Lo que impide enviar por el dominio: «falta elegir un grupo». Va antes que lo que falta rellenar. */
  readonly impedido?: readonly Impedimento[];
  readonly hecho?: HechoDelActo;
  /**
   * **Un secundario al pie que vacia lo escrito, y lo dice** (#86, `descartar-lo-escrito`).
   *
   * Vacia los valores, la observacion, el intento y el rechazo; la hoja queda limpia si lo del acto
   * era lo unico tecleado. `dicho` es lo que se anuncia despues en una region viva; sin el, la frase
   * del saco. Sin `descartar` no hay boton, y el pie es el de siempre.
   */
  readonly descartar?: { readonly rotulo: Texto; readonly dicho?: Texto };
  /**
   * **Cuando se pintan los errores de los campos** (#86, `errores-tras-el-primer-intento`).
   *
   * Con `'trasElPrimerIntento'`, despues de pulsar el primario —impedido o no— cada obligatorio vacio
   * lleva su error bajo el campo, con `aria-invalid`: el de `mensajes.obligatorio` del campo, o la
   * frase del saco. Antes del primer intento, nada en rojo: un campo en rojo antes de escribir en el
   * se lee como una reprimenda (`normativa`, H07). Sin el dato, solo la observacion dice su error bajo
   * el campo, como desde #66, y lo que falta se dice una vez en el motivo del primario.
   *
   * Es una union de un valor y no un booleano a proposito: «siempre» es la reprimenda de arriba, y
   * «nunca» es lo de hoy, que se dice no poniendo el dato.
   */
  readonly errores?: 'trasElPrimerIntento';
  /**
   * **Un aviso que sale abajo y se va solo** cuando el sistema acepta la escritura (#86,
   * `aviso-efimero-tras-un-acto`): «Grupo abierto». Es `avisar` —el `sonner` de `<Avisos>`, que el
   * marco monta una vez—, en una region viva que no roba el foco. **No sustituye a lo hecho**: la
   * tarjeta sigue diciendolo en su sitio, que es lo que queda cuando el aviso ya se fue.
   *
   * Se resuelve con los datos que hay AL TERMINAR: lo que el servidor contesto llega a `nombrados`
   * despues, y un aviso que lo nombrara saldria con la raya del dato ausente.
   */
  readonly alTerminar?: { readonly aviso: Texto };
  /** Y cuando la rechaza. El fallo detallado sigue siendo el de `datos.lecturas`, encima del formulario. */
  readonly alFallar?: { readonly aviso: Texto };
}

/** Lo que el manejador de un acto recibe. La libreria no pone ningun nombre del cuerpo de la peticion. */
export interface EnvioDeUnActo {
  /** Por `nombre`, sin los opcionales que se dejaron en blanco y sin los de solo lectura. */
  readonly valores: Readonly<Record<string, string | boolean>>;
  /** Recortada: los blancos de los extremos no cuentan para el largo ni viajan. */
  readonly observacion: string;
  /** Los de la accion que lo abrio (`con`), ya resueltos. Vacio si nadie los dio. */
  readonly parametros: Readonly<Record<string, string>>;
}

/**
 * El registro `clave del acto -> manejador`.
 *
 * **Puede devolver una promesa**, y la pantalla la espera: mientras esta pendiente el acto esta en
 * curso y una segunda pulsacion no vuelve a llamar. Rechazada, lo escrito se queda; el fallo lo pone
 * el sistema en `datos.lecturas` con la clave del acto.
 */
export type ManejadoresDeLosActos = Readonly<Record<string, (envio: EnvioDeUnActo) => void | Promise<unknown>>>;

/** Las operaciones del sistema que una accion `hace`. Tambien pueden devolver una promesa. */
export type ManejadoresDeLasAcciones = Readonly<Record<string, () => void | Promise<unknown>>>;

/** Lo que una accion que `va` pide al marco, ya resuelto. */
export interface PeticionDeNavegacion {
  readonly hoja: string;
  readonly sujeto?: string;
  readonly parametros?: Readonly<Record<string, string>>;
}

/**
 * **Lo que la pantalla necesita del marco para ir a otra hoja**.
 *
 * `@kamayuk/ui` no importa `@kamayuk/shell` —es al reves—, asi que esto es una forma y no un import:
 * `useNavegacion()` de `@kamayuk/shell` devuelve un objeto que cabe aqui tal cual.
 */
export interface NavegacionDeLaPantalla {
  /** Si el catalogo de hoy ofrece esa hoja. Lo que no ofrece no se abre, ni desde una accion. */
  readonly ofrece: (hoja: string) => boolean;
  readonly ir: (peticion: PeticionDeNavegacion) => unknown;
}
