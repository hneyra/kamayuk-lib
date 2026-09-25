// @vitest-environment node
//
// Lee el arbol de archivos y los `package.json`. No es un DOM lo que necesita, y bajo jsdom el
// `fileURLToPath` de `texto.ts` revienta con «The URL must be of scheme file» (medido en #2).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { RAIZ, archivosDeProduccion, rutaDesde, type Hallazgo } from './texto.ts';

/**
 * **El texto visible entra como DATO, y no cuesta una dependencia** (#19, AC1 y AC3).
 *
 * <h2>Qué pregunta contesta esto, y cuál NO</h2>
 *
 * **No** contesta «¿se traduce lo que se ve?». Ésa se contesta montando, y la contestan
 * `shell/todo-el-texto-del-armazon-es-dato.test.tsx` y `ui/el-texto-propio-es-dato.test.tsx`: un
 * escáner de fuentes falla en las dos direcciones —da rojos sobre cadenas que nunca se dibujan y se
 * calla sobre las que sí—, y por eso el AC2 pide un árbol montado y no un barrido.
 *
 * Lo que esto contesta es la **otra** pregunta, la que el montaje no puede: «¿hay alguna palabra
 * escrita dentro de un componente que no esté en el saco?». El montaje caza al componente que se
 * dibuja; una pieza NUEVA de `@kamayuk/ui` no se dibuja en ningún árbol hasta que alguien la use, y
 * hasta entonces su literal no lo ve nadie. La regla es por eso de forma y no de contenido:
 *
 * > En el código de producción de `@kamayuk/shell` y `@kamayuk/ui`, **el único sitio donde puede
 * > haber texto literal visible son los dos archivos de textos**. En todos los demás, la palabra
 * > entra por parámetro.
 *
 * Quien escriba una cadena dentro de un componente nuevo sale rojo con el archivo, la línea y la
 * cadena, y con el sitio donde ponerla.
 *
 * <h2>Por qué con el compilador y no con expresiones regulares</h2>
 *
 * Se intentaron primero, y el resultado está medido: **249 aciertos sobre este mismo árbol, de los
 * cuales 2 eran de verdad** — listas de importación, destructuraciones, tipos `() => void` y
 * cualquier línea suelta con pinta de prosa. Con expresiones regulares la elección es entre ruido y
 * agujeros, y una guarda ruidosa se acaba apagando. El analizador de TypeScript ya sabe qué es un
 * `JsxText` y qué es un atributo: preguntándole a él, el barrido da **cero** falsos positivos sobre
 * el árbol de hoy, y sus dos únicos aciertos son las dos frases del saco de `@kamayuk/ui`.
 *
 * <h2>Los tres sitios por donde una palabra llega a una persona</h2>
 *
 * <table>
 *   <tr><td>`JsxText`</td><td>lo que se dibuja: `&lt;p&gt;Volver&lt;/p&gt;`</td></tr>
 *   <tr><td>un atributo anunciado</td><td>lo que NO se dibuja: `aria-label`, `placeholder`, `title`</td></tr>
 *   <tr><td>el valor por omisión de una `prop` de texto</td><td>`rotulo = 'Avisos'`</td></tr>
 * </table>
 *
 * El segundo es el que se pierde solo: ocho de las treinta y dos palabras del armazón no se dibujan
 * en ninguna parte, y mirar la pantalla no las enseña. El tercero es la puerta de atrás del primero
 * —la palabra deja de estar en el JSX y pasa a estar en la firma— y es exactamente por donde se
 * habría colado el arreglo perezoso de este issue.
 *
 * <h2>Y el CUARTO sitio, que no es ninguno de esos tres: una frase devuelta (#52)</h2>
 *
 * `@kamayuk/sesion` no dibuja nada —no tiene ni un JSX— y sin embargo escribe palabras que una
 * persona lee: `peldanoDe()` devuelve un título, una explicación y un remedio. **Medido**: el
 * detector de las tres formas de arriba, aplicado a `paquetes/sesion/escalera.ts` antes de #52,
 * daba **cero hallazgos** sobre veintiséis frases escritas dentro. Ninguna de las tres las ve,
 * porque ahí una palabra es el valor de una propiedad de objeto. `crearIdentidad()` escribe del
 * mismo modo el motivo y el detalle de cada `Vuelta` fallida, y desde #118 los saca de su saco.
 *
 * La cuarta forma es por eso **la frase**: un literal —o un trozo de plantilla— con dos rachas de
 * letras separadas por un espacio. Es de forma y no de contenido, como las otras tres.
 *
 * **Y no se puede aplicar a `shell` ni a `ui`, medido el 2026-09-20**: una lista de clases de
 * Tailwind son dos rachas de letras separadas por un espacio (`'inline-flex items-baseline'`), así
 * que la cuarta forma da **393 hallazgos en `ui` y 86 en `shell`**, casi todos clases. Una guarda
 * ruidosa se acaba apagando. En `api` (5) y en `formato` (14) los hallazgos son mensajes de
 * excepción para quien programa —lo mismo que el armazón deja fuera a propósito, «traducirlas
 * sería traducir un `stack trace`»—, así que tampoco entran hoy.
 */

