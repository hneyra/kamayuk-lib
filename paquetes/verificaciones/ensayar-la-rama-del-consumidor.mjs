/**
 * El ensayo de punta a punta de la resolucion de la rama del consumidor (#26, AC3).
 *
 * <h2>Que demuestra, y por que no puede ser una prueba de vitest</h2>
 *
 * `la-rama-del-consumidor.test.ts` prueba el parser con sus muestras **sin tocar la red**, que es
 * como tiene que ser: una suite que sale a internet falla por el tiempo de otros. Pero el AC3 —«la
 * rama nombrada que no existe sale ROJA diciendolo, y no cae a la rama por omision en silencio»— no
 * se puede demostrar sin preguntarle a un repositorio de verdad: lo que hay que medir es que
 * `git ls-remote` conteste y que el guion **entero**, con su codigo de salida y sus palabras, haga
 * lo que dice.
 *
 * Asi que esto corre el guion como lo corre la CI —un proceso, sus argumentos, su codigo de
 * salida— contra **este mismo repositorio** usado como consumidor de banco, con tres casos:
 *
 *   1. una rama que EXISTE (`main`): resuelve, y el guion sale con 0 diciendo su sha;
 *   2. una rama que NO EXISTE: sale con 1, nombra la rama, nombra el consumidor y dice que **no
 *      va a medir la rama por omision por su cuenta**;
 *   3. sin mencion: sale con 0 y la rama resuelta es la cadena vacia, que es la rama por omision.
 *
 * Y un cuarto que no necesita red y cierra el otro falso verde: una mencion de un consumidor que
 * no esta declarado tiene que romper el guion, no ignorarse.
 *
 * <h2>Por que en CI y no como costumbre</h2>
 *
 * Porque una costumbre no es una guarda (#19): el dia que alguien cambie el reparto de codigos de
 * salida de `git ls-remote`, o le quite el `--exit-code`, el unico sitio donde eso se ve es aqui.
 * Tiene su paso en `paquetes.yml`, y se corre a mano con `yarn consumidor:ensayo`.
 *
 * El repositorio de banco sale de `GITHUB_REPOSITORY` en CI y del remoto `origin` en una maquina;
 * se puede forzar con `KAMAYUK_REPOSITORIO_DEL_ENSAYO`. **La rama del caso 2 no se crea jamas**:
 * crearla dejaria este ensayo en verde sin medir nada.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESOLVEDOR = fileURLToPath(new URL('./rama-del-consumidor.mjs', import.meta.url));

/** La rama que no existe. NO SE CREA: si existiera, el caso 2 dejaria de medir. */
const LA_QUE_NO_EXISTE = 'ni-esta-rama-existe-ni-se-crea-jamas-26';

/** La rama que si existe. `main` en los seis repositorios del producto. */
const LA_QUE_EXISTE = process.env.KAMAYUK_RAMA_DEL_ENSAYO ?? 'main';

const REPOSITORIO = repositorioDeBanco();
const carpeta = mkdtempSync(join(tmpdir(), 'kamayuk-26-'));

/**
 * Una lista de consumidores como la de `consumidores.json`, con los repositorios que se le den.
 *
 * @param {readonly string[]} repositorios
 * @returns {string} donde quedo escrita
 */
function listaDeBanco(repositorios) {
  const donde = join(carpeta, `consumidores-${String(repositorios.length)}-${repositorios.join('+').replace(/\W/g, '')}.json`);
  writeFileSync(
    donde,
    `${JSON.stringify(
      {
        consumidores: repositorios.map((repositorio) => ({
          repositorio,
          directorio: repositorio.split('/').pop(),
          ruta: 'frontend',
          orden: 'yarn verificar',
        })),
      },
      null,
      2,
    )}\n`,
  );
  return donde;
}

/**
 * @typedef {object} Caso
 * @property {string} nombre
 * @property {string} cuerpo
 * @property {'verde' | 'rojo'} esperado
 * @property {readonly string[]} dice       Trozos que la salida TIENE que traer.
 * @property {string} [consumidor]          Contra quien se resuelve; por omision, el de banco.
 * @property {readonly string[]} [calla]    Trozos que la salida NO puede traer: un rojo por el
 *                                          motivo equivocado es pasar por casualidad.
 */

