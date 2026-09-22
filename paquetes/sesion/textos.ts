/**
 * **Las treinta palabras que la escalera dice por su cuenta** (#52).
 *
 * <h2>El problema es el mismo que tenia el armazon, y la solucion tambien</h2>
 *
 * `peldanoDe()` devuelve lo que hay que ensenar: un titulo, una explicacion y un remedio. Hasta
 * #52 esas frases estaban escritas dentro de `escalera.ts`, una por rama, y por tanto **no se
 * podian traducir nunca**: un sistema que traduzca sus pantallas y llame a esta escalera se queda
 * con el cuerpo en su idioma y el fallo en castellano — y el fallo es justo lo que se lee cuando
 * algo va mal. Asi que entran como dato, igual que las treinta y dos del armazon
 * (`paquetes/shell/textos.ts`) y que las de `@kamayuk/ui`.
 *
 * **Sin motor de traduccion**, por lo mismo que alli: `i18next` como `peerDependency` obligaria a
 * los cinco sistemas a montarlo antes de dibujar un aviso. `PEER_DECLARADAS.sesion` sigue siendo
 * `[]` y lo comprueba `verificaciones/el-texto-visible-es-dato.test.ts`.
 *
 * <h2>UNO plano, y no uno por peldano</h2>
 *
 * El saco es **plano a proposito**: `marcarElSaco` (`verificaciones/marcas.ts:48-55`) recorre
 * `Object.entries` y sustituye cada valor por su clave marcada, asi que un saco anidado dejaria
 * un objeto entero convertido en la cadena `⟦…⟧` y la guarda no mediria nada. Por eso las claves
 * llevan el peldano en el nombre en vez de agruparse.
 *
 * <h2>Lo que NO esta aqui: lo que dijo el backend</h2>
 *
 * El `detalle` de un peldano es, cuando el backend hablo, **lo que el backend dijo tal cual** —la
 * regla que se incumplio con su cifra dentro, el nombre de la cuenta, el choque concreto—. Eso no
 * pasa por este saco y no se traduce aqui: lo escribe el servidor, en el idioma en que conteste.
 * Lo que este saco pone es **el respaldo**, para cuando no dijo nada.
 *
 * <h2>Las cuatro funciones son funciones porque llevan un dato dentro</h2>
 *
 * La operacion del 404, el estado de la averia, el campo por el que se pidio ordenar y el numero
 * de incidencia caen en distinto sitio en cada idioma, y partir la frase en dos cadenas decide
 * por el traductor donde va. Como funcion, el dato entra donde el idioma lo ponga.
 *
 * <h2>Y ninguna frase supone un sistema</h2>
 *
 * Dos lo suponian hasta #52, y las dos venian de que la escalera salio de `rentas` cuando `rentas`
 * era el unico que se autenticaba: el remedio del 403 `SIN_MUNICIPALIDAD` decia «sin eso no hay
 * padron que ensenar» —`normativa` no tiene padron— y el del 404 decia «revise con que cuenta esta
 * entrando», que es el 404 de la sesion de `rentas` («el token identifica a 'X', que no es un
 * usuario de esta municipalidad», `rentas@ac379ac` `AdministrarSesion.java:155-166`). Medido en
 * `identidad`, ahi un 404 dice «No hay ningun <x> con identificador <id>»
 * (`AdministrarSeguridad.java:409-412`) y la cuenta sin alta recibe **403 `SIN_PRIVILEGIO`**
 * (`GuardiaDeAcceso.java:127-136`): el remedio viejo mandaba a mirar la cuenta ante un recurso que
 * simplemente no existe.
 */

/** Lo que la escalera dice, palabra por palabra. Todo lo que una pantalla puede querer traducir. */
export interface TextosDeLaEscalera {
  // ── No llego ninguna respuesta: la red, el proxy o el backend apagado ────────────────────────
  readonly elSistemaNoContesta: string;
  readonly laPeticionNoLlego: string;
  readonly reintenteOAviseASoporte: string;

  // ── 401 ─────────────────────────────────────────────────────────────────────────────────────
  readonly hayQueVolverAIdentificarse: string;
  /** El respaldo del detalle: la cadena de identidad no manda `detail`. */
  readonly sinTokenValido: string;
  readonly vuelvaAIdentificarse: string;

  // ── 403 SIN_MUNICIPALIDAD ───────────────────────────────────────────────────────────────────
  readonly sinMunicipalidadAsignada: string;
  readonly elTokenNoDiceLaMunicipalidad: string;
  readonly laAsignaQuienAdministra: string;

  // ── 403 SIN_PRIVILEGIO ──────────────────────────────────────────────────────────────────────
  readonly faltaUnPermiso: string;
  readonly sinElPrivilegioQueSePide: string;
  readonly pidaElPermiso: string;

  // ── 403 sin codigo, o con uno que esta escalera no conoce ───────────────────────────────────
  readonly noSePermitioLaOperacion: string;
  readonly elBackendRechazoLaPeticion: string;
  readonly reviseConQueCuentaTrabaja: string;

  // ── 404 ─────────────────────────────────────────────────────────────────────────────────────
  readonly noSeEncontroLoSolicitado: string;
  /** El respaldo del detalle. Lleva dentro `VERBO /ruta`, que es lo unico que se sabe. */
  readonly noSeEncontroLaOperacion: (operacion: string) => string;
  readonly compruebeLoQueSePidio: string;

  // ── 409 ─────────────────────────────────────────────────────────────────────────────────────
  readonly elEstadoNoAdmiteLaOperacion: string;
  readonly elBackendRechazoPorElEstado: string;
  readonly cambieLoQueDiceElMensaje: string;

