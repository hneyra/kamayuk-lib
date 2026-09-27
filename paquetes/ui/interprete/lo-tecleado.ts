import { useState } from 'react';

import { cambioAlElegir, eleccionDe, momentoDeLaEleccion, valorElegido } from './campos-en-la-ruta.ts';
import { coordenada, type DatosDeLaPantalla } from './datos.ts';
import { useEnElMarcoOAqui } from './en-el-marco-o-aqui.ts';
import type { HojaDelMarco, LoTecleado, TecleadoDeUnActo } from './hoja.ts';
import type { TecleadoDeLosActos } from './interaccion.ts';
import type { DefinicionDeBloque, DefinicionDeCampo, DefinicionDePantalla, OpcionDelCampo, PiezaDeLaPantalla, Texto } from './tipos.ts';

/**
 * **Lo que se teclea en una pantalla: donde vive, cuando ensucia la hoja y en que orden gana**
 * (#86, #94; aparte de `Pantalla` desde #120).
 *
 * Hasta #120 esto eran las primeras ciento cincuenta lineas de `Pantalla`, mezcladas con el acto
 * abierto y el dibujo de las piezas. Son tres cosas, y cada una tiene aqui su sitio:
 *
 * · **`useLoTecleado`: donde vive lo tecleado en los bloques y en los actos** (#86,
 *   `lo-tecleado-y-la-negativa-sobreviven`). En el estado de la pantalla, como desde #27, salvo que
 *   la definicion pida conservarlo y la hoja traiga donde: entonces vive en el marco, junto a la
 *   marca de sucia y con la misma clave, y la `key` por destino ya no lo vacia mientras la hoja siga
 *   sucia. Ver `hoja.ts`. La eleccion entre los dos la hace `useEnElMarcoOAqui`.
 * · **`useEnCurso`: lo que se escribe en un campo que va a la ruta** (#94). Aparte de lo tecleado a
 *   proposito: no ensucia la hoja —no es trabajo sin guardar, es un filtro—, y mezclarlo con lo
 *   demas habria dejado a `alEnsuciar` sin avisar nunca despues de tocar un filtro, porque solo
 *   avisa la primera vez que el saco pasa de vacio a lleno.
 * · **`valoresDelBloque`: en que orden gana cada valor**. Pura.
 */

/**
 * Nada tecleado. Uno solo, para no cambiar en cada pintada. Lo tecleado en los campos va por
 * `bloque|campo`, plano a proposito: una pantalla no anida mas.
 */
export const NADA_TECLEADO: LoTecleado = { campos: {}, actos: {} };

/** Un cambio de lo tecleado, sobre lo que habia. */
type Teclear = (cambio: (antes: LoTecleado) => LoTecleado) => void;

/** Lo que `useLoTecleado` da a la pantalla. */
export interface LoTecleadoDeLaPantalla {
  readonly tecleado: LoTecleado;
  /** Lo tecleado en un campo de un bloque que NO va a la ruta. */
  readonly cambiarElCampo: (bloque: number, campo: number, valor: string | boolean) => void;
  /** La marca de sucia de cada cambio, con `suciaAlTeclear`; si no, nada. */
  readonly marcarSucia: () => void;
  /** El sistema acepto una escritura: lo tecleado se vacia y la hoja queda limpia, con `suciaAlTeclear`. */
  readonly alGuardar: () => void;
  /** Se descarto lo escrito en esa apertura de un acto. */
  readonly alDescartar: (apertura: string) => void;
  /** Donde guardan los actos lo suyo, si es en el marco; `undefined` si cada uno en su estado. */
  readonly tecleadoDeLosActos: TecleadoDeLosActos | undefined;
}