/** Los dos paquetes que dibujan pantalla. Se les miran las tres primeras formas. */
const DIBUJAN = ['shell', 'ui'] as const;

/**
 * Los paquetes que **escriben palabras sin dibujar nada**: se les mira la cuarta forma (#52).
 *
 * Hoy es uno. Se escribe como lista y no como constante para que el día que otro paquete devuelva
 * frases entre por una línea, y para que el recorrido diga cuál mira.
 */
const HABLAN_SIN_DIBUJAR = ['sesion'] as const;

/**
 * Los únicos archivos donde el texto literal es legítimo: los sacos.
 *
 * Escritos a mano y no derivados del nombre: un `textos.ts` nuevo en cualquier directorio no puede
 * autoexceptuarse por llamarse así.
 */
const LOS_SACOS = new Set([
  'paquetes/shell/textos.ts',
  'paquetes/ui/textos.tsx',
  'paquetes/sesion/textos.ts',
]);

/**
 * **Los archivos de `sesion` que escriben lo que una persona lee, y que el barrido TIENE que ver.**
 *
 * La cuarta forma **no tiene excepciones desde #118**. Tuvo una: `paquetes/sesion/identidad.ts`,
 * declarada en #52 con el motivo de que «lo reescribe entero `kamayuk-lib`#42». #42 se mezcló y la
 * excepción siguió ahí, porque se comprobaba entera y sólo salía roja el día que el archivo ya no
 * tuviera frases —nada empujaba a quitarlas—. Sus dieciséis frases viven ahora en
 * `TEXTOS_DE_LA_PUERTA`, y la excepción se borró.
 *
 * Se nombran aquí para que **volver a eximir a uno** —un filtro, un `relativo !== …`— salga rojo en
 * el centinela en vez de pasar en verde: una excepción no se vuelve a declarar sin tocar esta lista,
 * que es donde se lee.
 */
const HABLAN_A_LA_PERSONA = [
  join('paquetes', 'sesion', 'escalera.ts'),
  join('paquetes', 'sesion', 'identidad.ts'),
] as const;

/** Hay letras dentro. Un `data-slot`, un separador o una clase de Tailwind no cuentan como palabra. */
const LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

/**
 * Los atributos por los que una palabra llega a una persona sin dibujarse.
 *
 * La misma lista que el arnés del DOM (`marcas.ts`), más `containerAriaLabel` —el de `sonner`— y
 * `label`, que es como `cmdk` nombra el suyo. Las dos librerías ponen ahí su propio texto EN INGLÉS
 * si no se les pasa nada: medido en #13 (`Notifications alt+T`) y en #19 (`Suggestions`).
 */
