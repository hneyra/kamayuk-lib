/**
 * La escalera de la API, leida desde la pantalla: de un fallo a lo que hay que decir y a quien.
 *
 * <h2>Cada peldano es un remedio distinto, y por eso no se pueden juntar</h2>
 *
 * Medido con `curl` contra la instalacion y sobre el `CodigoDeError` de los cinco sistemas:
 *
 * <table>
 *   <tr><td>sin token</td><td><b>401</b> `NO_AUTENTICADO`</td></tr>
 *   <tr><td>token sin el claim `municipalidad_id`</td><td><b>403</b> `SIN_MUNICIPALIDAD`</td></tr>
 *   <tr><td>token sin el permiso que la operacion pide</td><td><b>403</b> `SIN_PRIVILEGIO`</td></tr>
 *   <tr><td>lo pedido no existe en esta municipalidad</td><td><b>404</b> `NO_ENCONTRADO`</td></tr>
 *   <tr><td>el estado actual no admite la operacion</td><td><b>409</b> `CONFLICTO`</td></tr>
 *   <tr><td>la pantalla pidio ordenar por un campo que no esta</td><td><b>422</b> `ORDEN_NO_ADMITIDO`</td></tr>
 *   <tr><td>el cuerpo incumple una regla del dominio</td><td><b>422</b> `VALIDACION`</td></tr>
 * </table>
 *
 * El 404 **no es «la cuenta no es usuario de esta municipalidad»**, aunque hasta #52 esta tabla
 * lo dijera: esa era una operacion de `rentas` (`AdministrarSesion.java`). En `identidad` una
 * cuenta sin alta recibe **403 `SIN_PRIVILEGIO`** (`GuardiaDeAcceso.java:127-136`) y el 404 dice
 * «No hay ningun <x> con identificador <id>» (`AdministrarSeguridad.java:409-412`).
 *
 * <h2>De donde salio cada peldano</h2>
 *
 *   · **El 422 `VALIDACION`, con la primera escritura (I-3, #31).** Medido: una observacion de
 *     tres letras contesta «…al menos 5 caracteres…» y un ejercicio de 1800, «Se admite de 1990 a
 *     2100». Sin el peldano, escribir «ok» en un campo mandaba a **avisar a soporte**.
 *   · **El 409, con las interfaces que ESCRIBEN (#52).** Caia en «Reintente… avise a soporte»,
 *     **el remedio contrario**: ninguno de los 409 del producto se arregla reintentando, y cada uno
 *     dice en su `mensaje` que hay que cambiar (`identidad` `SeguridadController.java:310` y
 *     `AdministrarPermisos.java:313-315`; `normativa` `AdministrarParametros.java:311-330`).
 *   · **El 422 `ORDEN_NO_ADMITIDO`, tambien de #52.** No lo provoca quien escribe sino **la
 *     pantalla**, que pidio ordenar por un campo fuera de la lista blanca. Con el `VALIDACION`,
 *     `normativa` dibujo sus siete errores y le salieron **seis pantallas** (`normativa`#63, #84).
 *   · **`ArchivoRechazado` y `NoEsUnDocumento`, por su clase (#109).** Son `ErrorDeLaApi` a
 *     proposito —la pantalla atrapa UNA clase—, pero su estado no dice lo que paso: 0 es un rechazo
 *     local que no mando ni un byte (`api/subir.ts`), 413 y 415 hablan del archivo y 200 es un
 *     servidor que contesto bien a una peticion mal compuesta. Por estado caian en «averia · avise
 *     a soporte»; usan claves que ya existen, y lo propio va en titulo, detalle y remedio.
 *
 * <h2>Una tabla de reglas, y su orden esta escrito y vigilado (#123)</h2>
 *
 * Hasta #123 eran once ramas `if`, con los cuatro valores por omision copiados en nueve y **un
 * orden con significado que no estaba escrito en ningun sitio**: el 403 con `codigo` antes que el
 * 403 a secas, y el 422 igual. Ahora cada peldano es una fila de `REGLAS`, de lo mas especifico a
 * lo menos, y `escalera.test.ts` afirma que **ninguna queda tapada por otra anterior mas general**
 * (`cubre`). Anadir un peldano es una fila, sus frases en el saco y su clave en `LAS_NUEVE_CLAVES`.
 *
 * <h2>`esAveria` y `reintentable` son DOS preguntas, y ninguna es el estado</h2>
 *
 * Valen `true` **solo en los dos peldanos de averia**, los que NO salen de la tabla. Afinar
 * `reintentable` **entre los 5xx** —un 405 no funciona nunca, y el catalogo de `identidad` dice
 * que no se ofrezca «Reintentar» ante el (`CodigoDeError.java:82-90`)— es otro issue.
 *
 * <h2>Es una funcion pura, y sus palabras son DATO</h2>
 *
 * Sin React, sin `fetch` y sin reloj. El segundo argumento es un `Partial<TextosDeLaEscalera>`
 * fundido sobre el castellano por omision, como `<Armazon textos>`: con uno solo, lo de siempre.
 */

