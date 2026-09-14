// @vitest-environment node
//
// Lee y escribe archivos. No es un DOM lo que necesita.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  aLaVista,
  apilar,
  contraste,
  distanciaCromatica,
  ratio,
  ratioQueNoLlega,
} from '../color.ts';
import { leerLosOrigenes, RUTA_DE_LOS_TEMAS, RUTAS_DE_LOS_ORIGENES } from './base.ts';
import { COMBINACIONES, derivar, ORIGEN_DE, type IdentidadDeOrigen } from './derivar.ts';
import {
  capasDe,
  DISTANCIA_SEMANTICA_MINIMA,
  EXCEPCIONES,
  MINIMOS,
  nombreDelFondo,
  PAPELES,
  PAREJAS,
  SEMANTICOS,
  SIN_PAREJA,
} from './papeles.ts';
import { generar } from './generar.ts';

/**
 * **Las paletas: completas, reproducibles y legibles** (#8). Eran seis; desde #56 son ocho.
 *
 * Cuatro identidades por dos modos, de dos paletas de origen. Lo que esta guarda sostiene son tres cosas que, rotas, no hacen
 * ruido:
 *
 *   1. **Completas.** Un token que falte en un tema cae al de por omision y rompe **una sola** de
 *      las seis combinaciones — cinco de seis se ven bien, que es el defecto mas caro de ver.
 *   2. **Reproducibles.** El archivo generado tiene que salir de las reglas. Sin esto, «derivado»
 *      es una palabra: nadie sabria si los valores salen de `derivar.ts` o de que alguien los
 *      toco a mano una tarde.
 *   3. **Legibles.** Cada pareja que un componente pone junta, medida en las seis. Lo que no
 *      llega se enumera CON SU CIFRA, no como «esta exento»: una exencion sin numero es un
 *      permiso, y con numero es una medicion que se pone roja si empeora.
 */

const origenes = leerLosOrigenes();
/** La base del `@theme`: la que fija QUE tokens existen. Los demas origenes tienen que tener los mismos. */
const base = origenes.institucional.colores;
const REGENERAR = process.env['KAMAYUK_REGENERAR'] === '1';

