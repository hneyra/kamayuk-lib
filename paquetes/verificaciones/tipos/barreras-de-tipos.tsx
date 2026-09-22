/* eslint-disable no-restricted-syntax -- este archivo VIOLA las reglas a proposito; es lo que
   verifica. Un `<Importe>` sin su fecha aqui NO es un defecto: es el caso que tiene que dejar
   de compilar el dia que alguien afloje el tipo. Va en linea y no en el config porque la
   excepcion pertenece a ESTE archivo, y una excepcion en el config se ensancha sin que nadie
   la mire. Es el mismo patron que usa `rentas`. */
import { FechaDeCalculo, Icono, Importe, Insignia, Pantalla } from '../../ui/index.ts';
import type {
  DatosDeLaPantalla,
  DefinicionDeCampo,
  DefinicionDePantalla,
  DefinicionDeTabla,
  PeldanoDeUnFallo,
  PiezaDeLaPantalla,
} from '../../ui/index.ts';
import type { Cliente, RespuestaTalCual } from '../../api/index.ts';
import { formatearImporte } from '../../formato/index.ts';
import { peldanoDe } from '../../sesion/index.ts';
import type { Peldano } from '../../sesion/index.ts';
import type { NavegacionDelArmazon } from '../../shell/index.ts';
import type { DefinicionDeAccion, DefinicionDeActo, Impedimento, NavegacionDeLaPantalla } from '../../ui/index.ts';

/**
 * LAS BARRERAS DE TIPO. No es una prueba de vitest: es una prueba DEL COMPILADOR.
 *
 * <h2>Como funciona, y por que no hace falta ejecutarla</h2>
 *
 * Cada bloque de abajo lleva un `@ts-expect-error` sobre codigo que HOY no compila. Si manana
 * compilara —porque alguien puso un valor por omision, aflojo un tipo o amplio una union— el error
 * esperado no ocurriria, y TypeScript se pone rojo por la directiva no usada (TS2578). O sea que
 * la barrera falla cuando la propiedad se pierde, sin que nadie tenga que correr nada: la
 * comprueba `yarn typecheck`.
 *
 * Por eso este archivo tiene que estar dentro del `include` del `tsconfig.json`. Si se cayera de
 * ahi, `tsc` ni lo abriria y **las seis barreras dejarian de comprobarse en silencio**.
 *
 * <h2>Por que los imports son relativos</h2>
 *
 * Porque `sin-nombre-publico-entre-paquetes` lo exige, y por el motivo medido en #4: un import por
 * el nombre publico resuelve aqui —este repositorio es raiz de workspaces— y se rompe en el
 * consumidor, que resuelve el symlink a su ruta real.
 */

export function barreras() {
  return (
    <>
      {/* Un importe SIN su fecha de calculo. Regla 9 (RNF-075) llevada al tipo: no existe «la
          deuda», existe `deudaActualizadaA(fecha)`. */}
      {/* @ts-expect-error falta `fechaCalculo`, que es obligatoria y no tiene valor por omision */}
      <Importe valor="1842.60" />

      {/* Y no vale pasarla vacia: `undefined` no es una `Fecha`. */}
      {/* @ts-expect-error `fechaCalculo` no admite undefined */}
      <Importe valor="1842.60" fechaCalculo={undefined} />

      {/* Un importe como NUMERO. Regla 1 (RNF-055): en coma flotante el centimo se pierde antes de
          llegar a la pantalla. */}
      {/* @ts-expect-error un importe es texto decimal, jamas number */}
      <Importe valor={1842.6} fechaCalculo="2026-09-06" />

      {/* Una insignia SIN texto. Un estado que se comunica solo por color no se comunica a quien
          no distingue ese color. */}
      {/* @ts-expect-error `children` es obligatorio */}
      <Insignia tono="ok" />

      {/* Y un tono que no es de los cuatro del artboard. */}
      {/* @ts-expect-error «verde» no es un Tono */}
      <Insignia tono="verde">Vigente</Insignia>

      {/* La fecha de calculo de la pantalla, sin fecha. */}
      {/* @ts-expect-error `fecha` es obligatoria */}
      <FechaDeCalculo />

      {/* Un icono que no existe. La union se deriva de la tabla, asi que un nombre mal escrito
          no llega a produccion como un SVG vacio. */}
      {/* @ts-expect-error «triangulo» no es un NombreDeIcono */}
      <Icono nombre="triangulo" />
    </>
  );
}

