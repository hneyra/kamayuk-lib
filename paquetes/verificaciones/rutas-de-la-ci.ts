import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './texto.ts';
import { analizarWorkflow, esMapa, valorEn } from './workflow.ts';

const WORKFLOW = '.github/workflows/paquetes.yml';
const DIRECTORIO_DE_WORKFLOWS = '.github/workflows';

/**
 * **Qué archivos disparan la CI de los paquetes** (#128).
 *
 * Hasta #116 `paquetes.yml` sólo corría cuando el cambio tocaba una de sus `paths`, y eso tenía
 * una consecuencia que no se veía: una guarda que lee un archivo de fuera de esa lista **no corre**
 * en el PR que sólo toca ese archivo, que es justo el PR que tendría que pararla. Pasó dos veces en
 * #128 —las cifras viven en `CLAUDE.md` y en `README.md`, y el atributo de la mezcla en
 * `.gitattributes`— y otra vez en #116, con `registro.yml`, `yarn.lock` y `docs/agent/HISTORY.md`.
 * Desde #116 el workflow no filtra, y `loQueNoDisparaLaCi` sale rojo si vuelve a filtrar algo que
 * una guarda lee. El lector vive aquí y no copiado en cada prueba que lo necesita.
 */

export function leerElWorkflow(): string {
  return readFileSync(join(RAIZ, WORKFLOW), 'utf8');
}

/**
 * Cada lista `paths:` de los eventos del workflow (`on.<evento>.paths`), en el orden en que estan
 * escritas.
 *
 * Del YAML analizado desde #114, y no linea a linea: la lectura por lineas cortaba la lista en el
 * primer comentario que se metiera entre dos rutas, y no veia una lista escrita en una sola linea
 * (`paths: ["a", "b"]`), que para GitHub es la misma.
 */
export function listasDeRutas(workflow: string): string[][] {
  const eventos = valorEn(analizarWorkflow(workflow, WORKFLOW), 'on');
  if (!esMapa(eventos)) return [];
  return Object.values(eventos)
    .map((evento) => valorEn(evento, 'paths'))
    .filter((rutas): rutas is unknown[] => Array.isArray(rutas))
    .map((rutas) => rutas.map(String));
}

/**
 * **Lo que las guardas de `yarn verificar` leen fuera de `paquetes/`, y por tanto lo que tiene que
 * disparar la CI** (#116).
 *
 * Hasta #116 `paquetes.yml` filtraba `push` y `pull_request` con una lista `paths:` escrita dos
 * veces, y las guardas leian archivos que la lista no traia: **todos** los workflows —tambien
 * `registro.yml`, que barre `las-acciones-corren-en-node-24`—, `yarn.lock` —que alimenta
 * `--frozen-lockfile`—, `docs/agent/HISTORY.md` —que monta `el-registro-se-mezcla-solo`— y cada
 * `.md` del arbol —que barre `las-cifras-las-escribe-un-guion`—. Un PR que solo bajara `registro.yml`
 * a `setup-node@v4` no corria ni lint ni pruebas, `main` se ponia rojo y lo pagaba el PR siguiente.
 *
 * Es una lista de MUESTRAS, no un censo: basta con que el filtro deje pasar a cada una, y con eso
 * ninguna lista `paths:` razonable queda en pie. Los workflows no van aqui porque se leen del
 * directorio (`lasRutasQueLeenLasGuardas`), que es como los lee la guarda que los barre: uno nuevo
 * entra solo.
 */
export const LO_QUE_LAS_GUARDAS_LEEN: readonly string[] = [
  'package.json',
  'yarn.lock',
  '.nvmrc',
  'consumidores.json',
  'tsconfig.json',
  'vitest.setup.ts',
  'eslint.config.js',
  'CLAUDE.md',
  'README.md',
  'paquetes/verificaciones/README.md',
  'docs/agent/HISTORY.md',
  '.gitattributes',
  // Uno anidado anula el de la raiz sin tocarlo (medido en la segunda revision de #128).
  'docs/agent/.gitattributes',
];

/** `LO_QUE_LAS_GUARDAS_LEEN` y cada workflow del directorio, como ruta desde la raiz. */
export function lasRutasQueLeenLasGuardas(): string[] {
  const workflows = readdirSync(join(RAIZ, DIRECTORIO_DE_WORKFLOWS))
    .filter((nombre) => nombre.endsWith('.yml') || nombre.endsWith('.yaml'))
    .sort()
    .map((nombre) => `${DIRECTORIO_DE_WORKFLOWS}/${nombre}`);
  return [...LO_QUE_LAS_GUARDAS_LEEN, ...workflows];
}