describe('las ocho paletas estan completas', () => {
  it('EL CENTINELA: la base tiene tokens y hay ocho combinaciones', () => {
    // Sin esto, un cambio de formato en el `@theme` dejaria la base VACIA y todo lo de abajo
    // pasaria sobre el conjunto vacio — que es como una guarda se queda sin sujeto.
    expect(base.size, 'el @theme no declaro ni un color').toBe(38);
    expect(COMBINACIONES).toHaveLength(8);
  });

  it.each(Object.keys(RUTAS_DE_LOS_ORIGENES))(
    'el origen de «%s» declara los MISMOS 38 colores que el @theme, ni uno mas ni uno menos (#56)',
    (identidad) => {
      // Un token que falte en un origen revienta al derivar; uno que SOBRE no lo pinta nadie y
      // se queda en el archivo pareciendo parte de la paleta. Las dos direcciones, nombradas.
      const colores = origenes[identidad as IdentidadDeOrigen].colores;
      expect(
        [...base.keys()].filter((n) => !colores.has(n)),
        `el origen de «${identidad}» no declara estos colores del @theme`,
      ).toEqual([]);
      expect(
        [...colores.keys()].filter((n) => !base.has(n)),
        `el origen de «${identidad}» declara colores que el @theme no tiene`,
      ).toEqual([]);
    },
  );

  it('cada identidad sale de UN origen que existe, y cada origen es la identidad de si mismo (#56)', () => {
    // «Una fuente por identidad»: `ORIGEN_DE` da exactamente una, y tiene que ser un origen con
    // archivo. Y un origen que saliera de otro no seria origen: su claro pasaria por reglas.
    const rutas = RUTAS_DE_LOS_ORIGENES as Readonly<Record<string, string>>;
    for (const [identidad, origen] of Object.entries(ORIGEN_DE)) {
      expect(rutas[origen], `«${identidad}» sale de «${origen}», que no tiene archivo`).toBeDefined();
    }
    for (const origen of Object.keys(RUTAS_DE_LOS_ORIGENES)) {
      expect(ORIGEN_DE[origen as IdentidadDeOrigen], `«${origen}» tiene archivo y sale de otro`).toBe(origen);
    }
  });

  it('todo token de la base tiene papel declarado', () => {
    // Un token sin papel no se sabe derivar, y `derivar()` revienta. Esto lo dice antes y
    // nombrando cual, en vez de dejar el fallo dentro del bucle.
    const huerfanos = [...base.keys()].filter((n) => PAPELES[n] === undefined);
    expect(
      huerfanos,
      'Estos tokens no tienen papel en `papeles.ts`, asi que no se sabe como derivarlos a los ' +
        'otros cinco temas.',
    ).toEqual([]);
  });

  it('todo token o esta en una pareja, o dice por que no lo mide nadie (#38)', () => {
    // Un token con papel y cero parejas es un color que NADIE mide: se puede mover hasta
    // volverlo ilegible y ninguna guarda se entera. Asi estaba `--foco` —el anillo de foco— con
    // 1.13:1 en el tema por omision, y asi estaban otros catorce.
    const medidos = new Set(PAREJAS.flatMap((p) => [p.delante, ...capasDe(p.detras)]));
    const nadieLosMide = [...base.keys()].filter(
      (n) => !medidos.has(n) && SIN_PAREJA[n] === undefined,
    );
    expect(
      nadieLosMide,
      'Estos tokens tienen papel declarado y CERO parejas, asi que nadie mide si se leen:\n' +
        nadieLosMide.map((n) => `  ${n}`).join('\n') +
        '\n\n  O entran en `PAREJAS` con el papel sobre el que se ven de verdad, o entran en\n' +
        '  `SIN_PAREJA` diciendo por que no hay nada que medir. Callarse no es una tercera opcion.',
    ).toEqual([]);
  });

  it('y no hay exencion de medida que sobre', () => {
    // La direccion que nadie mira: un token declarado «no se mide» que SI se mide. La exencion
    // deja de describir la verdad, y la siguiente persona la lee y se la cree.
    const medidos = new Set(PAREJAS.flatMap((p) => [p.delante, ...capasDe(p.detras)]));
    const sobran = Object.keys(SIN_PAREJA).filter((n) => medidos.has(n) || !base.has(n));
    expect(
      sobran,
      'Estos estan en `SIN_PAREJA` y no deberian: o ya tienen pareja que los mide, o ya no ' +
        'existen en la base.',
    ).toEqual([]);
  });

  it.each(COMBINACIONES)('%s declara los 38 colores, ni uno menos', (clave) => {
    const paleta = derivar(origenes, clave);
    const faltan = [...base.keys()].filter((n) => !paleta.has(n));
    expect(
      faltan,
      `«${clave}» no declara estos tokens. Un token que falta cae al del tema por omision y se ve ` +
        'mal en UNA SOLA de las combinaciones, que es el defecto mas caro de ver.',
    ).toEqual([]);
  });
});

describe('las ocho son reproducibles', () => {
  it('volver a generar el archivo da exactamente lo que hay', () => {
    const generado = generar(origenes);
    if (REGENERAR) writeFileSync(RUTA_DE_LOS_TEMAS, generado, 'utf8');

    expect(existsSync(RUTA_DE_LOS_TEMAS), 'falta `estilos/temas.css`').toBe(true);
    expect(
      readFileSync(RUTA_DE_LOS_TEMAS, 'utf8'),
      'El archivo de temas dejo de salir de las reglas. Si el cambio es deliberado, cambia la ' +
        'REGLA en `derivar.ts` y vuelve a generarlo:\n\n' +
        '    KAMAYUK_REGENERAR=1 yarn vitest run paquetes/ui/temas\n\n' +
        'Tocar un valor a mano deja una paleta que nadie puede volver a producir.',
    ).toBe(generado);
  });
});

