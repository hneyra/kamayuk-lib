/**
 * Contra que rama de cada consumidor se mide este PR (#26).
 *
 * <h2>El hueco que cierra</h2>
 *
 * El trabajo `consumidores` de `.github/workflows/paquetes.yml` clona el consumidor y le corre su
 * suite contra esta libreria (#10). Clonaba **su rama por omision**, y con eso un cambio de aqui
 * que exija un ajuste alla **no puede salir verde nunca**: el PR de aqui mide contra un consumidor
 * que todavia no trae el ajuste, y el PR de alla mide contra una libreria que todavia no trae el
 * cambio. Con un consumidor se sale a mano —se mezcla con el rojo mirado—; con cuatro, el rojo
 * esperado y el rojo real se ven igual.
 *
 * Asi que un PR puede NOMBRAR la rama del consumidor contra la que quiere medirse, con una linea
 * de su cuerpo:
 *
 *     consumidor: duenno/sistema@la-rama-que-lo-arregla
 *
 * <h2>Por que una linea del cuerpo del PR, y no un archivo ni una etiqueta</h2>
 *
 * Las tres se midieron antes de elegir, y esta la gana por una propiedad que las otras dos no
 * tienen: **desaparece al mezclar**, porque el cuerpo del PR no es parte del arbol.
 *
 *   · **Un archivo** —un campo `rama` en `consumidores.json`— se commitea y **se queda ahi
 *     despues de mezclar**. Medido en un clon de banco: anadido el campo en una rama y mezclada
 *     con `--no-ff`, `main` sigue diciendo `rama: 'la-rama-que-lo-arregla'`. Y esa rama del
 *     consumidor ya no existe —`git ls-remote --exit-code --heads … la-rama-que-lo-arregla` da
 *     **RC=2**—, asi que con el AC3 de este issue **todo PR siguiente de esta libreria sale rojo**
 *     hasta que alguien se acuerde de borrar el campo. Es la exencion muerta de #20 otra vez: un
 *     dato de CI que sobrevive al motivo por el que se escribio.
 *   · **Una etiqueta** no dice contra QUE RAMA de CUAL consumidor salvo codificandolo en su
 *     nombre, y entonces hay que crearla: medido, `consumidor:rentas@la-rama-que-lo-arregla` **no
 *     existe** en este repositorio (404), y crear etiquetas pide permiso de escritura que un PR
 *     no tiene. Ademas `paquetes.yml` escucha `pull_request` **sin `types:`**, o sea
 *     `opened`/`synchronize`/`reopened`: poner la etiqueta despues de abrir el PR no vuelve a
 *     correr nada.
 *   · **Una linea del cuerpo** ya tiene precedente MEDIDO aqui: `registro.yml` le pasa
 *     `github.event.pull_request.body` a `verificar-fila-del-registro.mjs` por
 *     `KAMAYUK_CUERPO_DEL_PR`, y esa guarda lo parsea con una expresion regular desde #4. No pide
 *     ningun permiso nuevo —el cuerpo viene en la carga del evento—, dice consumidor **y** rama, y
 *     al mezclar se va con el PR.
 *
 * Lo que cuesta, y se dice para que nadie lo descubra a la mala: la carga del evento se congela al
 * disparar el trabajo, asi que **editar el cuerpo no vuelve a medir** —hay que empujar un commit—,
 * y en un `push` a `main` no hay cuerpo ninguno, asi que `main` mide siempre la rama por omision
 * del consumidor. Las dos cosas son las que se quieren: la mencion vale para el PR que la escribe
 * y no sobrevive a su mezcla.
 *
 * <h2>Que es un fallo aqui, y por que no hay «se ignora en silencio»</h2>
 *
 * Una errata en esta linea que se ignorara seria un **falso verde**: el PR cree que se midio contra
 * el ajuste y se midio contra la rama de siempre. Asi que se rompe, diciendolo, cuando la mencion
 * nombra un consumidor que no esta declarado, cuando esta mal formada, cuando el mismo consumidor
 * sale dos veces, y cuando la rama nombrada no existe. Y lo que se descarta a proposito —una
 * mencion dentro de un bloque de codigo o de una cita— **se anuncia**: sin eso, la unica diferencia
 * entre «no lo nombraste» y «lo nombraste donde no cuenta» seria el silencio.
 *
 * <h2>Uso</h2>
 *
 *     node paquetes/verificaciones/rama-del-consumidor.mjs --consumidor duenno/sistema [--comprobar]
 *
 * Escribe en la salida estandar `rama=…` y `nombrada=si|no` —que es lo que `$GITHUB_OUTPUT` pide— y
 * la prosa por la de error, para que redirigir la primera no se coma la explicacion. El cuerpo sale
 * de `KAMAYUK_CUERPO_DEL_PR` o de `--cuerpo <archivo>`; la lista, de `consumidores.json` o de
 * `--consumidores <archivo>`. Sin cuerpo no hay mencion y la rama sale vacia, que es la rama por
 * omision del consumidor: el caso normal no cambia (AC2).
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** La palabra con la que el cuerpo del PR nombra una rama de un consumidor. */
export const CLAVE = 'consumidor';

