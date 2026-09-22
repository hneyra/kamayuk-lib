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

  'aviso-efimero-tras-un-acto': {
    deDonde: 'normativa, HUECOS.md H37: lo hecho se decia en la tarjeta y nada mas, y quien miraba la lista no se enteraba',
    definicion: {
      instruccion: 'Registre el grupo.',
      bloques: [
        {
          tipo: 'acto',
          clave: 'alta',
          titulo: 'Dar de alta',
          campos: [{ nombre: 'codigo', etiqueta: 'Codigo', tipo: '' }],
          observacion: OBSERVACION,
          alTerminar: { aviso: 'Grupo dado de alta.' },
          alFallar: { aviso: 'El alta no se completo: el motivo esta encima del formulario.' },
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'insignias-fijas-en-la-cabecera': {
    deDonde: 'normativa, HUECOS.md H42: el estado y el codigo de lo que se mira no tenian sitio en la cabecera',
    definicion: {
      instruccion: 'Consulte el registro.',
      bloques: [
        {
          titulo: 'Detalle del registro',
          nota: '',
          campos: [{ etiqueta: 'Codigo', tipo: 'r' }],
          insignias: [
            { tono: 'ok', texto: 'Vigente' },
            { tono: 'info', texto: 'Solo lectura' },
          ],
          aLaDerecha: { codigo: { desde: 'registroId' } },
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA, nombrados: new Map([['registroId', 'R-00042']]) },
  },

  'texto-con-marcas': {
    deDonde: 'normativa, HUECOS.md H43 (N6): `code` y `strong` dentro de la misma frase, con la nota como dato',
    definicion: {
      instruccion: 'Revise por que no se puede retirar el registro.',
      bloques: [
        {
          titulo: 'La retirada',
          // Sin marcas, la nota seria esta; con `notaConMarcas`, gana la de las marcas.
          nota: '',
          notaConMarcas: [
            { texto: 'Lo impide ' },
            { codigo: { desde: 'restriccion' } },
            { texto: ': ' },
            { fuerte: 'retirarlo no se deshace' },
            { texto: ', y el registro sigue citado.' },
          ],
          campos: [{ etiqueta: 'Registro', tipo: 'r' }],
          acciones: [{ rotulo: 'Retirar', abre: 'retirar' }],
        },
        {
          tipo: 'acto',
          clave: 'retirar',
          titulo: 'Retirar',
          // Y en un acto, igual: la frase con su codigo dentro.
          notaConMarcas: [{ texto: 'Se retira ' }, { codigo: { plantilla: 'R-{registroId}' } }, { texto: '.' }],
          campos: [],
          observacion: OBSERVACION,
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([
        ['restriccion', 'fk_cita_registro'],
        ['registroId', '00042'],
      ]),
    },
  },

  'filtro-en-el-cliente-con-conteo': {
    deDonde: 'normativa, HUECOS.md H02: filtrar la pagina que llego sin mandarlo al servidor, y decir cuantas deja',
    definicion: {
      instruccion: 'Busque en la pagina de registros que llego.',
      bloques: [
        {
          titulo: 'Registros',
          nota: '',
          campos: [],
          tablas: [
            {
              clave: 'registros',
              titulo: 'Registros de la pagina',
              columnas: [
                { rotulo: 'Codigo', alineadoDerecha: false },
                { rotulo: 'Descripcion', alineadoDerecha: false },
              ],
              vacio: 'El servidor no devolvio ningun registro.',
              paginacion: { en: 'servidor', enLaRuta: 'pagina', tamano: 4, hayMas: 'registros.hayMas' },
              // Nada de esto viaja: `?estado=` no esta en la lista blanca del backend, y seria un 422.
              filtroLocal: {
                buscador: { rotulo: 'Buscar en esta pagina', marcador: 'Codigo o descripcion', columnas: [0, 1] },
                chips: [
                  { rotulo: 'Vigentes', si: { dato: 'estado', vale: 'VIGENTE' } },
                  { rotulo: 'Anulados', si: { dato: 'estado', vale: 'ANULADO' } },
                ],
                total: 'registros.total',
                sinCoincidencias: 'Ningun registro de esta pagina pasa el filtro.',
              },
            },
          ],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map<string, string | boolean>([
        ['registros.hayMas', true],
        ['registros.total', '57'],
      ]),
      tablas: new Map([
        [
          'registros',
          {
            filas: [
              { celdas: ['R-001', 'Bodega del puerto'], datos: new Map([['estado', 'VIGENTE']]) },
              { celdas: ['R-002', 'Bódega vieja'], datos: new Map([['estado', 'ANULADO']]) },
              { celdas: ['R-003', 'Taller'], datos: new Map([['estado', 'VIGENTE']]) },
              { celdas: ['R-004', 'Almacen'], datos: new Map([['estado', 'VIGENTE']]) },
            ],
          },
        ],
      ]),
    },
  },

  'guardar-como-archivo': {
    deDonde: 'normativa, HUECOS.md H30a: guardar el texto que se verifico, y no el que el navegador volveria a pedir',
    definicion: {
      instruccion: 'Guarde la version verificada del registro.',
      bloques: [
        {
          titulo: 'Version verificada',
          nota: 'Su huella coincide con la que firmo el servidor.',
          campos: [],
          acciones: [
            {
              rotulo: 'Guardar como archivo',
              // `desde` y nada mas: el texto tal como se verifico, sin plantilla ni `traducir`.
              guarda: {
                texto: { desde: 'lectura.texto' },
                tipoDeMedio: 'application/json',
                nombre: { plantilla: 'registro-{registroId}.json' },
              },
              sinDescarga: 'Este navegador no guarda archivos: copie el texto desde la vista.',
            },
          ],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([
        // Tal como llego: `1.0` no es `1`, el escape no es la letra y el salto final es parte del texto.
        ['lectura.texto', '{"valor":1.0,"nombre":"Jos\\u00e9"}\n'],
        ['registroId', '00042'],
      ]),
    },
  },
} as const satisfies Record<string, Muestra>;