describe('las ocho se leen: contraste WCAG 2.1', () => {
  it.each(COMBINACIONES)('%s', (clave) => {
    const paleta = derivar(origenes, clave);
    const identidad = (clave.split('/')[0] ?? '') as keyof typeof MINIMOS;
    const minimos = MINIMOS[identidad];
    const exentas = EXCEPCIONES[clave] ?? [];

    const rotas: string[] = [];
    const exencionesVivas = new Set<string>();

    for (const par of PAREJAS) {
      const delante = paleta.get(par.delante);
      const capas = capasDe(par.detras).map((n) => paleta.get(n));
      if (delante === undefined || capas.some((v) => v === undefined)) continue;
      // El fondo de un estado compuesto es la PILA ya mezclada, no el token de reposo.
      const detras = apilar(capas as string[]);
      const fondo = nombreDelFondo(par.detras);

      // SE DECIDE CON EL CRUDO y se escribe con el redondeado (#48). Comparar la cifra del
      // mensaje contra el umbral dejaba pasar la franja [4.495, 4.5): 4.4973 se escribe «4.50» y
      // satisface el `>=`. Desde #48 `ratio()` devuelve texto, asi que confundirlas no compila.
      const medido = contraste(delante, detras);
      const escrito = ratio(delante, detras);
      const exigido = minimos[par.clase];
      if (medido >= exigido) continue;

      const exenta = exentas.find((e) => e.delante === par.delante && e.detras === fondo);
      if (exenta === undefined) {
        rotas.push(
          `  ${par.delante} sobre ${fondo}: ${ratioQueNoLlega(delante, detras, exigido)}:1, y ` +
            `${par.clase} pide ` +
            `${String(exigido)}:1 — ${par.donde}`,
        );
        continue;
      }
      exencionesVivas.add(`${par.delante}|${fondo}`);
      // La exencion lleva su cifra, y la cifra tiene que cuadrar. Si empeora, esto sale rojo
      // aunque la pareja siga exenta: una exencion sin numero es un permiso. Aqui el redondeo SI
      // es el sujeto —la lista declara dos decimales, no la cifra cruda—, asi que se comparan las
      // dos escritas.
      expect(
        escrito,
        `La exencion de «${par.delante} sobre ${fondo}» en «${clave}» decia ` +
          `${aLaVista(exenta.ratio, 2)}:1 y ahora mide ${escrito}:1.\n  ${exenta.porQue}`,
      ).toBe(aLaVista(exenta.ratio, 2));
    }

    expect(
      rotas,
      `«${clave}» tiene parejas que no se leen:\n${rotas.join('\n')}\n\n` +
        '  Se arregla moviendo la REGLA de su papel en `derivar.ts` —no el color— y volviendo a\n' +
        '  generar. Si de verdad no se puede, se declara en `EXCEPCIONES` con su cifra y su motivo.',
    ).toEqual([]);

    // Y la direccion que nadie mira: una exencion que ya no hace falta. Si se deja, el dia que la
    // pareja vuelva a romperse nadie se entera, porque ya estaba «permitida».
    const muertas = exentas
      .filter((e) => !exencionesVivas.has(`${e.delante}|${e.detras}`))
      .map((e) => `  ${e.delante} sobre ${e.detras}`);
    expect(
      muertas,
      `«${clave}» declara exenciones que ya no hacen falta:\n${muertas.join('\n')}\n\n` +
        '  Una exencion muerta no protege: permite. El dia que esa pareja vuelva a romperse,\n' +
        '  nadie se entera.',
    ).toEqual([]);
  });

  it('`alto-contraste` no tiene ni una exencion, que es su sentido', () => {
    // Si alguna vez hiciera falta una aqui, el tema habria dejado de cumplir lo que promete y lo
    // que hay que cambiar es el tema, no la lista.
    expect(EXCEPCIONES['alto-contraste/claro']).toEqual([]);
    expect(EXCEPCIONES['alto-contraste/oscuro']).toEqual([]);
  });
});

