// @vitest-environment node
//
// Lee y escribe archivos. No es un DOM lo que necesita.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { apilar, distanciaCromatica, ratio } from '../color.ts';
import { baseDelTema, RUTA_DE_LOS_TEMAS } from './base.ts';
import { COMBINACIONES, derivar } from './derivar.ts';
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
 * **Las seis paletas: completas, reproducibles y legibles** (#8).
 *
 * Tres identidades por dos modos. Lo que esta guarda sostiene son tres cosas que, rotas, no hacen
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

const base = baseDelTema();
const REGENERAR = process.env['KAMAYUK_REGENERAR'] === '1';

describe('las seis paletas estan completas', () => {
  it('EL CENTINELA: la base tiene tokens y hay seis combinaciones', () => {
    // Sin esto, un cambio de formato en el `@theme` dejaria la base VACIA y todo lo de abajo
    // pasaria sobre el conjunto vacio — que es como una guarda se queda sin sujeto.
    expect(base.size, 'el @theme no declaro ni un color').toBe(38);
    expect(COMBINACIONES).toHaveLength(6);
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
    const paleta = derivar(base, clave);
    const faltan = [...base.keys()].filter((n) => !paleta.has(n));
    expect(
      faltan,
      `«${clave}» no declara estos tokens. Un token que falta cae al del tema por omision y se ve ` +
        'mal en UNA SOLA de las seis combinaciones, que es el defecto mas caro de ver.',
    ).toEqual([]);
  });
});

describe('las seis son reproducibles', () => {
  it('volver a generar el archivo da exactamente lo que hay', () => {
    const generado = generar(base);
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

describe('las seis se leen: contraste WCAG 2.1', () => {
  it.each(COMBINACIONES)('%s', (clave) => {
    const paleta = derivar(base, clave);
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

      const medido = ratio(delante, detras);
      const exigido = minimos[par.clase];
      if (medido >= exigido) continue;

      const exenta = exentas.find((e) => e.delante === par.delante && e.detras === fondo);
      if (exenta === undefined) {
        rotas.push(
          `  ${par.delante} sobre ${fondo}: ${String(medido)}:1, y ${par.clase} pide ` +
            `${String(exigido)}:1 — ${par.donde}`,
        );
        continue;
      }
      exencionesVivas.add(`${par.delante}|${fondo}`);
      // La exencion lleva su cifra, y la cifra tiene que cuadrar. Si empeora, esto sale rojo
      // aunque la pareja siga exenta: una exencion sin numero es un permiso.
      expect(
        medido,
        `La exencion de «${par.delante} sobre ${fondo}» en «${clave}» decia ` +
          `${String(exenta.ratio)}:1 y ahora mide ${String(medido)}:1.\n  ${exenta.porQue}`,
      ).toBe(exenta.ratio);
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
    const paleta = derivar(base, clave);

    const juntos: string[] = [];
    for (let i = 0; i < SEMANTICOS.length; i++) {
      for (let j = i + 1; j < SEMANTICOS.length; j++) {
        const uno = SEMANTICOS[i] ?? '';
        const otro = SEMANTICOS[j] ?? '';
        const a = paleta.get(uno);
        const b = paleta.get(otro);
        if (a === undefined || b === undefined) continue;
        const distancia = distanciaCromatica(a, b);
        if (distancia >= DISTANCIA_SEMANTICA_MINIMA) continue;
        juntos.push(
          `  ${uno} (${a}) y ${otro} (${b}) estan a ${String(distancia)}, ` +
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