import { ArchivoRechazado, ErrorDeLaApi, NoEsUnDocumento } from '../api/index.ts';
import type { MotivoDelRechazo } from '../api/index.ts';
import { TEXTOS_DE_LA_ESCALERA, type TextosDeLaEscalera } from './textos.ts';

/** Que decir, y que ofrecer, ante un fallo de la API. */
export interface Peldano {
  /** Identificador estable del peldano. Es lo que las pruebas nombran. */
  readonly clave:
    | 'sin-identidad'
    | 'sin-municipalidad'
    | 'sin-privilegio'
    | 'no-encontrado'
    | 'no-permitido'
    | 'conflicto'
    | 'orden-no-admitido'
    | 'no-valido'
    | 'averia';
  readonly titulo: string;
  /** Lo que paso, en una frase. Cuando el backend lo dice, es lo que el backend dijo. */
  readonly detalle: string;
  /** Que hacer para salir de aqui. Nunca «reintente» a secas. */
  readonly remedio: string;
  /** Si la pantalla ofrece el boton que vuelve a la puerta de identidad. */
  readonly pideIdentidad: boolean;
  /**
   * Si esto es el sistema roto o el sistema funcionando, y decide el tono. `false` en todo lo que
   * sale de `REGLAS`: ahi el backend leyo la peticion, la entendio y contesto lo que debia.
   */
  readonly esAveria: boolean;
  /**
   * Si volver a mandar la misma peticion, sin cambiar nada, puede dar otro resultado: decide si se
   * ofrece «Reintentar». No es `esAveria`: un 409 no es una averia **y ademas** no cambia por
   * insistir, y un corte de red no es culpa de nadie y si.
   */
  readonly reintentable: boolean;
  /**
   * El identificador con el que soporte encuentra la causa, o `null`. Un campo y no un trozo de
   * frase, para ensenarlo aparte y copiable. Solo lo llevan los 500 que lo traen.
   */
  readonly incidencia: string | null;
}

/** Las claves del saco que son una frase suelta, y no una funcion con un dato dentro. */
type Frase = {
  [K in keyof TextosDeLaEscalera]: TextosDeLaEscalera[K] extends string ? K : never;
}[keyof TextosDeLaEscalera];

/** Lo que un fallo tiene que cumplir para caer en una regla. Lo que no se pone, no se mira. */
export interface Condicion {
  /** La subclase de `ErrorDeLaApi`, para los que se miran por su clase y no por su estado. */
  readonly clase?: new (...argumentos: never[]) => ErrorDeLaApi;
  /** El motivo de un `ArchivoRechazado`. */
  readonly motivo?: MotivoDelRechazo;
  readonly estado?: number;
  readonly codigo?: string;
}

/** Un peldano de la escalera: cuando se pisa, y que dice. */
export interface Regla {
  /** Nunca `averia`: la averia es lo que queda cuando ninguna regla se cumple. */
  readonly clave: Exclude<Peldano['clave'], 'averia'>;
  readonly cuando: Condicion;
  readonly titulo: Frase;
  readonly remedio: Frase;
  readonly detalle: (fallo: ErrorDeLaApi, t: TextosDeLaEscalera) => string;
  /** Solo el 401. Lo que no esta aqui vale lo mismo en todas: ni averia, ni reintentable. */
  readonly pideIdentidad?: true;
}

/** Lo que el backend dijo, o el respaldo si esa respuesta no traia texto. */
function loQueDijo(fallo: ErrorDeLaApi, respaldo: string): string {
  return fallo.mensaje ?? fallo.detalle ?? fallo.titulo ?? respaldo;
}

/** El detalle de casi todas: lo que el backend dijo, y si no dijo nada, esa frase del saco. */
const dijo =
  (respaldo: Frase) =>
  (fallo: ErrorDeLaApi, t: TextosDeLaEscalera): string =>
    loQueDijo(fallo, t[respaldo]);

