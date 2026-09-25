/**
 * **Las palabras que la escalera dice por su cuenta**: treinta desde #52, y nueve mas desde #109.
 *
 * Las nueve de #109 son las de un archivo rechazado y un documento que no lo es, y van **al final**
 * del saco y como claves ADICIONALES: `Peldano['clave']` no crece —la vigila `LAS_NUEVE_CLAVES`—,
 * asi que lo que distingue esos tres casos va en el titulo, el detalle y el remedio.
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

  // ── `ArchivoRechazado` 'demasiado-grande': local (estado 0) o del servidor (413) (#109) ──────
  readonly elArchivoPesaDeMas: string;
  /** El respaldo del detalle: el rechazo local no trae mensaje, y el 413 puede no traerlo. */
  readonly superaElTamanoAdmitido: string;
  readonly elijaUnArchivoMasLiviano: string;

  // ── `ArchivoRechazado` 'tipo-no-admitido': local (estado 0) o del servidor (415) (#109) ──────
  readonly elArchivoNoEsDeUnTipoAdmitido: string;
  readonly esteTipoNoSeAdmite: string;
  readonly elijaUnArchivoDeOtroTipo: string;

  // ── `NoEsUnDocumento`: un 200 con datos donde la pantalla esperaba un documento (#109) ───────
  readonly noLlegoUnDocumento: string;
  readonly llegaronDatosEnVezDeUnDocumento: string;
  /**
   * Como `loArreglaQuienHizoLaPantalla`, y por lo mismo: la peticion la compuso la pantalla. No
   * se reusa aquella porque habla de ordenar por otra columna, que aqui no significa nada.
   */
  readonly loArreglaQuienHizoLaDescarga: string;
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

  elArchivoPesaDeMas: 'El archivo pesa mas de lo que se admite',
  superaElTamanoAdmitido: 'El archivo supera el tamano que esta operacion admite.',
  elijaUnArchivoMasLiviano:
    'No es una averia, y enviar el mismo archivo otra vez da el mismo resultado. Elija uno mas ' +
    'liviano, o reduzcalo, y vuelva a enviarlo.',

  elArchivoNoEsDeUnTipoAdmitido: 'El archivo no es de un tipo que se admita',
  esteTipoNoSeAdmite: 'Esta operacion no admite archivos de ese tipo.',
  elijaUnArchivoDeOtroTipo:
    'No es una averia, y enviar el mismo archivo otra vez da el mismo resultado. Elija un archivo ' +
    'de un tipo que se admita y vuelva a enviarlo.',

  noLlegoUnDocumento: 'Lo que llego no es un documento',
  llegaronDatosEnVezDeUnDocumento:
    'El sistema contesto con datos donde la pantalla esperaba un documento.',
  loArreglaQuienHizoLaDescarga:
    'No hay nada que corregir en lo que hizo: la descarga la pidio la pantalla por un camino que ' +
    'devuelve datos. Avise de esto a quien la mantiene.',
};

/**
 * **Las dieciseis frases que la puerta dice cuando no se pudo entrar** (#118).
 *
 * <h2>Por que llegan ahora, y no con la escalera</h2>
 *
 * `crearIdentidad` escribe lo que se lee en la pantalla de «no se pudo entrar»: el `motivo` y el
 * `detalle` de cada `Vuelta` fallida, y el `motivo` de `FallaDeLaPuerta` cuando el navegador no dio
 * palabras. En #52 se quedaron dentro de `identidad.ts` como **la unica excepcion declarada** de la
 * cuarta forma de `el-texto-visible-es-dato`, con un motivo escrito: «lo reescribe entero
 * `kamayuk-lib`#42, y mudar sus palabras en dos issues a la vez es un conflicto garantizado». #42 se
 * mezclo (`b139342`) y la excepcion siguio ahi, porque se comprobaba entera: solo salia roja el dia
 * que el archivo ya no tuviera frases, y nada empujaba a quitarlas. Medido antes de mudarlas, sin la
 * excepcion el barrido daba **veintiun hallazgos en dieciseis frases**, de la linea 268 a la 572.
 *
 * <h2>La misma forma que el saco de la escalera, y por lo mismo</h2>
 *
 * Plano —`marcarElSaco` no baja a un saco anidado—, con el castellano de hoy por omision, y como
 * `Partial` por el segundo argumento de `crearIdentidad`: con uno solo, la puerta dice palabra por
 * palabra lo que decia. **Sin motor de traduccion**: `PEER_DECLARADAS.sesion` sigue siendo `[]`.
 *
 * <h2>Lo que NO esta aqui: lo que dijeron el emisor y el navegador</h2>
 *
 * El `error_description` que Keycloak manda en la vuelta es **lo que el emisor dijo**, y el
 * `motivo` de `FallaDeLaPuerta` es, cuando el navegador hablo, **lo que el navegador dijo** —«Failed
 * to fetch»—, que es lo que se puede buscar y lo que sale en su consola. Ninguno de los dos pasa por
 * este saco, igual que el `detalle` del backend no pasa por el de la escalera: este saco pone **el
 * respaldo**, para cuando no dijeron nada.
 *
 * <h2>Las tres funciones son funciones porque llevan un dato dentro</h2>
 *
 * Los segundos de la espera, el codigo de error del emisor y el estado HTTP del canje caen en
 * distinto sitio en cada idioma. Como en la escalera, el dato entra donde el idioma lo ponga.
 */