/** @type {readonly Caso[]} */
const CASOS = [
  {
    nombre: `la rama «${LA_QUE_EXISTE}» EXISTE: se mide contra ella`,
    cuerpo: `Un cambio que necesita ajuste alla.\n\nconsumidor: ${REPOSITORIO}@${LA_QUE_EXISTE}\n`,
    esperado: 'verde',
    dice: [`rama=${LA_QUE_EXISTE}`, 'nombrada=si'],
  },
  {
    nombre: `la rama «${LA_QUE_NO_EXISTE}» NO existe: rojo, y no cae a la rama por omision`,
    cuerpo: `consumidor: ${REPOSITORIO}@${LA_QUE_NO_EXISTE}\n`,
    esperado: 'rojo',
    dice: [
      LA_QUE_NO_EXISTE,
      REPOSITORIO,
      'la-rama-no-existe',
      'NO VA A MEDIR LA RAMA POR OMISION POR SU CUENTA',
    ],
  },
  {
    nombre: 'sin mencion, la rama resuelta es la de por omision (AC2)',
    cuerpo: 'Un cambio que no necesita nada de nadie.\n\nCloses #26\n',
    esperado: 'verde',
    dice: ['rama=\nnombrada=no'],
  },
  {
    nombre: 'un consumidor que no esta declarado rompe el guion, no se ignora',
    cuerpo: 'consumidor: hneyra/este-no-esta-declarado@una-rama\n',
    esperado: 'rojo',
    dice: ['consumidor-desconocido', 'falso verde'],
  },
  {
    // «No existe la rama» y «no se pudo preguntar» son DOS rojos, y confundirlos manda a mirar
    // donde no es: el primero es una errata del cuerpo del PR, el segundo un problema del token.
    // Este repositorio no existe y no se crea: con token da «Repository not found» y sin token
    // «could not read Username», y los dos son RC=128, o sea el mismo camino.
    nombre: 'un repositorio al que no se puede preguntar NO se confunde con una rama que falta',
    consumidor: 'hneyra/a-este-repositorio-no-se-le-puede-preguntar',
    cuerpo: 'consumidor: hneyra/a-este-repositorio-no-se-le-puede-preguntar@una-rama\n',
    esperado: 'rojo',
    dice: ['no-se-pudo-preguntar'],
    calla: ['la-rama-no-existe'],
  },
];

let fallos = 0;
console.log(`El consumidor de banco es «${REPOSITORIO}».\n`);

for (const caso of CASOS) {
  const cuerpo = join(carpeta, 'cuerpo.txt');
  writeFileSync(cuerpo, caso.cuerpo);
  const consumidor = caso.consumidor ?? REPOSITORIO;

  const corrida = spawnSync(
    'node',
    [
      RESOLVEDOR,
      '--consumidor',
      consumidor,
      '--cuerpo',
      cuerpo,
      '--consumidores',
      listaDeBanco([consumidor]),
      '--comprobar',
    ],
    { encoding: 'utf8', env: { ...process.env, KAMAYUK_CUERPO_DEL_PR: '' } },
  );
  const salida = `${corrida.stdout ?? ''}${corrida.stderr ?? ''}`;
  const fueRojo = corrida.status !== 0;

  if (fueRojo !== (caso.esperado === 'rojo')) {
    console.error(`MAL: «${caso.nombre}» esperaba ${caso.esperado} y salio lo contrario.`);
    console.error(salida.trim());
    fallos += 1;
    continue;
  }

  const sinDecir = caso.dice.filter((trozo) => !salida.includes(trozo));
  if (sinDecir.length > 0) {
    console.error(`MAL: «${caso.nombre}» salio ${caso.esperado} sin decir: ${sinDecir.join(' · ')}`);
    console.error(salida.trim());
    fallos += 1;
    continue;
  }

  const dijoDeMas = (caso.calla ?? []).filter((trozo) => salida.includes(trozo));
  if (dijoDeMas.length > 0) {
    console.error(
      `MAL: «${caso.nombre}» confundio el motivo y dijo: ${dijoDeMas.join(' · ')}`,
    );
    console.error(salida.trim());
    fallos += 1;
    continue;
  }

  console.log(`OK (${caso.esperado}): ${caso.nombre}`);
}

if (fallos > 0) {
  console.error(`\nFALLO: ${String(fallos)} de ${String(CASOS.length)} casos del ensayo.`);
  process.exit(1);
}
console.log(`\nLos ${String(CASOS.length)} casos del ensayo se comportan como deben.`);

// ---------------------------------------------------------------------------

/**
 * Contra que repositorio se ensaya. En CI lo dice el propio entorno; en una maquina, el remoto.
 *
 * Se pregunta y no se escribe dentro: un `duenno/repo` cableado aqui seria una suposicion sobre un
 * sistema, que es justo lo que la regla de la casa prohibe.
 *
 * @returns {string}
 */
function repositorioDeBanco() {
  const forzado = process.env.KAMAYUK_REPOSITORIO_DEL_ENSAYO ?? process.env.GITHUB_REPOSITORY;
  if (forzado) return forzado;

  const remoto = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const cortado = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(remoto);
  if (!cortado?.[1]) {
    throw new Error(
      `No se pudo deducir el repositorio de «${remoto}». Pasalo en KAMAYUK_REPOSITORIO_DEL_ENSAYO.`,
    );
  }
  return cortado[1];
}