export function useLoTecleado(
  definicion: DefinicionDePantalla<PiezaDeLaPantalla>,
  hoja: HojaDelMarco | undefined,
  alEnsuciar: () => void,
): LoTecleadoDeLaPantalla {
  const alTeclearEnLaHoja = hoja?.alTeclear;
  const enLaHoja = definicion.hoja?.conservaLoTecleado === 'soloSiSucia' ? alTeclearEnLaHoja : undefined;
  const { valor: tecleado, cambiar: teclear } = useEnElMarcoOAqui<LoTecleado, (antes: LoTecleado) => LoTecleado>(
    enLaHoja === undefined
      ? undefined
      : { valor: hoja?.tecleado ?? NADA_TECLEADO, cambiar: (cambio) => enLaHoja((antes) => cambio(antes ?? NADA_TECLEADO)) },
    NADA_TECLEADO,
    (antes, cambio) => cambio(antes),
  );
  const suciaAlTeclear = definicion.hoja?.suciaAlTeclear === true;
  /** Cada cambio que ensucia, con `suciaAlTeclear` (#86). Idempotente en el marco: no cuesta pintar. */
  const marcarSucia = (): void => {
    if (suciaAlTeclear) hoja?.marcarSucia?.();
  };

  return {
    tecleado,
    cambiarElCampo: (bloque, campo, valor) => {
      const clave = `${String(bloque)}|${String(campo)}`;
      // Con `suciaAlTeclear`, CADA cambio (#86): el aviso de la primera tecla no vuelve a salir si lo
      // tecleado no se vacia, y una hoja que alguien marco guardada por su cuenta quedaba limpia con
      // cambios dentro. En el marco es idempotente, y no cuesta un renderizado por tecla.
      marcarSucia();
      if (enLaHoja !== undefined) {
        // Fuera del cambio, y no dentro: el cambio lo aplica el marco en SU estado, y avisar desde
        // ahi seria cambiar otro estado mientras se calcula el suyo.
        if (Object.keys(tecleado.campos).length === 0) alEnsuciar();
        teclear((antes) => ({ ...antes, campos: { ...antes.campos, [clave]: valor } }));
        return;
      }
      teclear((antes) => {
        // El aviso va UNA vez, en la primera tecla, y no en cada pulsacion: quien escucha esto
        // marca la hoja como sucia, y marcarla cuarenta veces seguidas es cuarenta renderizados.
        if (Object.keys(antes.campos).length === 0) alEnsuciar();
        return { ...antes, campos: { ...antes.campos, [clave]: valor } };
      });
    },
    marcarSucia,
    alGuardar: () => {
      // Guardado, la hoja vuelve a estar limpia y lo tecleado se vacia: asi PUEDE volver a
      // ensuciarse (#86). Sin `suciaAlTeclear`, lo de siempre: avisar y nada mas.
      if (!suciaAlTeclear) return;
      teclear(() => NADA_TECLEADO);
      hoja?.marcarGuardada?.();
    },
    alDescartar: (apertura) => {
      // Limpia solo si lo del acto era lo unico tecleado: descartar un acto no puede dar por
      // guardados los campos de un bloque que siguen escritos.
      const queda = sinElActo(tecleado, apertura);
      if (Object.keys(queda.campos).length === 0 && Object.keys(queda.actos).length === 0) {
        hoja?.marcarGuardada?.();
      }
    },
    tecleadoDeLosActos: enLaHoja === undefined ? undefined : tecleadoDeLosActos(tecleado, teclear),
  };
}

/** Lo tecleado sin lo de una apertura de un acto. */
function sinElActo(tecleado: LoTecleado, apertura: string): LoTecleado {
  if (!Object.hasOwn(tecleado.actos, apertura)) return tecleado;
  const actos = { ...tecleado.actos };
  delete actos[apertura];
  return { ...tecleado, actos };
}

/** Lo tecleado en los actos, leido y cambiado dentro de lo tecleado de la hoja (#86). */
function tecleadoDeLosActos(tecleado: LoTecleado, teclear: Teclear): TecleadoDeLosActos {
  return {
    leer: (apertura) => (Object.hasOwn(tecleado.actos, apertura) ? tecleado.actos[apertura] : undefined),
    cambiar: (apertura, cambio) => {
      teclear((antes) => {
        const previo: TecleadoDeUnActo | undefined = Object.hasOwn(antes.actos, apertura)
          ? antes.actos[apertura]
          : undefined;
        const nuevo = cambio(previo);
        return nuevo === undefined ? sinElActo(antes, apertura) : { ...antes, actos: { ...antes.actos, [apertura]: nuevo } };
      });
    },
  };
}

/** `bloque|campo` -> lo que se esta escribiendo en un campo que aun no lo ha llevado a la ruta (#94). */
export type EnCurso = Readonly<Record<string, string>>;

type Bloque = DefinicionDeBloque<Texto, OpcionDelCampo>;
type Campo = DefinicionDeCampo<OpcionDelCampo>;