/**
 * Las barreras del interprete de pantallas (#27), que suben con el desde `rentas`.
 *
 * El tipo de un campo es una union de catorce, y lo que acompana a cada uno depende de cual es.
 * Cada `@ts-expect-error` de abajo es una definicion que HOY no compila y que, si compilara, se
 * dibujaria mal sin que nada lo dijera.
 */
export const barrerasDelInterprete: readonly DefinicionDeCampo[] = [
  // @ts-expect-error «select» no es uno de los siete tipos: se dibujaria como texto
  { etiqueta: 'Turno', tipo: 'select', opciones: ['Manana'] },
  // @ts-expect-error la marca de ancho es `1`, no cualquier cifra
  { etiqueta: 'Nota', tipo: 'a2' },
  // @ts-expect-error un desplegable SIN opciones no tiene nada que ofrecer
  { etiqueta: 'Turno', tipo: 's' },
  // @ts-expect-error y un campo de texto no trae opciones: quien las escribio queria una lista
  { etiqueta: 'Nombre', tipo: '', opciones: ['Una'] },
  // @ts-expect-error un campo de solo lectura NO lleva su valor: una cifra de ejemplo viajaria servida
  { etiqueta: 'Cobrado', tipo: 'r', valor: 'S/ 1,842.60' },
];

/** Una tabla no lleva sus filas: entran por los datos, y sin ellas la tabla dice por que. */
export const barreraDeLaTabla: DefinicionDeTabla = {
  titulo: 'Puestos',
  columnas: [],
  // @ts-expect-error las filas no son parte de la definicion
  filas: [['Puesto 14']],
};

/** Y el interprete sin su reparto de tonos: pintaria cualquier situacion con el mismo color. */
export function interpreteSinTonos() {
  return (
    // @ts-expect-error `tonoDeLaInsignia` es obligatoria y no tiene valor por omision
    <Pantalla definicion={{ instruccion: '', bloques: [] }} datos={{ ausencia: { enElCampo: '', explicacion: '', tono: 'info' } }} />
  );
}

/** Y fuera de JSX: el formateador tampoco acepta un numero. */
export function formatoConNumero() {
  // @ts-expect-error un importe es texto decimal, jamas number
  return formatearImporte(1842.6);
}

/**
 * Las barreras de las piezas de #44.
 *
 * Tres son de forma —lo que cada pieza exige— y dos son de compatibilidad: que `rentas` siga
 * teniendo su definicion estrecha, y que el peldano de `@kamayuk/sesion` quepa donde el interprete
 * dibuja un fallo SIN que `@kamayuk/ui` lo importe.
 */
export const barrerasDeLasPiezas: readonly PiezaDeLaPantalla[] = [
  // @ts-expect-error el pie no depende de ninguna lectura: sigue ahi con el servidor caido
  { tipo: 'pie', lee: ['GET /recursos'], lectura: { clave: 'principal' } },
  // @ts-expect-error y tampoco de ningun dato: un pie que desaparece no dice lo que falta
  { tipo: 'pie', lee: ['GET /recursos'], cuando: { dato: 'x', hay: true } },
  // @ts-expect-error un aviso sin titulo es un parrafo de color sin sujeto
  { tipo: 'aviso', tono: 'info', texto: 'Algo' },
  // @ts-expect-error un tono que no es de los cuatro del artboard
  { tipo: 'aviso', tono: 'warn', titulo: 'Algo' },
  // @ts-expect-error una pieza del consumidor sin clave no se puede buscar en el registro
  { tipo: 'delConsumidor' },
];