describe('las cuatro insignias SIGNIFICAN cosas distintas (#36)', () => {
  /**
   * <h2>Por que esto no lo caza la guarda de contraste, que ya estaba</h2>
   *
   * Porque aquella mide TEXTO CONTRA SU FONDO, y ahi cada tono seguia cumpliendo: la tinta del
   * sepia contrastaba igual sobre los cuatro rosas. Lo que no medía nadie es la distancia ENTRE
   * los cuatro fondos, que es lo que hace que se distingan. Un color puede pasar contraste y no
   * significar nada.
   *
   * En `sepia` los cuatro derivaban al mismo rosa —`ok` #fae1e0 y `mal` #fae0df, a distancia 1 en
   * un canal—, asi que una insignia «Conforme» y una «Vencida» se pintaban sobre el mismo fondo.
   * Es el mismo defecto que #8 corrigio para el azul: el sepia entibia el papel y la tinta, y la
   * semantica se queda quieta.
   */
  it.each(COMBINACIONES)('%s', (clave) => {
    const paleta = derivar(origenes, clave);

    const juntos: string[] = [];
    for (let i = 0; i < SEMANTICOS.length; i++) {
      for (let j = i + 1; j < SEMANTICOS.length; j++) {
        const uno = SEMANTICOS[i] ?? '';
        const otro = SEMANTICOS[j] ?? '';
        const a = paleta.get(uno);
        const b = paleta.get(otro);
        if (a === undefined || b === undefined) continue;
        // Con el crudo, por lo mismo que el contraste de arriba (#48).
        const distancia = distanciaCromatica(a, b);
        if (distancia >= DISTANCIA_SEMANTICA_MINIMA) continue;
        juntos.push(
          `  ${uno} (${a}) y ${otro} (${b}) estan a ${aLaVista(distancia, 4)}, ` +
            `y hacen falta ${String(DISTANCIA_SEMANTICA_MINIMA)}`,
        );
      }
    }

    expect(
      juntos,
      `En «${clave}» hay fondos semanticos que son el mismo color:\n${juntos.join('\n')}\n\n` +
        '  Se arregla en la regla de `insignia-fondo` de `derivar.ts`: lo que el sepia entibia es\n' +
        '  el PAPEL y la TINTA. Rotar los cuatro semanticos al mismo tono borra la diferencia\n' +
        '  entre un tramite al dia y una deuda en coactiva, que es lo que la insignia existe para\n' +
        '  decir.',
    ).toEqual([]);
  });

  it('EL CENTINELA: son cuatro, y el umbral no se ha ido a cero', () => {
    // Sin esto, dejar `SEMANTICOS` vacio o el umbral en 0 deja la guarda de arriba pasando sobre
    // el conjunto vacio, que es como se queda sin sujeto sin ponerse roja.
    expect(SEMANTICOS).toHaveLength(4);
    expect(DISTANCIA_SEMANTICA_MINIMA).toBeGreaterThan(0.005);
  });
});

describe('`clasico`: su claro es su origen y su oscuro sale de el (#56)', () => {
  it('`clasico/claro` es `estilos/clasico.css` TAL CUAL: los 38, en su orden y con su valor', () => {
    // Incluidos los cinco translucidos, que en `institucional/claro` NO son los del origen (#41):
    // aqui el origen se escribio ya medido contra su barra, y el issue lo pide tal cual.
    expect([...derivar(origenes, 'clasico/claro')]).toEqual([...origenes.clasico.colores]);
  });

  it('`clasico/oscuro` se deriva de SU origen, y el de las otras tres no se entera', () => {
    // «Derivado con reglas» dicho con una medida y no con un comentario: se mueve un color del
    // origen de `clasico` y tiene que moverse su oscuro —sale de ahi— y NO el de `institucional`,
    // que sale de otro. Si `derivar()` volviera a tomar una base unica, una de las dos mitades
    // saldria roja.
    const azulOtro = new Map(origenes.clasico.colores).set('--azul', '#7a1f5c');
    const tocados = { ...origenes, clasico: { ...origenes.clasico, colores: azulOtro } };

    expect(derivar(tocados, 'clasico/oscuro').get('--azul')).not.toBe(
      derivar(origenes, 'clasico/oscuro').get('--azul'),
    );
    expect([...derivar(tocados, 'institucional/oscuro')]).toEqual([
      ...derivar(origenes, 'institucional/oscuro'),
    ]);
  });
});

