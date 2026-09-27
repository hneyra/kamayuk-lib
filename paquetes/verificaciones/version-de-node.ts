import { posix } from 'node:path';

import { esMapa, type Mapa, pasosDe, valorEn } from './workflow.ts';

/**
 * **La version de Node se declara en un sitio, y los demas lo leen** (#116).
 *
 * <h2>Lo medido</h2>
 *
 * Hasta #116 la version de Node de este repositorio se decia en seis sitios que no coincidian:
 * `engines: ">=24"` en `package.json`, `node-version: "24"` escrito a mano en los cuatro
 * `setup-node` de `paquetes.yml` y `registro.yml` —`check-latest` solo en uno (#105)—, ningun
 * `.nvmrc`, y **`@types/node: ^22.15.0`**: el comprobador de tipos miraba la API de Node 22 y el
 * codigo corria en 24. Ninguna guarda comparaba nada con nada.
 *
 * <h2>La regla</h2>
 *
 * `.nvmrc` es la fuente. `engines` y la mayor de `@types/node` dicen la misma mayor, y cada
 * `setup-node` de cada workflow la LEE con `node-version-file` —apuntando al `.nvmrc` de ESTE
 * repositorio, en el directorio donde su trabajo lo clono— en vez de escribirla. Un `node-version`
 * escrito a mano sale rojo aunque diga lo mismo: es el septimo sitio que se desincroniza.
 *
 * No hay accion compuesta que lo reparta: `las-acciones-corren-en-node-24` marca a proposito
 * `uses: ./…` como ilegible.
 */

/** Lo que este repositorio dice de su version de Node, leido tal cual del disco o de una muestra. */
export interface DeclaracionesDeNode {
  /** `engines.node` de `package.json`, sin interpretar. */
  readonly engines: unknown;
  /** El texto de `.nvmrc`, o `null` si el archivo no esta. */
  readonly nvmrc: string | null;
  /** `devDependencies['@types/node']` de `package.json`, sin interpretar. */
  readonly tiposDeNode: unknown;
  /** Cada workflow, ya analizado, con su ruta. */
  readonly workflows: readonly { readonly archivo: string; readonly workflow: Mapa }[];
}

/**
 * La mayor de un rango de version, o `null` si no es una de las formas que se saben leer: `24`,
 * `v24`, `24.21.0`, `^24.5.0`, `~24.1`, `>=24`, `>=24.0.0` o `24.x`. Un rango compuesto
 * (`>=22 <25`, `22 || 24`) no dice UNA mayor y vuelve `null`.
 */
export function mayorDe(rango: unknown): number | null {
  if (typeof rango !== 'string') return null;
  const casado = /^\s*(?:\^|~|>=)?\s*v?(\d+)(?:\.(?:\d+|x|\*)){0,2}\s*$/.exec(rango);
  return casado === null ? null : Number.parseInt(casado[1] ?? '', 10);
}

const esUnSetupNode = (paso: Mapa): boolean =>
  typeof paso['uses'] === 'string' && paso['uses'].startsWith('actions/setup-node@');

/** Un `actions/checkout` que clona ESTE repositorio: sin `repository`, o con el del propio evento. */
const clonaEsteRepositorio = (paso: Mapa): boolean => {
  if (typeof paso['uses'] !== 'string' || !paso['uses'].startsWith('actions/checkout@')) return false;
  const repositorio = valorEn(paso, 'with', 'repository');
  return repositorio === undefined || repositorio === '${{ github.repository }}';
};

/** Donde tiene que estar el `.nvmrc` de este repositorio para el paso `indice` de un trabajo. */
function nvmrcDelTrabajo(pasos: readonly Mapa[], indice: number): string | null {
  const clon = pasos.slice(0, indice).filter(clonaEsteRepositorio).at(-1);
  if (clon === undefined) return null;
  const directorio = valorEn(clon, 'with', 'path');
  return posix.join(typeof directorio === 'string' ? directorio : '.', '.nvmrc');
}

/**
 * **Lo que no cuadra**, como renglones que dicen el sitio. Vacio es verde.
 */
export function loQueNoCuadra(declaraciones: DeclaracionesDeNode): string[] {
  const renglones: string[] = [];

  const delNvmrc = declaraciones.nvmrc === null ? null : mayorDe(declaraciones.nvmrc.trim());
  if (declaraciones.nvmrc === null) {
    renglones.push('no hay `.nvmrc`: la version de Node no tiene un sitio del que leerse');
  } else if (delNvmrc === null) {
    renglones.push(`\`.nvmrc\` dice «${declaraciones.nvmrc.trim()}», que no es una mayor que se sepa leer`);
  }

  // Sin un `.nvmrc` que leer, lo demas se compara con `engines`: que falte la fuente no deja de
  // hacer visible que `@types/node` dice otra cosa.
  const ENGINES = '`engines.node` de `package.json`';
  const delEngines = mayorDe(declaraciones.engines);
  const [fuente, nombreDeLaFuente] = delNvmrc !== null ? [delNvmrc, '`.nvmrc`'] : [delEngines, ENGINES];

  const comparar = (sitio: string, escrito: unknown): void => {
    const mayor = mayorDe(escrito);
    if (mayor === null) {
      renglones.push(`${sitio} dice «${String(escrito)}», que no es una mayor que se sepa leer`);
    } else if (fuente !== null && mayor !== fuente) {
      renglones.push(`${sitio} dice ${mayor} y ${nombreDeLaFuente} dice ${fuente}`);
    }
  };
  comparar(ENGINES, declaraciones.engines);
  comparar("`devDependencies['@types/node']` de `package.json`", declaraciones.tiposDeNode);

  for (const { archivo, workflow } of declaraciones.workflows) {
    const trabajos = valorEn(workflow, 'jobs');
    if (!esMapa(trabajos)) continue;
    for (const [id, trabajo] of Object.entries(trabajos)) {
      const pasos = pasosDe(esMapa(trabajo) ? trabajo : null);
      pasos.forEach((paso, indice) => {
        if (!esUnSetupNode(paso)) return;
        const sitio = `${archivo}, trabajo «${id}», paso ${indice + 1} (\`setup-node\`)`;
        const aMano = valorEn(paso, 'with', 'node-version');
        if (aMano !== undefined) {
          const mayor = mayorDe(String(aMano));
          const ademas = mayor !== null && fuente !== null && mayor !== fuente ? `, y ${nombreDeLaFuente} dice ${fuente}` : '';
          renglones.push(
            `${sitio} escribe \`node-version: "${String(aMano)}"\` a mano${ademas}: tiene que leer \`.nvmrc\` con \`node-version-file\``,
          );
          return;
        }
        const leido = valorEn(paso, 'with', 'node-version-file');
        const esperado = nvmrcDelTrabajo(pasos, indice);
        if (esperado === null) {
          renglones.push(`${sitio}: ningun paso anterior del trabajo clona este repositorio, asi que no hay \`.nvmrc\` que leer`);
        } else if (leido === undefined) {
          renglones.push(`${sitio} no dice version: se queda con la que traiga el corredor. Tiene que leer «${esperado}»`);
        } else if (typeof leido !== 'string' || posix.normalize(leido) !== esperado) {
          renglones.push(`${sitio} lee «${String(leido)}», y el \`.nvmrc\` de este repositorio esta en «${esperado}»`);
        }
      });
    }
  }
  return renglones;
}