/**
 * `DefinicionDePantalla` a secas sigue siendo la de #27, y un aviso no cabe: es lo que deja a
 * `rentas` leer `bloque.campos` sobre sus cuarenta definiciones. Si alguien ensanchara el valor por
 * omision, esta barrera saldria roja aqui antes de que `rentas` dejara de compilar alli.
 */
export const laDeHoySigueEstrecha: DefinicionDePantalla = {
  instruccion: '',
  // @ts-expect-error la definicion por omision solo lleva bloques; las piezas se piden con el parametro
  bloques: [{ tipo: 'aviso', tono: 'info', titulo: 'Algo' }],
};

/** Un dato con nombre no es un `number`: una cifra llega formateada (regla 1). */
export const datoConNumero: DatosDeLaPantalla = {
  ausencia: { enElCampo: '', explicacion: '', tono: 'info' },
  // @ts-expect-error un dato con nombre es texto, booleano o null, jamas number
  nombrados: new Map([['total', 1842.6]]),
};

/**
 * Y el peldano de `@kamayuk/sesion` se pasa TAL CUAL al estado de fallo (#44, AC-3). Sin
 * `@ts-expect-error`: esto TIENE que compilar. Si #52 renombra `titulo` o `detalle`, sale rojo aqui
 * y no en la pantalla del primer sistema que lo pinte.
 */
export const elPeldanoDeLaSesionCabe: PeldanoDeUnFallo = peldanoDe(new TypeError('sin red'));

/**
 * **Las claves de `Peldano` son EXACTAMENTE nueve** (#52).
 *
 * `ciudadano` traduce la escalera con un `Record` completo sobre las claves, y lo tiene a proposito:
 * «no compila si la libreria anade un decimo peldano y aqui no se decide que decir». Los dos que
 * trajo #52 —`conflicto` y `orden-no-admitido`— lo pusieron rojo en el trabajo `consumidores`
 * (`TS2739`, `RC=2`) hasta que `ciudadano` los decidio en su propio `main` (`fce3c64`, ciudadano#33).
 *
 * Esta barrera es **la misma forma que esa guarda**, puesta aqui: con una decima clave falta una
 * propiedad (`TS2741`), y con una de menos sobra una (`TS2353`). Sin `@ts-expect-error`: esto TIENE
 * que compilar, y el dia que la union cambie sale rojo en `yarn typecheck` de esta libreria —con el
 * nombre de la clave— antes de que el trabajo `consumidores` lo descubra en el arbol de otro.
 * Crecer sigue siendo posible; lo que deja de ser posible es crecer sin enterarse.
 */
export const LAS_NUEVE_CLAVES: Readonly<Record<Peldano['clave'], true>> = {
  'sin-identidad': true,
  'sin-municipalidad': true,
  'sin-privilegio': true,
  'no-encontrado': true,
  'no-permitido': true,
  conflicto: true,
  'orden-no-admitido': true,
  'no-valido': true,
  averia: true,
};

/**
 * Las barreras de #66: la regla 10 y el motivo de lo impedido, llevados al tipo.
 *
 * Un acto sin observacion, una observacion sin sus limites o un impedimento sin motivo **no
 * compilan**: son justo lo que `acto-con-observacion` e `impedido-con-motivo` existen para quitar, y
 * con un valor por omision volverian en silencio.
 */