/**
 * La linea entera, y nada mas que la linea.
 *
 * Anclada a los dos extremos a proposito: `consumidor:` a mitad de una frase es prosa —«la linea
 * `consumidor: x@y` del cuerpo»— y no una instruccion. La clave admite mayusculas porque la
 * escribe un humano; el valor NO se toca, por lo que dice `CONSUMIDORES`.
 */
const LINEA = /^consumidor\s*:\s*(.+)$/i;

/** `duenno/sistema@rama`. La rama puede llevar `/`, asi que el corte es por el primer `@`. */
const VALOR = /^([^/@\s]+\/[^/@\s]+)@(\S+)$/;

/**
 * Lo que `git check-ref-format` no admite en un nombre de rama.
 *
 * No es celo: una rama con forma imposible llega a `git ls-remote` y vuelve como «no existe»,
 * que es el mismo rojo por un motivo distinto. Mejor decir cual es.
 *
 * @type {readonly (readonly [RegExp, string])[]}
 */
const IMPOSIBLE_EN_UNA_RAMA = [
  [/\.\./, 'lleva «..»'],
  [/[~^:?*[\\]/, 'lleva uno de «~ ^ : ? * [ \\»'],
  [/@\{/, 'lleva «@{»'],
  [/^\//, 'empieza por «/»'],
  [/\/$/, 'acaba en «/»'],
  [/\.lock$/, 'acaba en «.lock»'],
  [/^-/, 'empieza por «-», que git lee como una opcion'],
];

/**
 * @typedef {object} Mencion
 * @property {string} repositorio  El `duenno/sistema` tal como lo escribio el cuerpo.
 * @property {string} rama         La rama, **verbatim**: las referencias de git distinguen
 *                                 mayusculas y «Arreglo» no es «arreglo».
 * @property {number} linea        Donde sale, para poder senalarla.
 */

/**
 * @typedef {object} Problema
 * @property {string} clave    Identificador estable del fallo, que es lo que la prueba afirma.
 * @property {string} detalle  Lo que se le dice a quien lo cometio.
 */

/**
 * @typedef {object} Descartada
 * @property {number} linea
 * @property {string} texto
 * @property {string} motivo
 */

/**
 * @typedef {object} Lectura
 * @property {Mencion[]} menciones
 * @property {Problema[]} problemas
 * @property {Descartada[]} descartadas
 */

/**
 * Las menciones que trae un cuerpo de PR, con lo que esta mal y lo que se descarto.
 *
 * @param {string} cuerpo
 * @returns {Lectura}
 */
export function leerLasMenciones(cuerpo) {
  /** @type {Mencion[]} */
  const menciones = [];
  /** @type {Problema[]} */
  const problemas = [];
  /** @type {Descartada[]} */
  const descartadas = [];

  let dentroDeUnBloque = false;
  const lineas = cuerpo.split('\n');

  for (let i = 0; i < lineas.length; i += 1) {
    const cruda = lineas[i] ?? '';
    const numero = i + 1;
    const recortada = cruda.trim();

    // Una valla de bloque de codigo abre o cierra. Se mira ANTES de descartar, porque la valla
    // misma nunca es una mencion.
    if (/^(```|~~~)/.test(recortada)) {
      dentroDeUnBloque = !dentroDeUnBloque;
      continue;
    }

    // La marca de cita se quita ANTES de mirar si la linea es una mencion, y se recuerda: si no,
    // una mencion citada no se pareceria a una mencion y se iria sin decir nada, que es
    // exactamente el silencio que esto no quiere.
    const citada = recortada.startsWith('>');
    const desnuda = desnudar(recortada.replace(/^(?:>\s*)+/, ''));
    if (!LINEA.test(desnuda)) continue;

    // Y aqui esta la razon de descartar los bloques, que no es teorica: **el PR que trae este
    // mecanismo ensena su sintaxis en el cuerpo**. Si un ejemplo contara, este mismo PR exigiria
    // una rama que nadie ha creado. Una cita es palabra de otro —el issue, un comentario—, y el
    // cuerpo del PR habla en primera persona. Las dos se anuncian, que es lo que las separa de
    // ignorarlas.
    if (dentroDeUnBloque) {
      descartadas.push({ linea: numero, texto: recortada, motivo: 'esta dentro de un bloque de codigo' });
      continue;
    }
    if (citada) {
      descartadas.push({ linea: numero, texto: recortada, motivo: 'esta dentro de una cita' });
      continue;
    }

    const partes = LINEA.exec(desnuda);
    const valor = (partes?.[1] ?? '').trim();
    const cortado = VALOR.exec(valor);
    if (!cortado) {
      problemas.push({
        clave: 'mencion-mal-formada',
        detalle:
          `linea ${String(numero)}: «${recortada}» no tiene la forma ` +
          `«${CLAVE}: duenno/sistema@rama».`,
      });
      continue;
    }

    const repositorio = cortado[1] ?? '';
    const rama = cortado[2] ?? '';
    const imposible = IMPOSIBLE_EN_UNA_RAMA.find(([patron]) => patron.test(rama));
    if (imposible) {
      problemas.push({
        clave: 'rama-con-forma-imposible',
        detalle: `linea ${String(numero)}: «${rama}» no puede ser una rama: ${imposible[1]}.`,
      });
      continue;
    }

    const repetida = menciones.find((otra) => mismoRepositorio(otra.repositorio, repositorio));
    if (repetida) {
      problemas.push({
        clave: 'mencion-repetida',
        detalle:
          `«${repositorio}» sale nombrado dos veces, en las lineas ` +
          `${String(repetida.linea)} y ${String(numero)} («${repetida.rama}» y «${rama}»). ` +
          'Cual de las dos es la vigente no lo puede adivinar esto: deja una.',
      });
      continue;
    }

    menciones.push({ repositorio, rama, linea: numero });
  }

  return { menciones, problemas, descartadas };
}

/**
 * @typedef {object} Consumidor
 * @property {string} repositorio
 */

/**
 * @typedef {object} Resolucion
 * @property {string} rama        La rama nombrada, o cadena vacia: la rama por omision.
 * @property {boolean} nombrada
 * @property {Problema[]} problemas
 * @property {Descartada[]} descartadas
 */

/**
 * Contra que rama se mide UN consumidor, leyendo el cuerpo entero.
 *
 * Se lee el cuerpo ENTERO y no solo la mencion de este consumidor, y es deliberado: una mencion
 * con una errata —un consumidor que no esta declarado— pone rojo a **todos** los casos de la
 * matriz. Mirando solo la propia, esa errata saldria verde en los cuatro y el PR creeria haberse
 * medido contra un ajuste que nadie clono.
 *
 * @param {{ cuerpo: string, consumidores: readonly Consumidor[], consumidor: string }} entrada
 * @returns {Resolucion}
 */
export function resolverLaRama({ cuerpo, consumidores, consumidor }) {
  const lectura = leerLasMenciones(cuerpo);
  const problemas = [...lectura.problemas];

  for (const mencion of lectura.menciones) {
    const declarado = consumidores.some((c) => mismoRepositorio(c.repositorio, mencion.repositorio));
    if (!declarado) {
      problemas.push({
        clave: 'consumidor-desconocido',
        detalle:
          `linea ${String(mencion.linea)}: «${mencion.repositorio}» no esta en la lista de ` +
          `consumidores. Los declarados son: ${consumidores.map((c) => c.repositorio).join(', ')}. ` +
          'Una errata que se ignorara seria un falso verde: el PR creeria haberse medido contra ' +
          'el ajuste, y se habria medido contra la rama de siempre.',
      });
    }
  }

  const mia = lectura.menciones.find((m) => mismoRepositorio(m.repositorio, consumidor));
  return {
    rama: mia?.rama ?? '',
    nombrada: mia !== undefined,
    problemas,
    descartadas: lectura.descartadas,
  };
}

/**
 * Si esa rama existe de verdad en ese repositorio.
 *
 * `git ls-remote --exit-code --heads` distingue TRES desenlaces, y se midieron los tres en banco
 * contra `github.com`: **RC=0** la rama esta (y devuelve su sha), **RC=2** no hay ninguna
 * referencia que case —callado, sin una linea de salida— y **RC=128** no se pudo ni preguntar
 * (`fatal: could not read Username for 'https://github.com'`). Los dos ultimos son rojos
 * DISTINTOS y ninguno cae a la rama por omision: «no existe» es una errata del PR y «no se pudo
 * preguntar» es un problema del token, y confundirlos manda a mirar donde no es.
 *
 * `GIT_TERMINAL_PROMPT=0` no es decorativo: sin el, un repositorio privado sin token deja a `git`
 * pidiendo un usuario por una terminal que en CI no existe.
 *
 * @param {{ repositorio: string, rama: string, token?: string }} entrada
 * @returns {{ existe: boolean, sha: string, problema?: Problema }}
 */
export function comprobarLaRama({ repositorio, rama, token }) {
  const remoto = token
    ? `https://x-access-token:${token}@github.com/${repositorio}.git`
    : `https://github.com/${repositorio}.git`;

  const corrida = spawnSync('git', ['ls-remote', '--exit-code', '--heads', remoto, rama], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });

  if (corrida.status === 0) {
    const primera = (corrida.stdout ?? '').split('\n')[0] ?? '';
    return { existe: true, sha: (primera.split('\t')[0] ?? '').slice(0, 7) };
  }

  if (corrida.status === 2) {
    return {
      existe: false,
      sha: '',
      problema: {
        clave: 'la-rama-no-existe',
        detalle:
          `«${repositorio}» no tiene ninguna rama «${rama}». Los nombres de rama distinguen ` +
          'mayusculas, asi que copialo del consumidor en vez de escribirlo.',
      },
    };
  }

  return {
    existe: false,
    sha: '',
    problema: {
      clave: 'no-se-pudo-preguntar',
      detalle:
        `no se pudo preguntar a «${repositorio}» si tiene la rama «${rama}» ` +
        `(git salio con ${String(corrida.status)}): ` +
        sinElToken(`${corrida.stderr ?? ''}${corrida.error ? String(corrida.error.message) : ''}`, token)
          .trim()
          .split('\n')
          .join(' · '),
    },
  };
}

// ---------------------------------------------------------------------------

/**
 * Deja la linea desnuda de lo que Markdown le pone por encima.
 *
 * Una vineta de lista y un `codigo` o un **negrita** alrededor son como un humano escribe esto, y
 * no cambian lo que dice. El subrayado NO se quita: `_` es legal en un nombre de rama y quitarlo
 * mediria otra rama sin decirlo.
 *
 * @param {string} linea
 * @returns {string}
 */
function desnudar(linea) {
  return linea
    .trim()
    .replace(/^[-*+]\s+/, '')
    .replace(/^[`*]+/, '')
    .replace(/[`*]+$/, '')
    .trim();
}

/**
 * Dos formas del mismo repositorio. GitHub no distingue mayusculas en `duenno/sistema` —y quien
 * escribe el cuerpo tampoco—, al contrario que en la rama.
 *
 * @param {string} uno
 * @param {string} otro
 * @returns {boolean}
 */
function mismoRepositorio(uno, otro) {
  return uno.toLowerCase() === otro.toLowerCase();
}

/**
 * El token fuera de cualquier cosa que se imprima. `git` mete la URL entera en varios de sus
 * fatales, y ahi va la credencial.
 *
 * @param {string} texto
 * @param {string} [token]
 * @returns {string}
 */
function sinElToken(texto, token) {
  return token ? texto.split(token).join('***') : texto;
}

// ---------------------------------------------------------------------------

// Se ejecuta SOLO como guion. Importarlo no hace nada, que es lo que deja a su prueba llamar a
// las tres funciones sin que ninguna toque la red (es el mismo reparto que
// `verificar-fila-del-registro.mjs` usa con su autoprueba).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal();
}

function principal() {
  const opciones = leerOpciones(process.argv.slice(2));
  const consumidor = opciones.consumidor;
  if (!consumidor) {
    console.error('FALLO: falta --consumidor duenno/sistema.');
    process.exit(2);
  }

  const cuerpo = opciones.cuerpo
    ? readFileSync(opciones.cuerpo, 'utf8')
    : (process.env.KAMAYUK_CUERPO_DEL_PR ?? '');

  const dondeVive =
    opciones.consumidores ?? fileURLToPath(new URL('../../consumidores.json', import.meta.url));
  const lista = /** @type {{ consumidores: Consumidor[] }} */ (
    JSON.parse(readFileSync(dondeVive, 'utf8'))
  ).consumidores;

  const resolucion = resolverLaRama({ cuerpo, consumidores: lista, consumidor });

  for (const descartada of resolucion.descartadas) {
    console.error(
      `AVISO: la linea ${String(descartada.linea)} no cuenta como mencion porque ` +
        `${descartada.motivo}: «${descartada.texto}»`,
    );
  }

  const problemas = [...resolucion.problemas];

  if (resolucion.nombrada && opciones.comprobar) {
    const comprobada = comprobarLaRama({
      repositorio: consumidor,
      rama: resolucion.rama,
      token: process.env.KAMAYUK_TOKEN_DE_CLON,
    });
    if (comprobada.problema) {
      problemas.push(comprobada.problema);
    } else {
      console.error(
        `«${consumidor}» tiene la rama «${resolucion.rama}» (${comprobada.sha}): se mide contra ella.`,
      );
    }
  }

  if (problemas.length > 0) {
    console.error('');
    console.error(`FALLO: no se puede decidir contra que rama de «${consumidor}» medir este PR.`);
    console.error('');
    for (const problema of problemas) {
      console.error(`  · [${problema.clave}] ${problema.detalle}`);
    }
    console.error('');
    console.error('  Y ESTE TRABAJO NO VA A MEDIR LA RAMA POR OMISION POR SU CUENTA. Un PR que');
    console.error('  nombra una rama del consumidor esta diciendo que su cambio necesita el');
    console.error('  ajuste que vive ahi; medir otra rama en su lugar daria un rojo —o peor, un');
    console.error('  verde— que no responde a lo que el PR pregunta.');
    console.error('');
    console.error(`  La linea del cuerpo del PR se escribe asi:  ${CLAVE}: duenno/sistema@rama`);
    console.error('');
    process.exit(1);
  }

  if (!resolucion.nombrada) {
    console.error(
      `Este PR no nombra ninguna rama de «${consumidor}»: se mide contra su rama por omision.`,
    );
  }

  console.log(`rama=${resolucion.rama}`);
  console.log(`nombrada=${resolucion.nombrada ? 'si' : 'no'}`);
}

/**
 * @param {readonly string[]} argumentos
 * @returns {{ consumidor?: string, cuerpo?: string, consumidores?: string, comprobar: boolean }}
 */
function leerOpciones(argumentos) {
  /** @type {{ consumidor?: string, cuerpo?: string, consumidores?: string, comprobar: boolean }} */
  const opciones = { comprobar: false };
  for (let i = 0; i < argumentos.length; i += 1) {
    const nombre = argumentos[i];
    if (nombre === '--comprobar') {
      opciones.comprobar = true;
      continue;
    }
    if (nombre !== '--consumidor' && nombre !== '--cuerpo' && nombre !== '--consumidores') {
      throw new Error(`Opcion desconocida: ${String(nombre)}`);
    }
    const valor = argumentos[i + 1];
    if (valor === undefined) {
      throw new Error(`Falta el valor de ${nombre}`);
    }
    if (nombre === '--consumidor') {
      opciones.consumidor = valor;
    } else if (nombre === '--cuerpo') {
      opciones.cuerpo = valor;
    } else {
      opciones.consumidores = valor;
    }
    i += 1;
  }
  return opciones;
}
