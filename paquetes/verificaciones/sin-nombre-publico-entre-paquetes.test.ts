// @vitest-environment node
//
// Lee el DISCO, no un DOM: en `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath`
// revienta con «The URL must be of scheme file».

import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, archivosDeLosPaquetes, leer, sinComentarios } from './texto.ts';

/**
 * **Ningun paquete importa a otro por su nombre publico.**
 *
 * Los imports ENTRE paquetes son relativos. No es estilo: es la unica forma que resuelve igual
 * aqui y en un consumidor.
 *
 * <h2>De que defecto viene, medido (#4)</h2>
 *
 * `paquetes/sesion/escalera.ts` hacia `import { ErrorDeLaApi } from '@kamayuk/api'`. Aqui resolvia
 * —este repositorio es raiz de workspaces y yarn crea `node_modules/@kamayuk/api`, y ademas el
 * `tsconfig.json` tenia un `paths`—. En un consumidor no: Vite y `tsc` resuelven el symlink a su
 * RUTA REAL (`preserveSymlinks` apagado por omision en los dos) y buscan subiendo por
 * `kamayuk-lib/`, no por el arbol del consumidor. Sin `kamayuk-lib/node_modules`:
 *
 *     paquetes/sesion/index.ts(1,30): error TS2307: Cannot find module '@kamayuk/api'    RC=2
 *
 * Un rojo que SOLO sale en CI, dentro de un archivo de otro repositorio, y cuya primera lectura
 * —«esta roto `kamayuk-lib`»— manda a mirar donde no es.
 *
 * Y no hay ninguna senal en la que apoyarse: medido en banco, **yarn 1.22.22 no emite ni un aviso
 * de `peerDependency` para una dependencia `link:`**, ni `--check-files` lo caza. La comprobacion
 * habia que escribirla.
 */

const ALCANCE = /from\s+['"]@kamayuk\/[a-z-]+['"]|require\(\s*['"]@kamayuk\/[a-z-]+['"]\s*\)|import\(\s*['"]@kamayuk\/[a-z-]+['"]\s*\)/;

interface Hallazgo {
  readonly archivo: string;
  readonly linea: number;
  readonly texto: string;
}

function hallazgosDe(archivos: readonly string[]): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const archivo of archivos) {
    sinComentarios(leer(archivo))
      .split('\n')
      .forEach((linea, indice) => {
        if (ALCANCE.test(linea)) {
          salida.push({
            archivo: archivo.replace(PAQUETES, 'paquetes'),
            linea: indice + 1,
            texto: linea.trim(),
          });
        }
      });
  }
  return salida;
}

const TODOS = archivosDeLosPaquetes();

describe('ningun paquete importa a otro por su nombre publico', () => {
  it('EL CENTINELA: se leen archivos de los seis paquetes', () => {
    // Sin esto lo de abajo pasaria sobre la lista vacia, que es como una guarda se queda sin
    // sujeto y sigue en verde.
    expect(TODOS.length, 'no se leyo ni un archivo: la guarda no mide nada').toBeGreaterThan(12);
    for (const paquete of ['formato', 'api', 'sesion', 'verificaciones']) {
      expect(
        TODOS.some((a) => a.startsWith(join(PAQUETES, paquete))),
        `no se leyo ni un archivo de «${paquete}»`,
      ).toBe(true);
    }
  });

  it('ni en codigo de produccion ni en pruebas', () => {
    const hallazgos = hallazgosDe(TODOS);
    const detalle = hallazgos.map((h) => `  ${h.archivo}:${String(h.linea)}  ${h.texto}`).join('\n');
    expect(
      hallazgos,
      'Un import por el nombre publico resuelve AQUI —este repositorio es raiz de workspaces— y ' +
        'se rompe en el consumidor, que resuelve el symlink a su ruta real. Usa una ruta ' +
        `relativa: "../api/index.ts".\n\nDonde aparece:\n${detalle}`,
    ).toEqual([]);
  });

  it('LA MUESTRA: la guarda muerde, y se demuestra', () => {
    const muestra = [join(PAQUETES, 'verificaciones/muestras/nombre-publico-entre-paquetes.ts')];
    expect(leer(muestra[0] ?? '').length).toBeGreaterThan(0);
    // Y no la recoge el recorrido de verdad: si `muestras/` entrara, la guarda saldria roja
    // siempre y se acabaria desactivando.
    // El SEGMENTO de directorio, no la subcadena: `otras-muestras.ts` lleva la palabra en el
    // nombre y no es una muestra. Medido — con `includes('muestras')` esta linea salio roja
    // nombrando ese archivo.
    expect(TODOS.filter((a) => a.includes(`${sep}muestras${sep}`))).toEqual([]);
    expect(hallazgosDe(muestra).length).toBeGreaterThan(0);
  });

  it('y no confunde el nombre publico con una mencion en prosa', () => {
    // `@kamayuk/api` aparece en docblocks por todas partes explicando de donde viene cada pieza.
    // Eso no es un import y no puede ponerse rojo.
    expect(hallazgosDe([join(PAQUETES, 'sesion/index.ts')])).toEqual([]);
  });
});