describe('`clasico` no mueve ni un byte de las otras tres identidades (#56)', () => {
  /**
   * **Los nueve bloques de `institucional`, `alto-contraste` y `sepia`, como estaban en `main`.**
   *
   * Es la huella SHA-256 de cada bloque de `estilos/temas.css` medida sobre `main` en `3e027f7`,
   * justo antes de #56: el texto desde su comentario de cabecera hasta su `}` final, sin la linea en
   * blanco que los separa. Se guarda la huella y no el texto porque lo que se pregunta es «¿es el
   * mismo byte a byte?», y para eso el texto no añade nada que la huella no diga.
   *
   * Por que hace falta, si ya esta la guarda de regeneracion: aquella dice que el archivo sale de
   * las reglas, y seguiria verde si #56 hubiera cambiado una regla compartida o la forma de
   * `generar()` y regenerado — o sea, justo si hubiera movido las otras tres. Esta dice que no.
   *
   * **Si un cambio FUTURO mueve una de las tres a proposito**, esta tabla se actualiza en ese PR,
   * con la huella nueva medida y el motivo en su fila del registro. Lo que no puede pasar es que
   * se muevan sin que el PR lo diga.
   */
  const COMO_ESTABAN_EN_MAIN: readonly (readonly [string, string])[] = [
    ['/* institucional/claro */', 'abbd0db7e5bd244a611a47e2aa0330a16b1178d09f94f886acd3a50788ea5471'],
    ['/* institucional/oscuro — para quien no ha elegido modo */', '3fa0291b73918712c0df6de5331c17ef8f57535172d1858777bb4ee462f0bd5b'],
    ['/* institucional/oscuro — para quien lo eligio */', '27a10ba3f6a7e205c0519b522005d7488e783217cb12f1175781d18524feb437'],
    ['/* alto-contraste/claro */', '66616ddce9f288910c7e4c18c93b923e198895d25443124a4024ccaf6aa0b572'],
    ['/* alto-contraste/oscuro — para quien no ha elegido modo */', '895563b921434f044e457c8918e60cd48bbd63660762e3937b705e024faeb18c'],
    ['/* alto-contraste/oscuro — para quien lo eligio */', 'be8f8586aef85a9ff2ff21ffaf23fc65a59484d92398cca7eb808926555750bc'],
    ['/* sepia/claro */', '4ead2faadd6433b49c056886bd533ca28907bb4e4f97c34ad7fadae5242abfc8'],
    ['/* sepia/oscuro — para quien no ha elegido modo */', '3fb62d261d1b6ecfc42d80f0dd794d61bc171bfda7c6e2a77e91fc646e9578b1'],
    ['/* sepia/oscuro — para quien lo eligio */', '9ab79b73edb294cafc57e8e6d34cc64288161b4a58464cc9777f98a474691257'],
  ];

  /** Los bloques de `temas.css` tras la cabecera, cada uno con la primera linea de su comentario. */
  function bloquesDelArchivo(): (readonly [string, string])[] {
    const texto = readFileSync(RUTA_DE_LOS_TEMAS, 'utf8');
    // La cabecera termina donde empieza el primer bloque, que es siempre `institucional/claro`.
    const inicio = texto.indexOf('\n/* institucional/claro */');
    if (inicio < 0) return [];
    return texto
      .slice(inicio + 1)
      .replace(/\n$/, '')
      .split(/\n\n(?=\/\* )/)
      .map((bloque) => [bloque.split('\n')[0] ?? '', bloque] as const);
  }

  it('EL CENTINELA: el archivo se trocea en los nueve de antes mas los tres de `clasico`', () => {
    // Sin esto, un cambio en la forma de trocear —o una cabecera que dejara de encontrarse— dejaria
    // la comparacion de abajo recorriendo una lista vacia, en verde.
    expect(bloquesDelArchivo().map(([cabecera]) => cabecera)).toEqual([
      ...COMO_ESTABAN_EN_MAIN.map(([cabecera]) => cabecera),
      '/* clasico/claro */',
      '/* clasico/oscuro — para quien no ha elegido modo */',
      '/* clasico/oscuro — para quien lo eligio */',
    ]);
  });

  it('los nueve bloques de antes son byte a byte los de `main`, y en el mismo orden', () => {
    const huella = (texto: string): string => createHash('sha256').update(texto, 'utf8').digest('hex');
    const ahora = bloquesDelArchivo()
      .filter(([cabecera]) => !cabecera.startsWith('/* clasico/'))
      .map(([cabecera, bloque]) => [cabecera, huella(bloque)] as const);
    const movidos = COMO_ESTABAN_EN_MAIN.filter(
      ([cabecera, antes], i) => ahora[i]?.[0] !== cabecera || ahora[i]?.[1] !== antes,
    ).map(([cabecera]) => `  ${cabecera}`);
    expect(
      movidos,
      'Estos bloques de `estilos/temas.css` ya no son los de `main` antes de #56:\n' +
        `${movidos.join('\n')}\n\n` +
        '  Una identidad nueva no mueve las otras. Si este cambio lo hace a proposito, dilo en el PR\n' +
        '  y actualiza la huella en `COMO_ESTABAN_EN_MAIN`; si no, lo que se movio es una regla\n' +
        '  compartida, el orden de `COMBINACIONES` o la forma de `generar()`.',
    ).toEqual([]);
    expect(ahora).toHaveLength(COMO_ESTABAN_EN_MAIN.length);
  });
});