/** Los dos eventos con los que `verificar` tiene que correr: el PR y lo que llega a `main`. */
const EVENTOS_QUE_VERIFICAN = ['push', 'pull_request'] as const;

/**
 * Un patron de filtro de GitHub como expresion regular, o `null` si trae algo que esta lectura no
 * sabe traducir.
 *
 * Solo `*` (cualquier cosa menos `/`), `**` (cualquier cosa) y `**` seguido de `/` (cero o mas
 * directorios); el resto de la sintaxis de GitHub —`?` y `+` sobre el caracter anterior, `[...]`—
 * vuelve `null` y la guarda sale roja diciendolo: no saber leer un filtro no es saber que deja pasar
 * un archivo. El punto de un archivo oculto no es especial, como en GitHub.
 */
export function patronComoExpresion(patron: string): RegExp | null {
  if (/[?+[\]]/.test(patron)) return null;
  let fuente = '';
  for (let i = 0; i < patron.length; i += 1) {
    const caracter = patron[i] ?? '';
    if (patron.startsWith('**/', i)) {
      fuente += '(?:.*/)?';
      i += 2;
    } else if (patron.startsWith('**', i)) {
      fuente += '.*';
      i += 1;
    } else if (caracter === '*') {
      fuente += '[^/]*';
    } else {
      fuente += caracter.replace(/[.^$|(){}\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${fuente}$`);
}

/**
 * Si una lista de patrones casa con el archivo: gana el ULTIMO que casa, y uno con `!` delante lo
 * excluye. Con un patron que no sabe leer, lo devuelve en vez de decidir.
 */
function casa(patrones: readonly string[], archivo: string): boolean | { readonly ilegible: string } {
  let casado = false;
  for (const escrito of patrones) {
    const negado = escrito.startsWith('!');
    const expresion = patronComoExpresion(negado ? escrito.slice(1) : escrito);
    if (expresion === null) return { ilegible: escrito };
    if (expresion.test(archivo)) casado = !negado;
  }
  return casado;
}

/**
 * **Lo que un cambio podria tocar sin que `verificar` corra** (#116), como renglones que dicen el
 * evento y el archivo. Vacio es verde.
 *
 * Mira `on.push` y `on.pull_request` del workflow ANALIZADO: que esten —un `on` escrito como cadena
 * o como lista los declara sin filtro—, que su `paths:` deje pasar cada archivo y que su
 * `paths-ignore:` no ignore ninguno. Sin `paths:` ni `paths-ignore:` todo pasa, que es lo que hay
 * desde #116. Y el trabajo `verificar` no puede llevar un `if:`: una condicion de trabajo saltaria
 * lo mismo que un filtro de `paths:`.
 */
export function loQueNoDisparaLaCi(workflow: string, archivos: readonly string[]): string[] {
  const analizado = analizarWorkflow(workflow, WORKFLOW);
  const on = valorEn(analizado, 'on');
  const declarados: Readonly<Record<string, unknown>> = esMapa(on)
    ? on
    : Object.fromEntries((Array.isArray(on) ? on : [on]).map((evento) => [String(evento), null]));

  const renglones: string[] = [];
  for (const evento of EVENTOS_QUE_VERIFICAN) {
    if (!Object.hasOwn(declarados, evento)) {
      renglones.push(`«${evento}» no esta en \`on:\`: \`verificar\` no corre con ese evento`);
      continue;
    }
    for (const clave of ['paths', 'paths-ignore'] as const) {
      const patrones = valorEn(declarados[evento], clave);
      if (patrones === undefined) continue;
      if (!Array.isArray(patrones)) {
        renglones.push(`«${evento}.${clave}» no es una lista: no se sabe que deja pasar`);
        continue;
      }
      for (const archivo of archivos) {
        const decision = casa(patrones.map(String), archivo);
        if (typeof decision === 'object') {
          renglones.push(`«${evento}.${clave}» trae «${decision.ilegible}», que esta guarda no sabe leer`);
          break;
        }
        if (decision !== (clave === 'paths')) {
          renglones.push(`«${evento}» no corre si el cambio solo toca «${archivo}», y una guarda lo lee`);
        }
      }
    }
  }
  if (valorEn(analizado, 'jobs', 'verificar', 'if') !== undefined) {
    renglones.push('el trabajo `verificar` lleva un `if:`: puede saltarse lo que sus guardas leen');
  }
  return renglones;
}