  // ── 422 ORDEN_NO_ADMITIDO ───────────────────────────────────────────────────────────────────
  readonly noSePuedeOrdenarPorEseCampo: string;
  /**
   * El detalle: lo que el backend dijo, mas el campo que viaja aparte.
   *
   * El `mensaje` de este codigo es fijo —«No se puede ordenar por ese campo»,
   * `CodigoDeError.java:61`— y el campo solo llega en `detalles` («Campo pedido: …»). Se pegan
   * aqui, en el saco, **sin partir la cadena del backend**: esta escalera no lee «Campo pedido:»
   * para sacar el campo, porque eso seria clavar una frase castellana del servidor en el cliente.
   */
  readonly elCampoQueSePidio: (dijo: string, detalles: readonly string[]) => string;
  readonly loArreglaQuienHizoLaPantalla: string;

  // ── 422 con cualquier otro codigo, o sin ninguno ────────────────────────────────────────────
  readonly noCumpleUnaRegla: string;
  readonly elBackendRechazoElContenido: string;
  readonly corrijaLoQueDiceElMensaje: string;

  // ── 5xx, y todo estado que esta escalera no nombra ──────────────────────────────────────────
  readonly elSistemaNoPudoContestar: string;
  /** El detalle: lo que el backend dijo, con su estado dentro para poder dictarlo. */
  readonly loQueDijoConSuEstado: (dijo: string, estado: number) => string;
  /**
   * El remedio, que **cambia segun haya incidencia o no**.
   *
   * Con incidencia, es el identificador lo que se le da a soporte: es lo unico con lo que
   * encuentra la causa en el registro del servidor. Sin ella no se promete ningun identificador,
   * porque no lo hay — y mandar a pedir un numero que no existe hace perder una llamada.
   */
  readonly aviseASoporte: (incidencia: string | null) => string;
}

/** Lo que hoy se lee, palabra por palabra. Quien no pase `textos`, sigue viendo esto. */
export const TEXTOS_DE_LA_ESCALERA: TextosDeLaEscalera = {
  elSistemaNoContesta: 'El sistema no contesta',
  laPeticionNoLlego:
    'La peticion no llego a completarse. El backend puede estar apagado, o este puesto no ' +
    'alcanzarlo.',
  reintenteOAviseASoporte: 'Reintente en unos segundos. Si sigue igual, avise a soporte.',

  hayQueVolverAIdentificarse: 'Hay que volver a identificarse',
  sinTokenValido: 'La peticion no trae un token valido.',
  vuelvaAIdentificarse:
    'La sesion caduco o todavia no se ha abierto. Vuelva a identificarse para seguir trabajando.',

  sinMunicipalidadAsignada: 'Esta cuenta no tiene municipalidad asignada',
  elTokenNoDiceLaMunicipalidad: 'El token no identifica una municipalidad.',
  laAsignaQuienAdministra:
    'La cuenta existe y entro bien, pero no dice de que municipalidad es, y sin eso el sistema no ' +
    'sabe con que datos trabajar. La asigna quien administra la identidad.',

  faltaUnPermiso: 'Falta un permiso para esta operacion',
  sinElPrivilegioQueSePide: 'La cuenta no tiene el privilegio que esta operacion pide.',
  pidaElPermiso:
    'No es una averia: el sistema contesto lo que tenia que contestar. Pida el permiso a quien ' +
    'administre los perfiles, indicando que operacion estaba haciendo.',

  noSePermitioLaOperacion: 'La operacion no se permitio',
  elBackendRechazoLaPeticion: 'El backend rechazo la peticion.',
  reviseConQueCuentaTrabaja: 'No es una averia. Revise con que cuenta esta trabajando.',

  noSeEncontroLoSolicitado: 'No se encontro lo solicitado',
  noSeEncontroLaOperacion: (operacion) => `El backend no encontro «${operacion}».`,
  compruebeLoQueSePidio:
    'No es una averia: el backend contesto que eso no existe. Compruebe lo que se pidio; si deberia ' +
    'existir, pregunte a quien lo administra.',

  elEstadoNoAdmiteLaOperacion: 'El estado actual no admite esta operacion',
  elBackendRechazoPorElEstado: 'El backend rechazo la operacion por el estado en que esta.',
  cambieLoQueDiceElMensaje:
    'No es una averia, y reintentar tal cual da el mismo resultado. Cambie lo que dice el mensaje ' +
    'y vuelva a intentarlo.',

  noSePuedeOrdenarPorEseCampo: 'No se puede ordenar por ese campo',
  elCampoQueSePidio: (dijo, detalles) =>
    detalles.length === 0 ? dijo : `${dijo} (${detalles.join('; ')})`,
  loArreglaQuienHizoLaPantalla:
    'No hay nada que corregir en lo que escribio: el orden lo pidio la pantalla. Ordene por otra ' +
    'columna y avise de esto a quien la mantiene.',

  noCumpleUnaRegla: 'Lo que se mandó no cumple una regla',
  elBackendRechazoElContenido: 'El backend rechazo el contenido de la peticion.',
  corrijaLoQueDiceElMensaje: 'Corrija lo que dice el mensaje y vuelva a intentarlo.',

  elSistemaNoPudoContestar: 'El sistema no pudo contestar',
  loQueDijoConSuEstado: (dijo, estado) => `${dijo} (${String(estado)})`,
  aviseASoporte: (incidencia) =>
    incidencia === null
      ? 'Reintente en unos segundos. Si sigue igual, avise a soporte con este mensaje.'
      : 'Reintente en unos segundos. Si sigue igual, avise a soporte con este numero de ' +
        `incidencia: ${incidencia}`,
};
