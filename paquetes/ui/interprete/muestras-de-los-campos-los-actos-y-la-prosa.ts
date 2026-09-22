import type { Muestra } from './muestras.ts';

/**
 * **Un ejemplo por cada hueco de #86**: los campos, los actos y la prosa de una hoja.
 *
 * Las claves son **los nombres de hueco de `normativa/frontend/diseno/HUECOS.md`**, y no nombres
 * propios: la guarda `las-piezas-locales-son-las-de-huecos` de `catastro` lee las claves de todo
 * `MUESTRAS…` de este directorio y sale roja si alguna coincide con una pieza suya (`buscador`,
 * `chips-de-filtro`, `descarga-de-documento`…). Lo vigila tambien el centinela de su prueba.
 *
 * Cada una usa el dato OPCIONAL que su hueco anade; **una definicion que no lo lleva se dibuja y se
 * comporta como antes de #86**, y eso lo prueba `los-campos-los-actos-y-la-prosa.test.tsx` al lado
 * de cada una.
 *
 * La monta esa prueba, una a una, y su centinela exige las claves de esta tanda, ni una mas ni una
 * menos. Va en su archivo por lo mismo que las de #61, #65 y #94: dos issues escribiendo en el mismo
 * objeto se pisan.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

/** La observacion de todos los actos de estas muestras: la regla 10, con los limites como dato. */
const OBSERVACION = { etiqueta: 'Observacion', largo: { minimo: 5, maximo: 500 } } as const;

export const MUESTRAS_DE_LOS_CAMPOS_LOS_ACTOS_Y_LA_PROSA = {
  'la-hoja-se-marca-sucia-al-teclear': {
    deDonde: 'normativa, HUECOS.md H38: la hoja solo se ensuciaba con la primera tecla de su vida',
    definicion: {
      instruccion: 'Anote lo que haga falta y guardelo.',
      // Cada cambio ensucia, y guardar la deja limpia y vacia: puede volver a ensuciarse.
      hoja: { suciaAlTeclear: true },
      bloques: [
        {
          titulo: 'Apuntes',
          nota: '',
          campos: [{ etiqueta: 'Apunte', tipo: 't1' }],
          acciones: [{ rotulo: 'Registrar el apunte', principal: true, abre: 'registrar' }],
        },
        {
          tipo: 'acto',
          clave: 'registrar',
          titulo: 'Registrar el apunte',
          campos: [{ nombre: 'texto', etiqueta: 'Texto', tipo: '' }],
          observacion: OBSERVACION,
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'lo-tecleado-y-la-negativa-sobreviven': {
    deDonde: 'normativa, HUECOS.md H35b: la `key` por destino (normativa#58) contra conservar lo tecleado (V6)',
    definicion: {
      instruccion: 'Corrija el registro. Si sale a mirar otra hoja, lo escrito le espera mientras no lo guarde.',
      // La opcion C: lo tecleado vive en el marco y sobrevive a irse y volver SOLO si la hoja sigue sucia.
      hoja: { suciaAlTeclear: true, conservaLoTecleado: 'soloSiSucia' },
      bloques: [
        {
          titulo: 'Registro',
          nota: '',
          campos: [{ etiqueta: 'Apunte', tipo: 't1' }],
          acciones: [{ rotulo: 'Corregir el registro', principal: true, abre: 'corregir' }],
        },
        {
          tipo: 'acto',
          clave: 'corregir',
          titulo: 'Corregir el registro',
          campos: [{ nombre: 'codigo', etiqueta: 'Codigo', tipo: '' }],
          observacion: OBSERVACION,
          // La negativa del servidor NO se conserva aqui: es de `datos.lecturas`, del sistema.
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'descartar-lo-escrito': {
    deDonde: 'normativa, HUECOS.md H48: no habia forma de volver a empezar un formulario sin cerrarlo',
    definicion: {
      instruccion: 'Registre un grupo nuevo.',
      bloques: [
        {
          tipo: 'acto',
          clave: 'alta',
          titulo: 'Dar de alta',
          campos: [{ nombre: 'codigo', etiqueta: 'Codigo', tipo: '' }],
          observacion: OBSERVACION,
          descartar: { rotulo: 'Descartar lo escrito', dicho: 'Se descarto lo escrito en el alta.' },
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'obligatorio-u-opcional-por-campo': {
    deDonde: 'normativa, HUECOS.md H05b: «(opcional)» salia de la palabra en la ayuda, y no de un dato',
    definicion: {
      instruccion: 'Registre el grupo.',
      bloques: [
        {
          titulo: 'El grupo',
          nota: '',
          campos: [
            { etiqueta: 'Codigo', tipo: '' },
            // Opcional por el DATO: la ayuda dice lo que quiera, y no decide la marca.
            { etiqueta: 'Alias', tipo: '', opcional: true, ayuda: 'Como se le conoce fuera del registro.' },
            { etiqueta: 'Categoria', tipo: 's', opciones: ['Ninguna', 'Primera', 'Segunda'], opcional: true },
          ],
          acciones: [{ rotulo: 'Dar de alta', principal: true, abre: 'alta' }],
        },
        {
          tipo: 'acto',
          clave: 'alta',
          titulo: 'Dar de alta',
          // Y en un acto, el MISMO dato decide las dos cosas: la marca y si se puede enviar en blanco.
          campos: [
            { nombre: 'codigo', etiqueta: 'Codigo', tipo: '' },
            { nombre: 'alias', etiqueta: 'Alias', tipo: '', opcional: true },
          ],
          observacion: OBSERVACION,
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'errores-tras-el-primer-intento': {
    deDonde: 'normativa, HUECOS.md H07: lo que faltaba se decia una vez en el boton, y no bajo cada campo',
    definicion: {
      instruccion: 'Registre el grupo.',
      bloques: [
        {
          tipo: 'acto',
          clave: 'alta',
          titulo: 'Dar de alta',
          errores: 'trasElPrimerIntento',
          campos: [
            { nombre: 'codigo', etiqueta: 'Codigo', tipo: '', mensajes: { obligatorio: 'Falta el codigo del grupo.' } },
            // Sin mensaje propio: la frase del saco.
            { nombre: 'nombre', etiqueta: 'Nombre', tipo: '' },
            { nombre: 'alias', etiqueta: 'Alias', tipo: '', opcional: true },
          ],
          observacion: OBSERVACION,
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'ayuda-en-un-campo-de-solo-lectura': {
    deDonde: 'normativa, HUECOS.md H50: un campo de solo lectura callaba su ayuda aunque la definicion la trajera',
    definicion: {
      instruccion: 'Consulte la base del registro.',
      bloques: [
        {
          titulo: 'La base',
          nota: '',
          campos: [
            {
              etiqueta: 'Base',
              tipo: 'r',
              ayuda: 'La calcula el servidor con la tabla vigente: aqui no se corrige.',
            },
          ],
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA, valores: new Map([['0|0', '1200.00']]) },
  },
} as const satisfies Record<string, Muestra>;