/** Lo que la puerta dice, palabra por palabra, cuando no se pudo entrar. */
export interface TextosDeLaPuerta {
  // ── La sonda: `FallaDeLaPuerta.motivo` cuando el navegador no dio palabras ──────────────────
  /** Lo que se lanzo no era un `Error`, asi que no hay mensaje del navegador que repetir. */
  readonly laPeticionNoLlegoACompletarse: string;
  /** Se agoto la espera de la sonda. Lleva dentro los segundos que se espero. */
  readonly noContestoEn: (segundos: number) => string;

  // ── La vuelta con `?error=`: el motivo, segun el codigo de OAuth que mando el emisor ────────
  /** `access_denied`. */
  readonly noSeCompletoLaEntrada: string;
  /** `invalid_scope`. */
  readonly elAlcanceNoExisteEnElEmisor: string;
  /** `unauthorized_client` e `invalid_client`. */
  readonly elEmisorNoReconoceAlCliente: string;
  /** `temporarily_unavailable` y `server_error`. */
  readonly elEmisorTuvoUnProblema: string;
  /** Cualquier otro codigo. */
  readonly elEmisorNoDejoEntrar: string;
  /** El respaldo del detalle, cuando el emisor no mando `error_description`. Lleva el codigo. */
  readonly elEmisorContesto: (error: string) => string;

  // ── La vuelta sin el `state` que se guardo al salir ─────────────────────────────────────────
  readonly laVueltaNoCuadraConLaIda: string;
  readonly elCodigoLlegoSinSuEstado: string;

  // ── El canje no llego a completarse ─────────────────────────────────────────────────────────
  readonly elEmisorNoContesto: string;
  readonly elCanjeNoLlegoACompletarse: string;

  // ── El canje volvio con un estado que no es 2xx ─────────────────────────────────────────────
  readonly elEmisorRechazoElCanje: string;
  /** El detalle. Lleva dentro el estado HTTP con el que volvio. */
  readonly elCanjeVolvioCon: (estado: number) => string;

  // ── El canje volvio bien, pero sin `access_token` ───────────────────────────────────────────
  readonly elEmisorNoDevolvioNingunToken: string;
  readonly laRespuestaDelCanjeNoTraeElToken: string;
}

/** Lo que hoy se lee en la puerta, palabra por palabra. Quien no pase `textos`, sigue viendo esto. */
export const TEXTOS_DE_LA_PUERTA: TextosDeLaPuerta = {
  laPeticionNoLlegoACompletarse: 'la peticion no llego a completarse',
  noContestoEn: (segundos) => `no contesto en ${String(segundos)} s`,

  noSeCompletoLaEntrada: 'No se completo la entrada',
  elAlcanceNoExisteEnElEmisor: 'El alcance que se pide no existe en el emisor',
  elEmisorNoReconoceAlCliente: 'El emisor no reconoce a este cliente',
  elEmisorTuvoUnProblema: 'El emisor tuvo un problema',
  elEmisorNoDejoEntrar: 'El emisor no dejo entrar',
  elEmisorContesto: (error) => `El emisor contesto «${error}».`,

  laVueltaNoCuadraConLaIda: 'La vuelta no cuadra con la ida',
  elCodigoLlegoSinSuEstado:
    'El codigo llego sin el estado que se guardo al salir. Suele pasar al abrir un ' +
    'enlace de vuelta antiguo o en otra pestana; tambien es lo que se ve si alguien ' +
    'intenta colar un codigo ajeno.',

  elEmisorNoContesto: 'El emisor no contesto',
  elCanjeNoLlegoACompletarse:
    'La peticion del canje no llego a completarse. El emisor puede estar apagado o no ' +
    'ser alcanzable desde este puesto.',

  elEmisorRechazoElCanje: 'El emisor rechazo el canje',
  elCanjeVolvioCon: (estado) =>
    `La peticion del canje volvio con ${String(estado)}. Suele ser la URI de ` +
    'retorno o el cliente.',

  elEmisorNoDevolvioNingunToken: 'El emisor no devolvio ningun token',
  laRespuestaDelCanjeNoTraeElToken: 'La respuesta del canje no trae «access_token».',
};