const ANUNCIADOS = new Set([
  'aria-label',
  'placeholder',
  'title',
  'alt',
  'aria-placeholder',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
  'label',
  'containerAriaLabel',
]);

/** Nombres de `prop` que llevan una palabra. Su valor por omisión es la puerta de atrás del JSX. */
const PROPS_DE_TEXTO =
  /^(rotulo|rotulos|marcador|titulo|nota|texto|textos|aviso|avisos|label|placeholder|mensaje|instruccion|leyenda|marcaDeOpcional|rotuloDeLaFecha)$/;

/** El `Hallazgo` comun (#126), mas **por que** se hallo: el analizador distingue la puerta. */
interface HallazgoDelAnalizador extends Hallazgo {
  readonly por: string;
}

/** El texto literal visible de un archivo, preguntándole al analizador de TypeScript. */
function textoLiteralVisible(archivo: string): readonly HallazgoDelAnalizador[] {
  const relativo = rutaDesde(RAIZ, archivo);
  const fuente = ts.createSourceFile(
    archivo,
    readFileSync(archivo, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    archivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hallazgos: HallazgoDelAnalizador[] = [];
  const enLaLinea = (nodo: ts.Node): number =>
    fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;

  const visitar = (nodo: ts.Node): void => {
    if (ts.isJsxText(nodo)) {
      const texto = nodo.text.trim();
      if (texto !== '' && LETRA.test(texto)) {
        hallazgos.push({ archivo: relativo, linea: enLaLinea(nodo), por: 'texto JSX', texto });
      }
    }
    if (ts.isJsxAttribute(nodo) && nodo.initializer !== undefined && ts.isStringLiteral(nodo.initializer)) {
      const nombre = nodo.name.getText(fuente);
      if (ANUNCIADOS.has(nombre) && LETRA.test(nodo.initializer.text)) {
        hallazgos.push({
          archivo: relativo,
          linea: enLaLinea(nodo),
          por: `atributo «${nombre}»`,
          texto: nodo.initializer.text,
        });
      }
    }
    if (
      (ts.isBindingElement(nodo) || ts.isParameter(nodo)) &&
      nodo.initializer !== undefined &&
      ts.isStringLiteral(nodo.initializer)
    ) {
      const nombre = ts.isIdentifier(nodo.name) ? nodo.name.text : '';
      if (PROPS_DE_TEXTO.test(nombre) && LETRA.test(nodo.initializer.text)) {
        hallazgos.push({
          archivo: relativo,
          linea: enLaLinea(nodo),
          por: `valor por omision de «${nombre}»`,
          texto: nodo.initializer.text,
        });
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return hallazgos;
}

/**
 * **Una frase**: dos rachas de letras separadas por espacio en blanco.
 *
 * Es lo que separa una palabra de una clave. `'sin-identidad'`, `'ORDEN_NO_ADMITIDO'`,
 * `'application/json'` y `'flex'` no casan; `'Hay que volver a identificarse'` sí. Lo que NO puede
 * distinguir es una frase de una lista de clases de Tailwind, y por eso esta forma no se aplica a
 * los paquetes que dibujan — ver la cabecera, con las cifras medidas.
 */
const FRASE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

/** Las frases literales de un archivo: cadenas y trozos de plantilla, preguntándole al analizador. */
function frasesLiterales(archivo: string): readonly HallazgoDelAnalizador[] {
  const relativo = rutaDesde(RAIZ, archivo);
  const fuente = ts.createSourceFile(
    archivo,
    readFileSync(archivo, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    archivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hallazgos: HallazgoDelAnalizador[] = [];

  const visitar = (nodo: ts.Node): void => {
    // Los cinco nodos por los que una frase puede estar escrita: una cadena, una plantilla sin
    // huecos, y los tres trozos de una plantilla que sí los tiene. Sin los tres últimos, partir la
    // frase con un `${}` la volvería invisible.
    if (
      (ts.isStringLiteral(nodo) ||
        ts.isNoSubstitutionTemplateLiteral(nodo) ||
        ts.isTemplateHead(nodo) ||
        ts.isTemplateMiddle(nodo) ||
        ts.isTemplateTail(nodo)) &&
      FRASE.test(nodo.text)
    ) {
      hallazgos.push({
        archivo: relativo,
        linea: fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1,
        por: 'frase literal',
        texto: nodo.text.trim(),
      });
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return hallazgos;
}

const ARCHIVOS = DIBUJAN.flatMap((paquete) => archivosDeProduccion(join(RAIZ, 'paquetes', paquete)));

const FUERA_DEL_SACO = ARCHIVOS.filter((a) => !LOS_SACOS.has(rutaDesde(RAIZ, a))).flatMap(
  textoLiteralVisible,
);

const LOS_QUE_HABLAN = HABLAN_SIN_DIBUJAR.flatMap((paquete) =>
  archivosDeProduccion(join(RAIZ, 'paquetes', paquete)),
);

/** Lo que la cuarta forma barre: todo `sesion` menos su saco. Sin excepciones desde #118. */
const BARRIDOS_POR_FRASE = LOS_QUE_HABLAN.filter((a) => !LOS_SACOS.has(rutaDesde(RAIZ, a)));

const FRASES_SUELTAS = BARRIDOS_POR_FRASE.flatMap(frasesLiterales);

describe('EL AC1: el texto literal visible vive SOLO en los dos sacos', () => {
  it('EL CENTINELA: hay archivos que barrer, y los sacos SI tienen texto', () => {
    // Sin esto, un barrido que no encontrara ningun archivo —una ruta mal escrita, un recorrido que
    // no baja de un nivel— pasaria en verde sin mirar nada, que es como una guarda se queda sin
    // sujeto sin que nadie la borre.
    expect(ARCHIVOS.length, 'el barrido no encontro ni un archivo').toBeGreaterThan(20);
    expect(
      ARCHIVOS.some((a) => rutaDesde(RAIZ, a).includes(join('ui', 'shadcn'))),
      'el recorrido no bajo de un nivel: esta listando, no recorriendo',
    ).toBe(true);
    // Y baja tambien al interprete (#27), que es la pieza con mas palabras de todo el paquete:
    // todas vienen de la definicion, y la unica forma de saber que ninguna se escribio dentro es
    // que el barrido lo mire.
    expect(
      ARCHIVOS.some((a) => rutaDesde(RAIZ, a).includes(join('ui', 'interprete'))),
      'el barrido no llego al interprete de pantallas',
    ).toBe(true);
    // Y que el analizador ve texto cuando lo hay: los sacos lo tienen, a proposito.
    expect(
      textoLiteralVisible(join(RAIZ, 'paquetes', 'ui', 'textos.tsx')).length,
      'el analizador no ve el texto NI DONDE LO HAY: no esta mirando',
    ).toBeGreaterThan(0);
  });

  it('y fuera de ellos no queda ni una palabra escrita dentro de un componente', () => {
    expect(
      FUERA_DEL_SACO,
      'Hay texto visible escrito DENTRO de un componente, fuera de los dos sacos:\n' +
        FUERA_DEL_SACO.map(
          (h) => `  ${h.archivo}:${String(h.linea)}  «${h.texto}»  (por ${h.por})`,
        ).join('\n') +
        '\n\n  Un segundo idioma lo dejaria en castellano y la pantalla saldria a medias. Sacalo\n' +
        '  a «paquetes/shell/textos.ts» o a «paquetes/ui/textos.tsx» y pasalo por parametro.',
    ).toEqual([]);
  });
});

/**
 * **La cuarta forma: una frase escrita dentro de lo que no dibuja** (#52, AC5).
 *
 * El sujeto es `@kamayuk/sesion`, que no tiene un solo JSX y aun asi escribe lo que se lee cuando
 * algo falla. Ver la cabecera para por que esta forma no se aplica a `shell` ni a `ui`.
 */
describe('EL AC5 de #52: en «sesion» las frases viven SOLO en su saco', () => {
  it('EL CENTINELA: hay archivos que barrer, y el detector ve una frase donde la hay', () => {
    expect(LOS_QUE_HABLAN.length, 'el barrido de «sesion» no encontro ni un archivo').toBeGreaterThan(
      2,
    );
    // Y que el detector no esta mudo: el saco tiene frases a proposito.
    expect(
      frasesLiterales(join(RAIZ, 'paquetes', 'sesion', 'textos.ts')).length,
      'el detector no ve la frase NI DONDE LA HAY: no esta mirando',
    ).toBeGreaterThan(20);
  });

  it('y fuera del saco no queda ni una frase escrita dentro', () => {
    expect(
      FRASES_SUELTAS,
      'Hay frases escritas DENTRO del codigo de «sesion», fuera de su saco:\n' +
        FRASES_SUELTAS.map((h) => `  ${h.archivo}:${String(h.linea)}  «${h.texto}»`).join('\n') +
        '\n\n  Eso no se puede traducir nunca: «peldanoDe()» y «crearIdentidad()» devuelven lo\n' +
        '  que una persona lee. Sacalo a «paquetes/sesion/textos.ts» —TEXTOS_DE_LA_ESCALERA o\n' +
        '  TEXTOS_DE_LA_PUERTA— y pasalo por el segundo argumento.',
    ).toEqual([]);
  });

  it('SIN EXCEPCIONES (#118): la escalera y la puerta estan entre lo que se barre', () => {
    // La que hubo —`identidad.ts`, declarada en #52— sobrevivio a su motivo y se borro. Esto es
    // lo que impide que vuelva sin que se lea: un filtro que eximiera a cualquiera de los dos lo
    // saca de aqui, y sale rojo con su nombre.
    const barridos = BARRIDOS_POR_FRASE.map((a) => rutaDesde(RAIZ, a));
    for (const archivo of HABLAN_A_LA_PERSONA) {
      expect(
        barridos,
        `«${archivo}» escribe lo que una persona lee y la cuarta forma no lo barre: alguien lo ` +
          'eximio. Sus frases van a «paquetes/sesion/textos.ts», no a una excepcion.',
      ).toContain(archivo);
    }
  });

  it('LA MUESTRA: la forma muerde, y se demuestra con una que la viola y otra que la cumple', () => {
    // Una regla que no puede fallar no protege nada. Las dos muestras son el mismo peldano
    // escrito de las dos maneras.
    const viola = join(RAIZ, 'paquetes', 'verificaciones', 'muestras', 'frase-escrita-dentro.ts');
    const cumple = join(RAIZ, 'paquetes', 'verificaciones', 'muestras', 'frase-que-sale-del-saco.ts');

    const halladas = frasesLiterales(viola);
    expect(halladas.length, 'la muestra que VIOLA la forma no la dispara').toBeGreaterThan(0);
    expect(halladas.map((h) => h.texto)).toContain('Hay que volver a identificarse');

    expect(
      frasesLiterales(cumple),
      'la muestra que CUMPLE la forma sale roja: la guarda tiene falsos positivos',
    ).toEqual([]);
  });

  it('y la forma no confunde una clave, un codigo ni un tipo de medio con una frase', () => {
    // Lo que separa esta forma de un `grep`: `escalera.ts` esta lleno de cadenas —las nueve
    // claves de peldano y los codigos del contrato— y ninguna es una palabra que nadie lea.
    const escalera = join(RAIZ, 'paquetes', 'sesion', 'escalera.ts');
    const fuente = readFileSync(escalera, 'utf8');
    expect(frasesLiterales(escalera)).toEqual([]);
    expect(fuente).toContain("'ORDEN_NO_ADMITIDO'");
    expect(fuente).toContain("'sin-municipalidad'");
  });
});

/**
 * **El AC3: nada de esto costó una dependencia.**
 *
 * La lista se comprueba **entera**, no se cuenta: una `peerDependency` nueva tiene que pasar por
 * escribirla aquí, que es donde se lee lo que la librería le exige a los cuatro sistemas. Es la
 * misma forma que la lista de excepciones de `fetch` (#4).
 */
const PEER_DECLARADAS: Readonly<Record<string, readonly string[]>> = {
  api: [],
  formato: [],
  sesion: [],
  verificaciones: [],
  shell: ['@kamayuk/ui', 'react', 'react-dom', 'react-router-dom'],
  ui: [
    'class-variance-authority',
    'clsx',
    'react',
    'react-dom',
    'tailwind-merge',
    'tailwindcss',
    'radix-ui',
    'react-day-picker',
    'react-hook-form',
    'cmdk',
    'sonner',
  ],
};

/** Lo que un motor de traducción arrastraría. Ninguno de los dos puede entrar aquí. */
const MOTORES_DE_TRADUCCION = ['i18next', 'react-i18next'];

function manifiesto(paquete: string): { peerDependencies?: Record<string, string>; dependencies?: Record<string, string> } {
  return JSON.parse(
    readFileSync(join(RAIZ, 'paquetes', paquete, 'package.json'), 'utf8'),
  ) as ReturnType<typeof manifiesto>;
}

describe('EL AC3: los textos como dato NO trajeron ninguna dependencia nueva', () => {
  it.each(Object.keys(PEER_DECLARADAS))(
    '«%s» exige exactamente lo que estaba declarado, ni una mas',
    (paquete) => {
      const declaradas = PEER_DECLARADAS[paquete] ?? [];
      expect(
        Object.keys(manifiesto(paquete).peerDependencies ?? {}).sort((a, b) => a.localeCompare(b)),
        `Las «peerDependencies» de «${paquete}» cambiaron. Cada una de estas la tiene que montar ` +
          'CADA uno de los cuatro sistemas antes de dibujar un boton: si la nueva es correcta, ' +
          'escribela aqui y dilo en el PR.',
      ).toEqual([...declaradas].sort((a, b) => a.localeCompare(b)));
      expect(Object.keys(manifiesto(paquete).dependencies ?? {})).toEqual([]);
    },
  );

  it('y NINGUN paquete nombra un motor de traduccion, por ninguna de las tres puertas', () => {
    // Es el coste que el issue rechaza con todas las letras: `i18next` y `react-i18next` como
    // `peerDependencies` de la libreria obligarian a los cuatro sistemas a montar i18next antes de
    // dibujar un boton. Una libreria de componentes no puede exigir eso, asi que los textos entran
    // como dato. Aqui se comprueba que se quedo asi.
    const manifiestos = [
      JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as Record<string, unknown>,
      ...Object.keys(PEER_DECLARADAS).map((p) => manifiesto(p) as Record<string, unknown>),
    ];
    for (const m of manifiestos) {
      for (const bloque of ['dependencies', 'devDependencies', 'peerDependencies']) {
        const nombres = Object.keys((m[bloque] ?? {}) as Record<string, string>);
        for (const motor of MOTORES_DE_TRADUCCION) {
          expect(nombres, `«${motor}» entro por «${bloque}»`).not.toContain(motor);
        }
      }
    }
    // Y tampoco importado a pelo, que es como una dependencia se cuela sin manifiesto.
    const importadores = archivosDeProduccion().filter((archivo) => {
      const codigo = readFileSync(archivo, 'utf8');
      return MOTORES_DE_TRADUCCION.some((motor) =>
        new RegExp(`from ['"]${motor}['"]`).test(codigo),
      );
    });
    expect(importadores.map((a) => rutaDesde(RAIZ, a))).toEqual([]);
  });
});