/**
 * La escalera, **de lo mas especifico a lo menos**: gana la primera que se cumple.
 *
 * El detalle es **lo que el backend dijo, tal cual**, y el saco solo pone el respaldo. Nunca se
 * resume: el 404 nombra lo que no encontro, el 409 lo que choca y el 422 la regla con su cifra
 * —«al menos 5 caracteres»—, que es lo unico con lo que quien esta delante corrige. Copiar la
 * regla aqui para adelantarla seria peor: seria tener dos verdades.
 */
export const REGLAS: readonly Regla[] = [
  // Las dos subclases van ANTES que el estado, porque su estado no dice lo que paso (#109). Un
  // archivo rechazado es lo mismo que un 422 —lo corrige quien lo mando—, y si el servidor explico
  // el 413/415, lo que dijo es lo unico que nombra SU limite.
  {
    clave: 'no-valido', cuando: { clase: ArchivoRechazado, motivo: 'demasiado-grande' },
    titulo: 'elArchivoPesaDeMas', remedio: 'elijaUnArchivoMasLiviano',
    detalle: dijo('superaElTamanoAdmitido'),
  },
  {
    clave: 'no-valido', cuando: { clase: ArchivoRechazado, motivo: 'tipo-no-admitido' },
    titulo: 'elArchivoNoEsDeUnTipoAdmitido', remedio: 'elijaUnArchivoDeOtroTipo',
    detalle: dijo('esteTipoNoSeAdmite'),
  },
  // Como `ORDEN_NO_ADMITIDO`: la peticion la compuso la pantalla, y quien la usa no corrige nada.
  {
    clave: 'orden-no-admitido', cuando: { clase: NoEsUnDocumento },
    titulo: 'noLlegoUnDocumento', remedio: 'loArreglaQuienHizoLaDescarga',
    detalle: dijo('llegaronDatosEnVezDeUnDocumento'),
  },
  {
    clave: 'sin-identidad', cuando: { estado: 401 },
    titulo: 'hayQueVolverAIdentificarse', remedio: 'vuelvaAIdentificarse',
    detalle: dijo('sinTokenValido'),
    pideIdentidad: true,
  },
  // Sin volver a la puerta: entrar otra vez con la misma cuenta trae el mismo token y el mismo
  // 403. Lo que falta esta del lado del administrador, no del navegador.
  {
    clave: 'sin-municipalidad', cuando: { estado: 403, codigo: 'SIN_MUNICIPALIDAD' },
    titulo: 'sinMunicipalidadAsignada', remedio: 'laAsignaQuienAdministra',
    detalle: dijo('elTokenNoDiceLaMunicipalidad'),
  },
  {
    clave: 'sin-privilegio', cuando: { estado: 403, codigo: 'SIN_PRIVILEGIO' },
    titulo: 'faltaUnPermiso', remedio: 'pidaElPermiso',
    detalle: dijo('sinElPrivilegioQueSePide'),
  },
  // Sin `codigo`, o con uno que no se conoce: adivinar cual de los dos es mandaria a la mitad de
  // los casos a pedir un permiso que no falta.
  {
    clave: 'no-permitido', cuando: { estado: 403 },
    titulo: 'noSePermitioLaOperacion', remedio: 'reviseConQueCuentaTrabaja',
    detalle: dijo('elBackendRechazoLaPeticion'),
  },
  // Si ademas trae `parametroQueFalta`, sigue en el error: que hacer con el es de la pantalla
  // (`normativa`#66 y #67). Sin mensaje, lo unico que se sabe es `VERBO /ruta`.
  {
    clave: 'no-encontrado', cuando: { estado: 404 },
    titulo: 'noSeEncontroLoSolicitado', remedio: 'compruebeLoQueSePidio',
    detalle: (fallo, t) => loQueDijo(fallo, t.noSeEncontroLaOperacion(fallo.operacion)),
  },
  // Hasta #52 caia en la averia: reintentar el mismo sellado del mismo conjunto da el mismo 409.
  {
    clave: 'conflicto', cuando: { estado: 409 },
    titulo: 'elEstadoNoAdmiteLaOperacion', remedio: 'cambieLoQueDiceElMensaje',
    detalle: dijo('elBackendRechazoPorElEstado'),
  },
  // Su `mensaje` es fijo y el campo viaja en `detalles`. Los dos juntos, sin partir ninguno: leer
  // «Campo pedido: » aqui seria clavar una frase castellana del servidor dentro del cliente.
  {
    clave: 'orden-no-admitido', cuando: { estado: 422, codigo: 'ORDEN_NO_ADMITIDO' },
    titulo: 'noSePuedeOrdenarPorEseCampo', remedio: 'loArreglaQuienHizoLaPantalla',
    detalle: (fallo, t) =>
      t.elCampoQueSePidio(loQueDijo(fallo, t.noSePuedeOrdenarPorEseCampo), fallo.detalles),
  },
  // Mandar a soporte por esto es mandar a soporte porque alguien escribio «ok».
  {
    clave: 'no-valido', cuando: { estado: 422 },
    titulo: 'noCumpleUnaRegla', remedio: 'corrijaLoQueDiceElMensaje',
    detalle: dijo('elBackendRechazoElContenido'),
  },
];

