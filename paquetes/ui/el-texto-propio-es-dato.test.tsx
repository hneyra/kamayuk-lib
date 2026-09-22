import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { elRojo, loQueNoPasoPorElSaco, marca, marcarElSaco } from '../verificaciones/marcas.ts';

import { FechaDeCalculo } from './FechaDeCalculo.tsx';
import { Importe } from './Importe.tsx';
import { coordenada } from './interprete/datos.ts';
import { Pantalla } from './interprete/Pantalla.tsx';
import type { DefinicionDePantalla, PiezaDeLaPantalla } from './interprete/tipos.ts';
import { Campo } from './shadcn/campo.tsx';
import { Avisos } from './shadcn/avisos.tsx';
import { Etiqueta } from './shadcn/etiqueta.tsx';
import { Miga, PasoDeLaMiga } from './shadcn/miga.tsx';
import { TEXTOS_DE_LA_UI, TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from './textos.tsx';

/**
 * **Las palabras que `@kamayuk/ui` decía por su cuenta salen del saco** (#19, AC1).
 *
 * <h2>Por qué aquí el inventario es CORTO, y por qué eso es la respuesta y no una excusa</h2>
 *
 * `@kamayuk/ui` casi no tiene texto propio, **por construcción**: un `Boton` no sabe qué pone
 * dentro, una `Alerta` tampoco, una `Tabla` menos. El texto ya entraba como `children` desde #11.
 * Las seis excepciones son las que se escaparon, y casi todas son del tipo que no se ve mirando la
 * pantalla: tres nombres accesibles que no se dibujan en ninguna parte, una marca entre paréntesis y
 * dos palabras pegadas a un dato.
 *
 * <h2>Cómo se comprueba, y qué NO cubre</h2>
 *
 * Igual que el armazón: se monta cada pieza con el saco marcado y se exige que no llegue nada sin
 * marcar, ni por un nodo de texto **ni por un atributo anunciado** —que es donde estaban escondidos
 * tres de los seis—.
 *
 * Lo que esto **no** puede hacer, y hay que decirlo: aquí no hay un árbol único que montar, así que
 * una pieza NUEVA con una palabra escrita dentro no aparecería en esta lista sola. Esa mitad la
 * cierra `verificaciones/el-texto-visible-es-dato.test.ts`, que exige que **el único sitio de estos
 * dos paquetes donde puede haber texto literal sean los dos archivos de textos**. Las dos guardas
 * contestan preguntas distintas y hacen falta las dos.
 *
 * `ListaDeLaPaleta` —la que traía «Suggestions» en inglés— no se monta aquí porque su
 * `Command.List` necesita un `Command` por encima: la cubre el armazón, con la paleta abierta.
 */

beforeAll(() => {
  // jsdom NO trae `matchMedia`, y `sonner` la llama al resolver el modo `system`. Medido en #13:
  // `TypeError: window.matchMedia is not a function` en `sonner/dist/index.mjs:1072`.
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

/** El saco de la ui, marcado clave a clave. */
const MARCADOS = marcarElSaco(TEXTOS_DE_LA_UI);

/** El del interprete (#27), igual. */
const MARCADOS_DEL_INTERPRETE = marcarElSaco(TEXTOS_DEL_INTERPRETE);

/** Y el de sus piezas (#44). */
const MARCADAS_LAS_PIEZAS = marcarElSaco(TEXTOS_DE_LAS_PIEZAS);

/**
 * Una pantalla con TODAS las piezas de #44 y los tres estados que dibujan algo propio: una lectura
 * en espera sin frase —la del saco—, otra pidiendo, otra en fallo con reintento e incidencia, una
 * pieza del consumidor sin registrar, un aviso, un bloque con pie y texto con dato, y el pie de
 * operaciones.
 *
 * El peldano entra MARCADO por el propio sistema, porque no es del interprete: ya viene en el idioma
 * de la sesion, del saco de `@kamayuk/sesion`. Lo que aqui se mide es que el interprete no le anade
 * ninguna palabra suya sin sacarla de SU saco —«Reintentar», «Incidencia»—.
 */
const LAS_PIEZAS_DE_44: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    { titulo: 'en espera', nota: '', campos: [], lectura: { clave: 'espera' } },
    { titulo: 'pidiendo', nota: '', campos: [], lectura: { clave: 'pidiendo' } },
    { titulo: 'fallo', nota: '', campos: [], lectura: { clave: 'fallo' } },
    { titulo: 'sin estado', nota: '', campos: [], lectura: { clave: 'nadie' } },
    {
      titulo: { plantilla: 'registro {id}' },
      nota: { segun: 'vista', casos: { una: 'una vista' } },
      campos: [],
      pie: { plantilla: 'pie con {ausente}' },
      fallosDe: ['fallo'],
    },
    { tipo: 'aviso', tono: 'atencion', titulo: 'aviso', texto: { desde: 'motivo' } },
    { tipo: 'delConsumidor', clave: 'olvidada' },
    { tipo: 'pie', lee: ['GET /uno'], escribe: ['POST /uno', 'PUT /uno'], falta: 'lo que falta' },
  ],
};

/**
 * Y una con TODO lo de #65 que dice algo: una tabla vacia con su frase y otra sin ella —el aviso
 * del saco—, una columna de insignia con la frase de la regla, acciones por fila SIN quien las
 * atienda —su motivo, del saco— y con el nombre de grupo del saco, «sin acciones», un detalle de
 * fila, dos tablas en un bloque, la cabecera fija, un marcador, una lista con ayuda y opciones con
 * rotulo, y un dato con insignia. Las palabras de la definicion entran marcadas por `traducir`, las
 * celdas y los datos marcados como datos, y lo que el interprete dice por su cuenta, por el saco.
 */
const LOS_CAMPOS_Y_TABLAS_DE_65: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    {
      titulo: 'campos',
      nota: '',
      campos: [
        { etiqueta: 'con marcador', tipo: '', marcador: 'marcador' },
        { etiqueta: 'fecha con marcador', tipo: 'd', marcador: 'marcador de fecha' },
        { etiqueta: 'lista', tipo: 's', opciones: [{ valor: '', rotulo: 'todos' }, { valor: 'UNO', rotulo: 'uno' }], ayuda: 'ayuda de la lista' },
        { etiqueta: 'dato', tipo: 'r', insignia: { casos: { true: { tono: 'ok', texto: 'si' } }, otro: { tono: 'mal', texto: 'no' } } },
      ],
    },
    {
      titulo: 'tablas',
      nota: '',
      campos: [],
      tablas: [
        {
          clave: 'con-filas',
          titulo: 'con filas',
          cabeceraFija: true,
          columnas: [
            { rotulo: 'codigo', alineadoDerecha: false },
            { rotulo: 'estado', alineadoDerecha: false, insignia: { segun: 'activa', casos: { true: { tono: 'ok', texto: 'vigente' } }, otro: { tono: 'mal', texto: 'retirada' } } },
          ],
          vacio: 'vacio',
          detalleDeFila: { texto: { plantilla: 'detalle {motivo}' }, cuando: { dato: 'motivo', hay: true } },
          accionesPorFila: {
            columna: 'acciones',
            acciones: [{ clave: 'abrir', rotulo: 'abrir', abre: 'abrir', con: { fila: { desde: 'motivo' } } }],
            segun: { dato: 'estado', ofrece: { ABIERTO: ['abrir'] } },
            sinAcciones: 'sin acciones',
          },
        },
        { clave: 'vacia', titulo: 'vacia', columnas: [{ rotulo: 'columna', alineadoDerecha: false }], vacio: { plantilla: 'nada en {id}' } },
        { clave: 'muda', titulo: 'muda', columnas: [{ rotulo: 'columna', alineadoDerecha: false }] },
      ],
    },
  ],
};