/** Lo que `useEnCurso` da a la pantalla. */
export interface CamposQueVanALaRuta {
  readonly enCurso: EnCurso;
  /** Tocar un campo que escribe en la ruta. */
  readonly elegir: (bloque: Bloque, indiceDelBloque: number, indiceDelCampo: number, campo: Campo, valor: string) => void;
  /** Salir de un campo `alSalir` —o pulsar Intro en el—. */
  readonly salirDelCampo: (bloque: Bloque, indiceDelBloque: number, indiceDelCampo: number, campo: Campo) => void;
}

/**
 * **Los campos que escriben en la ruta** (#94), que se distinguen de los demas en dos cosas.
 *
 * · **No ensucian la hoja.** Un filtro no es trabajo sin guardar: vive en la barra de direcciones, y
 *   avisar de que «hay cambios sin guardar» por haber acotado una lista manda a guardar algo que no
 *   existe.
 * · **`alElegir` no pasa por el estado de la pantalla**: mueve la ruta y ya esta. La ruta ES el
 *   valor, y guardar ademas una copia aqui deja dos sitios que se pueden desincronizar —el de atras
 *   del navegador contra el de la pantalla—. `alSalir` lleva lo escrito a la ruta **una vez**, y lo
 *   saca de lo que esta en curso para que lo que se vea salga de la ruta.
 *
 * Sin `hoja` no hay donde escribir, y se queda en la pantalla como antes de #94: `cambiarElCampo`.
 */
export function useEnCurso(
  hoja: HojaDelMarco | undefined,
  cambiarElCampo: LoTecleadoDeLaPantalla['cambiarElCampo'],
): CamposQueVanALaRuta {
  const [enCurso, setEnCurso] = useState<EnCurso>({});
  return {
    enCurso,
    elegir: (bloque, indiceDelBloque, indiceDelCampo, campo, valor) => {
      const eleccion = eleccionDe(campo);
      if (eleccion === undefined || hoja === undefined) {
        cambiarElCampo(indiceDelBloque, indiceDelCampo, valor);
        return;
      }
      if (momentoDeLaEleccion(campo) === 'alElegir') {
        hoja.moverLaRuta(cambioAlElegir(bloque, eleccion, valor));
        return;
      }
      setEnCurso((antes) => ({ ...antes, [coordenada(indiceDelBloque, indiceDelCampo)]: valor }));
    },
    salirDelCampo: (bloque, indiceDelBloque, indiceDelCampo, campo) => {
      const eleccion = eleccionDe(campo);
      if (eleccion === undefined || hoja === undefined) return;
      const escrito = enCurso[coordenada(indiceDelBloque, indiceDelCampo)];
      // Nada escrito desde la ultima vez: salir del campo no puede volver a pedir lo mismo.
      if (escrito === undefined) return;
      setEnCurso((antes) => {
        const despues = { ...antes };
        delete despues[coordenada(indiceDelBloque, indiceDelCampo)];
        return despues;
      });
      hoja.moverLaRuta(cambioAlElegir(bloque, eleccion, escrito));
    },
  };
}

/**
 * **Los valores de los campos de un bloque, y en que orden gana cada uno**. Primero lo que se sepa
 * de la API; despues lo que diga la ruta (#94), y por ultimo lo tecleado y lo que esta en curso,
 * porque un campo que alguien esta escribiendo no puede saltar hacia atras cuando llegue una
 * respuesta.
 */
export function valoresDelBloque(
  bloque: number,
  campos: readonly Campo[],
  datos: DatosDeLaPantalla,
  hoja: HojaDelMarco | undefined,
  tecleado: LoTecleado,
  enCurso: EnCurso,
): Record<number, string | boolean> {
  const salida: Record<number, string | boolean> = {};
  campos.forEach((campo, i) => {
    const sabido = datos.valores?.get(coordenada(bloque, i));
    if (sabido !== undefined) salida[i] = sabido;
    const enLaRuta = hoja === undefined ? undefined : valorElegido(campo, hoja.ruta);
    if (enLaRuta !== undefined) salida[i] = enLaRuta;
  });
  for (const [clave, valor] of Object.entries({ ...tecleado.campos, ...enCurso })) {
    const [b, c] = clave.split('|');
    if (b === String(bloque) && c !== undefined) salida[Number(c)] = valor;
  }
  return salida;
}