export const barrerasDeLosActos: readonly DefinicionDeActo[] = [
  // @ts-expect-error un acto sin observacion: la regla 10 dice que sin ella no se guarda
  { tipo: 'acto', clave: 'a', titulo: 'A', campos: [] },
  // @ts-expect-error los limites de la observacion son dato de la definicion, sin valor por omision
  { tipo: 'acto', clave: 'a', titulo: 'A', campos: [], observacion: { etiqueta: 'O' } },
  // @ts-expect-error y los dos: un maximo sin minimo deja pasar una observacion vacia
  { tipo: 'acto', clave: 'a', titulo: 'A', campos: [], observacion: { etiqueta: 'O', largo: { maximo: 500 } } },
  // @ts-expect-error un campo de un acto sin `nombre` no tiene con que viajar
  { tipo: 'acto', clave: 'a', titulo: 'A', campos: [{ etiqueta: 'C', tipo: '' }], observacion: { etiqueta: 'O', largo: { minimo: 1, maximo: 9 } } },
];

// @ts-expect-error un impedimento sin motivo es el `disabled` mudo que #66 quita
export const impedimentoMudo: Impedimento = { si: { dato: 'x', hay: false } };

export const accionesImposibles: readonly DefinicionDeAccion[] = [
  // @ts-expect-error una accion que abre un acto Y va a otra hoja no significa nada
  { rotulo: 'Dos cosas', abre: 'a', va: { hoja: 'h' } },
  // @ts-expect-error y una que no hace ninguna, tampoco: seria un boton sin efecto
  { rotulo: 'Nada' },
];

/**
 * Lo que `useNavegacion()` de `@kamayuk/shell` devuelve cabe TAL CUAL en `<Pantalla navegacion>`, sin
 * que `@kamayuk/ui` importe el marco. Sin `@ts-expect-error`: esto TIENE que compilar.
 */
export const laNavegacionDelMarcoCabe = (delMarco: NavegacionDelArmazon): NavegacionDeLaPantalla => delMarco;

/**
 * Las barreras de #57: **`OpcionesDeSolicitud` no tiene ninguna cabecera libre**, y las cabeceras
 * que llegaron no se cambian.
 *
 * Es la regla 2 (ADR-0005) llevada al tipo. Un `cabeceras` —o un `headers`— en las opciones seria
 * el sitio por el que una pantalla mandaria el inquilino, o sobrescribiria el `Authorization` con
 * otro token, **sin que ninguna prohibicion de ESLint lo viera**: el identificador prohibido no
 * aparece, porque el valor lo pone una variable. Lo que haga falta mandar entra como opcion con
 * nombre, como `claveDeIdempotencia`, que se ve en el tipo.
 */
export function sinCabecerasLibres(cliente: Cliente) {
  return [
    // @ts-expect-error `OpcionesDeSolicitud` no tiene `cabeceras`: por ahi se sobrescribiria el token
    cliente.solicitar('/x', { cabeceras: { Authorization: 'Bearer el-de-otro' } }),
    // @ts-expect-error ni `headers`, que es lo mismo escrito en ingles
    cliente.solicitar('/x', { headers: { 'X-Municipalidad': '7' } }),
    // @ts-expect-error y tampoco en `solicitarRespuesta`, que comparte las opciones
    cliente.solicitarRespuesta('/x', { cabeceras: { 'X-Municipalidad': '7' } }),
  ];
}

/**
 * Y las cabeceras que llegaron son de SOLO LECTURA: `CabecerasDeLaRespuesta` es un `Headers` sin
 * sus tres mutadores. Escribirlas cambiaria lo que la respuesta dice haber traido, que es justo lo
 * que se estaba comprobando.
 */
export function lasCabecerasQueLlegaronNoSeCambian(respuesta: RespuestaTalCual) {
  // @ts-expect-error `set` no esta: lo que llego no se reescribe
  respuesta.cabeceras.set('ETag', '"otra-huella"');
  // @ts-expect-error ni `delete`
  respuesta.cabeceras.delete('Cache-Control');
}

/** Pero leerlas SI compila, que es para lo que estan. Sin `@ts-expect-error`. */
export const laHuellaQueAnuncio = (respuesta: RespuestaTalCual): string | null =>
  respuesta.cabeceras.get('ETag');