/**
 * Y todo lo que dice algo de las tablas de #61: una tabla paginada por el servidor con su orden
 * —los dos mandos, uno de ellos impedido—, una columna con el campo del contrato y su dominio, una
 * celda que llego sin dato con la palabra de la tabla, otra con la del saco, un vacio con su salida
 * y una tabla cuyas filas viajan en la definicion.
 *
 * Lo que aqui NO se traduce, y por eso entra en `DATOS_QUE_NO_SE_TRADUCEN`: el nombre de un campo
 * del contrato, su dominio y los tamanos de pagina. Son codigo y cifras, como las operaciones del
 * pie de #44.
 */
const LAS_TABLAS_DE_61: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    {
      titulo: 'tablas de 61',
      nota: '',
      campos: [{ etiqueta: 'campo con contrato', campo: 'registroId', tipo: 'r' }],
      tablas: [
        {
          clave: 'paginada',
          titulo: 'paginada',
          columnas: [
            { rotulo: 'codigo', alineadoDerecha: false, campo: 'codigo', dominio: 'A · B' },
            { rotulo: 'valor', alineadoDerecha: true, campo: 'valor' },
          ],
          vacio: 'vacio',
          paginacion: {
            en: 'servidor',
            enLaRuta: 'pagina',
            tamano: 20,
            tamanos: [20, 50],
            tamanoEnLaRuta: 'tamano',
            hayMas: 'hayMas',
            paginas: 'paginas',
          },
          orden: {
            campos: [
              { valor: 'codigo', rotulo: 'por codigo' },
              { valor: 'valor', rotulo: 'por valor' },
            ],
            enLaRuta: 'ordenarPor',
            sentidoEnLaRuta: 'direccion',
            ascendente: 'ASC',
            descendente: 'DESC',
          },
          sinDato: { texto: 'sin tope', nota: 'por que no hay tope' },
        },
        {
          clave: 'del-saco',
          titulo: 'del saco',
          columnas: [{ rotulo: 'columna', alineadoDerecha: false }],
          vacio: 'vacio',
        },
        {
          clave: 'con-salida',
          titulo: 'con salida',
          columnas: [{ rotulo: 'columna', alineadoDerecha: false }],
          vacioConSalida: {
            titulo: 'ninguno todavia',
            texto: 'lo siguiente es crear el primero',
            acciones: [{ rotulo: 'crear el primero', hace: 'nadie-lo-atiende' }],
          },
        },
        {
          clave: 'de-contenido',
          titulo: 'de contenido',
          columnas: [{ rotulo: 'columna', alineadoDerecha: false }],
          filasDeContenido: [['fila que viaja']],
        },
      ],
    },
  ],
};

