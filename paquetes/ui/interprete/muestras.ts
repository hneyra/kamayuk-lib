import type { DatosDeLaPantalla, EstadoDeUnaLectura } from './datos.ts';
import type { DefinicionDePantalla, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Un ejemplo por cada hueco de #44**: la definicion y los datos con los que se dibuja.
 *
 * No son las `muestras/` de `@kamayuk/verificaciones`, que violan una regla a proposito: estas la
 * cumplen, y son **la forma de uso** que `catastro` (catastro#119, catastro#137), `identidad` (#55)
 * y `normativa` (#61) copian. Por eso estan escritas en vocabulario neutro —un registro, un
 * catalogo, una derivacion— y no con las pantallas de la V6 de las que salen, que se citan en cada
 * una.
 *
 * **Las monta `Pantalla.test.tsx`, una a una**: una muestra que dejara de dibujarse como dice
 * saldria roja ahi, asi que esto no puede quedarse viejo en verde. Y la guarda de la misma prueba
 * exige que esten las ocho claves de la tabla de #44, ni una menos.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

export interface Muestra {
  /** Donde la V6 de `catastro` lo hacia, en `22e6d2e`. */
  readonly deDonde: string;
  readonly definicion: DefinicionDePantalla<PiezaDeLaPantalla>;
  readonly datos: DatosDeLaPantalla;
}

/** Ninguna pantalla de muestra tiene una frase para la pantalla entera: sus estados van por lectura. */
const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

const FALLO_DE_PRUEBA: EstadoDeUnaLectura = {
  estado: 'fallo',
  peldano: {
    titulo: 'No tiene el permiso que esta parte necesita',
    detalle: 'Falta el permiso de lectura del catalogo.',
    remedio: 'Lo concede quien administra los permisos.',
    incidencia: null,
  },
};

/** Las ocho, por el nombre del hueco en `catastro/frontend/diseno/HUECOS.md`. */
export const MUESTRAS_DEL_INTERPRETE = {
  'estados-de-una-lectura': {
    deDonde: 'frontend/src/modulos/riesgo/Riesgo.tsx:40 (y las dieciseis hojas)',
    definicion: {
      instruccion: 'Escriba el identificador de un registro.',
      bloques: [
        {
          titulo: 'Detalle del registro',
          nota: '',
          campos: [{ etiqueta: 'Codigo', tipo: 'r' }],
          lectura: { clave: 'detalle', espera: 'Escriba el identificador y aqui saldra su detalle.' },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      lecturas: new Map([['detalle', { estado: 'en-espera' }]]),
    },
  },

  'fallo-fuera-de-su-lectura': {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:2613',
    definicion: {
      instruccion: 'Consulte la tabla del ejercicio.',
      bloques: [
        {
          titulo: 'Tabla del ejercicio',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Filas',
            columnas: [
              { rotulo: 'Grupo', alineadoDerecha: false },
              { rotulo: 'Valor', alineadoDerecha: true },
            ],
          },
          lectura: { clave: 'principal' },
          fallosDe: ['catalogo'],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      filas: new Map([[0, [['G-01', '12.50']]]]),
      lecturas: new Map<string, EstadoDeUnaLectura>([
        ['principal', { estado: 'con-datos' }],
        ['catalogo', FALLO_DE_PRUEBA],
      ]),
    },
  },

  'pieza-condicional': {
    deDonde: 'frontend/src/modulos/parametros/Parametros.tsx:26',
    definicion: {
      instruccion: 'Revise el estado del ejercicio.',
      bloques: [
        {
          tipo: 'aviso',
          tono: 'atencion',
          titulo: 'Este ejercicio no esta cerrado',
          texto: 'No es un fallo: es la respuesta.',
          cuando: { dato: 'cerrado', vale: false },
        },
        {
          tipo: 'aviso',
          tono: 'ok',
          titulo: 'El ejercicio esta cerrado',
          cuando: { dato: 'cerrado', vale: true },
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA, nombrados: new Map([['cerrado', false]]) },
  },

  'no-puede-con-motivo': {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:1423',
    definicion: {
      instruccion: 'Revise lo derivado.',
      bloques: [
        {
          tipo: 'aviso',
          tono: 'atencion',
          titulo: 'La derivacion no propuso nada',
          texto: { desde: 'motivo' },
          cuando: { dato: 'motivo', hay: true },
          lectura: { clave: 'derivacion' },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      lecturas: new Map([['derivacion', { estado: 'con-datos' }]]),
      nombrados: new Map([['motivo', 'No hay geometria que cruzar.']]),
    },
  },

  aviso: {
    deDonde: 'frontend/src/modulos/parametros/Parametros.tsx:38',
    definicion: {
      instruccion: 'Lea antes de seguir.',
      bloques: [
        {
          tipo: 'aviso',
          tono: 'info',
          titulo: 'Aqui no se cierra nada',
          texto: 'Lo que se lee es la copia local de un conjunto ya cerrado.',
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'texto-con-dato': {
    deDonde: 'frontend/src/modulos/parametros/Parametros.tsx:12',
    definicion: {
      instruccion: 'Consulte el registro.',
      bloques: [
        {
          titulo: { segun: 'vista', casos: { vigente: 'La version vigente', historial: 'El historial' } },
          nota: { plantilla: 'Registro {registroId} · Ejercicio {marco.ejercicio}' },
          campos: [],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([
        ['vista', 'historial'],
        ['registroId', '42'],
        ['marco.ejercicio', '2026'],
      ]),
    },
  },

  'nota-al-pie-del-bloque': {
    deDonde: 'frontend/src/modulos/fiscalizacion/Fiscalizacion.tsx:241',
    definicion: {
      instruccion: 'Lea las cifras.',
      bloques: [
        {
          titulo: 'El embudo',
          nota: '',
          campos: [{ etiqueta: 'Detectados', tipo: 'r' }],
          pie: 'Son cifras y no una proporcion, a proposito.',
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'pie-de-operaciones': {
    deDonde: 'frontend/src/modulos/riesgo/Riesgo.tsx:99 (y las dieciseis hojas)',
    definicion: {
      instruccion: 'Consulte.',
      bloques: [
        {
          tipo: 'pie',
          lee: ['GET /recursos/{id}'],
          escribe: ['POST /recursos', 'PUT /recursos/{id}'],
          falta: 'No hay ninguna lectura que liste todos los registros.',
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },
} as const satisfies Record<string, Muestra>;

/**
 * Y el punto de extension, que no es un hueco de la tabla sino el AC-2: una pieza registrada y otra
 * sin registrar, una al lado de la otra.
 */
export const MUESTRA_DEL_PUNTO_DE_EXTENSION = {
  deDonde: 'el AC-2 de #44: lo propio de cada sistema (catastro#137, #55, #61)',
  definicion: {
    instruccion: 'Consulte.',
    bloques: [
      { tipo: 'delConsumidor', clave: 'registrada' },
      { tipo: 'delConsumidor', clave: 'olvidada' },
    ],
  },
  datos: { ausencia: SIN_FRASE_DE_PANTALLA },
} as const satisfies Muestra;