/** Los campos de la condicion que se comparan tal cual, y de donde sale cada uno en el fallo. */
const EN_EL_FALLO: {
  readonly [K in 'motivo' | 'estado' | 'codigo']-?: (fallo: ErrorDeLaApi) => Condicion[K] | null;
} = {
  motivo: (fallo) => (fallo instanceof ArchivoRechazado ? fallo.motivo : null),
  estado: (fallo) => fallo.estado,
  codigo: (fallo) => fallo.codigo,
};
const CAMPOS = ['motivo', 'estado', 'codigo'] as const;

/** Si el fallo cumple la condicion: todo lo que la condicion pone, y nada mas. */
function cumple(fallo: ErrorDeLaApi, cuando: Condicion): boolean {
  return (
    (cuando.clase === undefined || fallo instanceof cuando.clase) &&
    CAMPOS.every((c) => cuando[c] === undefined || cuando[c] === EN_EL_FALLO[c](fallo))
  );
}

/**
 * Si todo fallo que cumple `especifica` cumple tambien `general`, o sea, si `general` puesta
 * antes la dejaria sin alcanzar. Es la prueba de la regla tapada, y lee la condicion con los
 * mismos `CAMPOS` que `cumple`.
 */
export function cubre(general: Condicion, especifica: Condicion): boolean {
  const { clase } = general;
  const porClase =
    clase === undefined ||
    (especifica.clase !== undefined &&
      (especifica.clase === clase || especifica.clase.prototype instanceof clase));
  return porClase && CAMPOS.every((c) => general[c] === undefined || general[c] === especifica[c]);
}

/**
 * En que peldano de la escalera se ha quedado esta peticion.
 *
 * @param fallo lo que lanzo `solicitar()`. No tiene por que ser un `ErrorDeLaApi`: un corte de
 *   red lanza un `TypeError`, y ese caso tambien tiene que contestar algo.
 * @param textos lo que se quiera decir en vez del castellano por omision. Es un `Partial`: lo que
 *   no se pase sigue siendo lo de siempre, asi que llamarla con un solo argumento no cambia nada.
 */
export function peldanoDe(fallo: unknown, textos: Partial<TextosDeLaEscalera> = {}): Peldano {
  const t: TextosDeLaEscalera = { ...TEXTOS_DE_LA_ESCALERA, ...textos };

  if (!(fallo instanceof ErrorDeLaApi)) {
    return {
      clave: 'averia',
      titulo: t.elSistemaNoContesta,
      detalle: t.laPeticionNoLlego,
      remedio: t.reintenteOAviseASoporte,
      pideIdentidad: false,
      esAveria: true,
      // Nadie contesto: no hay nada escrito en el registro de ningun servidor que buscar.
      reintentable: true,
      incidencia: null,
    };
  }

  const regla = REGLAS.find((r) => cumple(fallo, r.cuando));
  if (regla !== undefined) {
    return {
      clave: regla.clave,
      titulo: t[regla.titulo],
      detalle: regla.detalle(fallo, t),
      remedio: t[regla.remedio],
      // Los valores por omision, una sola vez: nada de lo que la tabla nombra es una averia ni
      // cambia por insistir, y ningun 4xx trae incidencia.
      pideIdentidad: regla.pideIdentidad ?? false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  return {
    clave: 'averia',
    titulo: t.elSistemaNoPudoContestar,
    detalle: t.loQueDijoConSuEstado(loQueDijo(fallo, fallo.operacion), fallo.estado),
    remedio: t.aviseASoporte(fallo.incidencia),
    pideIdentidad: false,
    esAveria: true,
    reintentable: true,
    // Lo unico con lo que soporte encuentra la causa. Hasta #52 se tiraba en el constructor de
    // `ErrorDeLaApi`, y el remedio era el mismo para todos los 500 de todos los sistemas.
    incidencia: fallo.incidencia,
  };
}