/**
 * Las dos piezas de #67 que componen la hoja, con TODAS sus ramas que dicen algo: un maestro con
 * filas —una elegida que no esta en la lista, con cabecera y subtitulo—, otro vacio, otro sin
 * eleccion, y unas pestanas con rotulo y la abierta con un bloque. Ninguna palabra es de la pieza:
 * todas son de la definicion (por `traducir`) o datos de la fila.
 */
const LAS_PIEZAS_DE_67: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    {
      tipo: 'maestroDetalle',
      enLaRuta: 'sujeto',
      maestro: { rotulo: 'lista', filas: 'filas', fila: { titulo: '{a}', linea: '{b} y {c}', insignia: '{d}' }, vacio: 'vacia' },
      detalle: {
        sinEleccion: 'sin eleccion',
        noEstaEnLaLista: 'no esta',
        cabecera: { titulo: 'cabecera', subtitulo: 'subtitulo' },
        bloques: [
          {
            tipo: 'pestanas',
            enLaRuta: 'ver',
            rotulo: 'tira',
            pestanas: [
              { clave: 'uno', rotulo: 'una', bloques: [{ titulo: 'dentro', nota: '', campos: [] }] },
              { clave: 'dos', rotulo: 'otra', bloques: [] },
            ],
          },
        ],
      },
    },
    {
      tipo: 'maestroDetalle',
      enLaRuta: 'otro',
      maestro: { rotulo: 'lista vacia', filas: 'ninguna', fila: { titulo: '{a}' }, vacio: 'vacia' },
      detalle: { sinEleccion: 'sin eleccion', noEstaEnLaLista: 'no esta', bloques: [] },
    },
  ],
};

/**
 * **Y la segunda mitad de #86**: la nota con marcas —el texto y el enfasis por `traducir`, el codigo
 * como dato—. Ninguna palabra es de la pieza: el elemento de cada tramo no dice nada por su cuenta.
 */
const LA_PROSA_DE_86: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    {
      titulo: 'con marcas',
      nota: '',
      notaConMarcas: [{ texto: 'lo impide ' }, { codigo: { desde: 'restriccion' } }, { fuerte: 'no se deshace' }],
      campos: [],
      tablas: [
        {
          clave: 'filtrable',
          titulo: 'filtrable',
          columnas: [{ rotulo: 'columna', alineadoDerecha: false }],
          vacio: 'vacio',
          filtroLocal: {
            buscador: { rotulo: 'buscar', marcador: 'marcador del buscador' },
            chips: [{ rotulo: 'chip', si: { dato: 'estado', vale: 'UNO' } }],
            total: 'total',
          },
        },
      ],
    },
  ],
};

/**
 * Una pantalla que usa los siete tipos, una tabla con filas y otra sin ellas, y una ausencia: todo
 * lo que el interprete sabe dibujar. Sus palabras son de quien la escribe y entran marcadas por
 * `traducir`; lo que el interprete dice por su cuenta, por el saco.
 */
const PANTALLA_ENTERA: DefinicionDePantalla = {
  instruccion: 'no la dibuja el interprete',
  bloques: [
    {
      titulo: 'bloque',
      nota: 'nota',
      campos: [
        // Opcional por el DATO (#86): la ayuda ya no decide la marca, y por eso no la nombra.
        { etiqueta: 'texto', tipo: '', ayuda: 'ayuda', opcional: true },
        { etiqueta: 'otro', tipo: 't' },
        { etiqueta: 'lista', tipo: 's', opciones: ['una', 'dos'] },
        { etiqueta: 'fecha', tipo: 'd' },
        { etiqueta: 'dato', tipo: 'r' },
        { etiqueta: 'casilla', tipo: 'c', casilla: 'marca' },
        { etiqueta: 'area', tipo: 'a1' },
      ],
      tabla: {
        titulo: 'tabla',
        columnas: [
          { rotulo: 'columna', alineadoDerecha: false },
          { rotulo: 'situacion', alineadoDerecha: false },
        ],
        columnaDeInsignia: 1,
        nota: 'nota de la tabla',
        accion: 'accion',
      },
    },
    {
      titulo: 'bloque sin filas',
      nota: '',
      campos: [],
      tabla: { titulo: 'tabla vacia', columnas: [{ rotulo: 'columna', alineadoDerecha: true }] },
    },
  ],
};

/**
 * Lo que llega a la persona sin ser una palabra. Un importe formateado y una fecha formateada son
 * **datos**: «S/ 1,842.60» no tiene traducción, y el formato lo decide `@kamayuk/formato`.
 */
const DATOS_QUE_NO_SE_TRADUCEN = new Set([
  'S/ 1,842.60',
  '06/09/2026',
  // La barra de la miga. Es adorno del artboard y lleva `aria-hidden`.
  '/',
  // Las operaciones del pie de #44: son CODIGO —un verbo y una ruta— y no tienen traduccion.
  'GET /uno',
  'POST /uno',
  'PUT /uno',
  // Y su separador, que no es una palabra.
  '·',
  // Las tablas de #61: el nombre de un campo del contrato y su dominio son CODIGO, como las
  // operaciones del pie; los tamanos de pagina son cifras. Ninguna de las tres tiene traduccion.
  'registroId',
  'codigo',
  'valor',
  'A · B',
  '20',
  '50',
]);

/** Cada pieza con texto propio, montada con el saco marcado. */
const PIEZAS: readonly (readonly [string, () => React.ReactElement])[] = [
  [
    'Miga',
    () => (
      <Miga rotulo={MARCADOS.ruta}>
        <PasoDeLaMiga>{marca('paso')}</PasoDeLaMiga>
        <PasoDeLaMiga actual conSeparador>
          {marca('paso.actual')}
        </PasoDeLaMiga>
      </Miga>
    ),
  ],
  [
    'Etiqueta',
    () => (
      <Etiqueta
        rotulo={marca('rotulo')}
        opcional
        marcaDeOpcional={MARCADOS.opcional}
        ayuda={marca('ayuda')}
        error={marca('error')}
      >
        <Campo />
      </Etiqueta>
    ),
  ],
  [
    'FechaDeCalculo',
    () => <FechaDeCalculo fecha="2026-09-06" rotulo={MARCADOS.cifrasActualizadas} />,
  ],
  [
    'Importe',
    () => <Importe valor="1842.6" fechaCalculo="2026-09-06" rotuloDeLaFecha={MARCADOS.aLaFecha} />,
  ],
  ['Avisos', () => <Avisos rotulo={MARCADOS.avisos} />],
  [
    'Pantalla',
    () => (
      <Pantalla
        definicion={PANTALLA_ENTERA}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: 'explicacion', tono: 'info' },
          // Las celdas son DATOS y no se traducen: entran marcadas para que el recorrido no las
          // confunda con una palabra que se escapo.
          filas: new Map([[0, [[marca('celda'), marca('Abierto')]]]]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={MARCADOS_DEL_INTERPRETE}
      />
    ),
  ],
  [
    'Pantalla con las piezas de #44',
    () => (
      <Pantalla
        definicion={LAS_PIEZAS_DE_44}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          lecturas: new Map([
            ['espera', { estado: 'en-espera' }],
            ['pidiendo', { estado: 'pidiendo' }],
            [
              'fallo',
              {
                estado: 'fallo',
                peldano: {
                  titulo: marca('peldano.titulo'),
                  detalle: marca('peldano.detalle'),
                  remedio: marca('peldano.remedio'),
                  incidencia: 'INC-1',
                },
                detalles: [marca('detalle.del.servidor')],
                loQueFalta: marca('lo.que.falta'),
                reintentar: () => {},
              },
            ],
          ]),
          // Los datos con nombre son DATOS: entran marcados, como las celdas.
          nombrados: new Map([
            ['id', marca('dato.id')],
            ['vista', 'una'],
            ['motivo', marca('dato.motivo')],
          ]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
      />
    ),
  ],
  [
    'Pantalla con los campos y tablas de #65',
    () => (
      <Pantalla
        definicion={LOS_CAMPOS_Y_TABLAS_DE_65}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          valores: new Map([[coordenada(0, 3), 'true']]),
          nombrados: new Map([['id', marca('dato.id')]]),
          tablas: new Map([
            [
              'con-filas',
              {
                filas: [
                  { celdas: [marca('celda.uno'), ''], datos: new Map<string, string | boolean>([['activa', true], ['estado', 'ABIERTO'], ['motivo', marca('dato.motivo')]]) },
                  { celdas: [marca('celda.dos'), ''], datos: new Map<string, string | boolean>([['activa', false], ['estado', 'CERRADO']]), realzada: true },
                ],
              },
            ],
            ['vacia', { filas: [] }],
            ['muda', { filas: [] }],
          ]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
      />
    ),
  ],
  [
    'Pantalla con las tablas de #61',
    () => (
      <Pantalla
        definicion={LAS_TABLAS_DE_61}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          nombrados: new Map<string, string | boolean>([
            ['hayMas', false],
            ['paginas', '3'],
          ]),
          tablas: new Map([
            [
              'paginada',
              {
                filas: [
                  // Una celda con dato, otra sin el con la palabra de la tabla, y otra sin el con
                  // su propia nota: los tres caminos de `SinDato`.
                  { celdas: [marca('celda.uno'), { texto: null }] },
                  { celdas: [marca('celda.dos'), { texto: null, nota: marca('nota.de.la.celda') }] },
                ],
              },
            ],
            ['del-saco', { filas: [{ celdas: [{ texto: null }] }] }],
            ['con-salida', { filas: [] }],
          ]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
      />
    ),
  ],
  [
    'Pantalla con las piezas de #67',
    () => (
      <Pantalla
        definicion={LAS_PIEZAS_DE_67}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          // Los campos de una fila son DATOS: entran marcados, como las celdas.
          listas: new Map([['filas', [{ clave: '1', campos: { a: marca('fila.a'), b: marca('fila.b'), c: marca('fila.c'), d: marca('fila.d') } }]]]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
        hoja={{ ruta: { sujeto: 'otro', parametros: {} }, moverLaRuta: () => {} }}
      />
    ),
  ],
  [
    'Pantalla con la prosa de #86',
    () => (
      <Pantalla
        definicion={LA_PROSA_DE_86}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          nombrados: new Map([
            ['restriccion', marca('dato.restriccion')],
            ['total', marca('dato.total')],
          ]),
          tablas: new Map([['filtrable', { filas: [{ celdas: [marca('celda')], datos: new Map([['estado', 'UNO']]) }] }]]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
      />
    ),
  ],
];

describe('EL CENTINELA: la lista tiene sujeto, y el arnes ve un literal cuando lo hay', () => {
  it('hay piezas que montar, y el saco tiene una clave por cada palabra', () => {
    expect(PIEZAS.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(TEXTOS_DE_LA_UI).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(TEXTOS_DEL_INTERPRETE).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(TEXTOS_DE_LAS_PIEZAS).length).toBeGreaterThanOrEqual(12);
  });

  it('una pieza que IGNORA el saco sale roja', () => {
    // Es la mitad que impide que esto pase por estar roto. Se dibuja lo mismo que `Etiqueta`
    // dibujaba antes de #19 —la marca escrita dentro— y el recorrido tiene que verla.
    const { container } = render(
      <p aria-label="Un nombre accesible sin marcar">
        {marca('rotulo')} <span>(opcional)</span>
      </p>,
    );
    const fuera = loQueNoPasoPorElSaco(container, DATOS_QUE_NO_SE_TRADUCEN).map((e) => e.texto);
    expect(fuera).toContain('(opcional)');
    expect(fuera, 'el recorrido no mira los atributos anunciados').toContain(
      'Un nombre accesible sin marcar',
    );
  });
});

describe('EL AC1: ninguna pieza escribe una palabra por su cuenta', () => {
  it.each(PIEZAS)('«%s» saca todas sus palabras del saco', (nombre, dibujar) => {
    render(dibujar());
    const fuera = loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
    expect(fuera, elRojo(fuera, `«${nombre}»`)).toEqual([]);
  });
});

describe('EL AC4: sin pasar nada, lo que se ve es lo de hoy', () => {
  it('las cinco siguen en castellano', () => {
    const { container } = render(
      <>
        <Miga>
          <PasoDeLaMiga>uno</PasoDeLaMiga>
        </Miga>
        <Etiqueta rotulo="Ejercicio" opcional>
          <Campo />
        </Etiqueta>
        <FechaDeCalculo fecha="2026-09-06" />
        <Importe valor="1842.6" fechaCalculo="2026-09-06" />
      </>,
    );
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Ruta');
    expect(container.textContent).toContain('(opcional)');
    expect(container.textContent).toContain('Cifras actualizadas al 06/09/2026');
    expect(container.textContent).toContain('al 06/09/2026');
  });

  it('y el interprete, sin `textos` ni `traducir`, dice lo que decia en `rentas` (#27)', () => {
    const { container } = render(
      <Pantalla
        definicion={PANTALLA_ENTERA}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: 'explicacion', tono: 'info' },
          filas: new Map([[0, [['celda', 'Abierto']]]]),
        }}
        tonoDeLaInsignia={() => 'ok'}
      />,
    );
    expect(container.textContent).toContain('dd/mm/aaaa');
    expect(container.textContent).toContain('(opcional)');
    expect(container.textContent).toContain('1 registro');
    expect(container.textContent).not.toContain('1 registros');
  });
});

/**
 * **Y las piezas de #66, que hablan en cada paso de una escritura**: el motivo de lo impedido, el
 * formulario del acto, la confirmacion y lo hecho.
 *
 * No caben en la lista de arriba porque la mitad de sus palabras solo sale **al hacer algo**: la
 * confirmacion al pulsar el primario, «Escribiendo…» mientras viaja, lo hecho al aceptarse. Asi que
 * se recorre la escritura entera con los sacos marcados y se mira despues de cada paso.
 */
describe('EL AC1 en las piezas de #66: cada paso de una escritura saca sus palabras del saco', () => {
  const HOJA: DefinicionDePantalla<PiezaDeLaPantalla> = {
    instruccion: 'no la dibuja el interprete',
    bloques: [
      {
        titulo: 'bloque',
        nota: '',
        campos: [],
        acciones: [
          { rotulo: 'abrir', principal: true, abre: 'escribir' },
          { rotulo: 'impedida', hace: 'hacer', impedida: [{ si: { dato: 'id', hay: true }, motivo: 'motivo declarado' }] },
          { rotulo: 'sin quien', hace: 'nadie' },
          { rotulo: 'no ofrecida', va: { hoja: 'otra' } },
          { rotulo: 'sin dato', va: { hoja: 'ofrecida', sujeto: { desde: 'ausente' } } },
        ],
      },
      {
        tipo: 'acto',
        clave: 'escribir',
        titulo: 'escribir',
        nota: 'nota del acto',
        campos: [{ nombre: 'uno', etiqueta: 'uno', tipo: '' }],
        observacion: { etiqueta: 'observacion', ayuda: 'ayuda', largo: { minimo: 3, maximo: 9 } },
        advertencia: 'advertencia',
      },
    ],
  };

  it('del motivo a lo hecho, sin una palabra que no pasara por el saco', async () => {
    let aceptar: () => void = () => {};
    const aceptada = new Promise<void>((si) => {
      aceptar = si;
    });
    const rojo = (paso: string) => {
      const fuera = loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
      expect(fuera, elRojo(fuera, `«Pantalla con los actos de #66», ${paso}`)).toEqual([]);
    };
    render(
      <Pantalla
        definicion={HOJA}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          nombrados: new Map([['id', marca('dato.id')]]),
          lecturas: new Map([
            ['escribir', { estado: 'fallo', peldano: { titulo: marca('peldano.titulo'), detalle: marca('peldano.detalle') } }],
          ]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
        actos={{ escribir: () => aceptada }}
        alHacer={{ hacer: () => {} }}
        navegacion={{ ofrece: (hoja) => hoja === 'ofrecida', ir: () => {} }}
      />,
    );
    rojo('con las acciones impedidas');

    fireEvent.click(screen.getByRole('button', { name: marca('abrir') }));
    const primario = () => within(document.querySelector('[data-acto]') as HTMLElement).getByRole('button', { name: marca('escribir') });
    fireEvent.click(primario());
    rojo('con el acto abierto, su fallo y lo que falta tras el primer intento');

    // Lo tecleado es DATO, y entra marcado como las celdas. `⟦ok⟧` tiene cuatro caracteres: cabe.
    fireEvent.change(screen.getByLabelText(marca('uno')), { target: { value: marca('tecleado') } });
    fireEvent.change(screen.getByLabelText(marca('observacion')), { target: { value: marca('observacion.larga') } });
    rojo('con la observacion fuera de su largo');

    fireEvent.change(screen.getByLabelText(marca('observacion')), { target: { value: marca('ok') } });
    fireEvent.click(primario());
    rojo('con la confirmacion abierta');

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: MARCADAS_LAS_PIEZAS.siConfirmar }));
    rojo('mientras la escritura viaja');

    await act(async () => {
      aceptar();
      await aceptada;
    });
    expect(document.querySelector('[data-fase-del-acto="hecho"]')).not.toBeNull();
    rojo('con el acto hecho');
  });

  it('#86: el error de un obligatorio y lo descartado tambien salen del saco', () => {
    const rojo = (paso: string) => {
      const fuera = loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
      expect(fuera, elRojo(fuera, `«Pantalla con los actos de #86», ${paso}`)).toEqual([]);
    };
    render(
      <Pantalla
        definicion={{
          instruccion: 'no la dibuja el interprete',
          bloques: [
            {
              tipo: 'acto',
              clave: 'escribir',
              titulo: 'escribir',
              campos: [
                { nombre: 'uno', etiqueta: 'uno', tipo: '' },
                { nombre: 'dos', etiqueta: 'dos', tipo: '', opcional: true },
              ],
              observacion: { etiqueta: 'observacion', largo: { minimo: 3, maximo: 9 } },
              errores: 'trasElPrimerIntento',
              // Sin `dicho`: lo que se anuncia es la frase del saco.
              descartar: { rotulo: 'descartar' },
            },
          ],
        }}
        datos={{ ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' } }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
        actos={{ escribir: () => {} }}
        actoAbierto={{ clave: 'escribir' }}
      />,
    );
    rojo('con el campo opcional marcado');
    fireEvent.click(screen.getByRole('button', { name: marca('escribir') }));
    expect(screen.getByText(MARCADAS_LAS_PIEZAS.campoObligatorio)).toBeTruthy();
    rojo('con el error de un obligatorio tras el primer intento');
    fireEvent.click(screen.getByRole('button', { name: marca('descartar') }));
    expect(screen.getByRole('status').textContent).toBe(MARCADAS_LAS_PIEZAS.loEscritoSeDescarto);
    rojo('con lo escrito descartado');
  });

  it('#86, segunda mitad: el conteo del filtro y lo que dice cuando no deja ninguna, del saco', () => {
    const rojo = (paso: string) => {
      const fuera = loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
      expect(fuera, elRojo(fuera, `«Pantalla con el filtro local de #86», ${paso}`)).toEqual([]);
    };
    render(
      <Pantalla
        definicion={LA_PROSA_DE_86}
        datos={{
          ausencia: { enElCampo: 'hueco', explicacion: '', tono: 'info' },
          nombrados: new Map([['total', marca('dato.total')]]),
          tablas: new Map([['filtrable', { filas: [{ celdas: [marca('celda')], datos: new Map([['estado', 'UNO']]) }] }]]),
        }}
        tonoDeLaInsignia={() => 'ok'}
        traducir={marca}
        textos={{ ...MARCADOS_DEL_INTERPRETE, ...MARCADAS_LAS_PIEZAS }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: marca('chip') }));
    expect(document.querySelector('[data-slot="conteo-del-filtro"]')?.textContent).not.toBe('');
    rojo('con un chip pulsado y su conteo');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: marca('no casa') } });
    expect(document.querySelector('[data-sin-coincidencias]')).not.toBeNull();
    rojo('con el filtro que no deja ninguna');
  });
});
