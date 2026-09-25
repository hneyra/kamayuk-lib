// @vitest-environment node
//
// Lee el JSON y el workflow del disco. No es un DOM lo que necesita.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RAIZ } from './texto.ts';
import {
  analizarWorkflow,
  esMapa,
  type Mapa,
  ordenDe,
  pasosDe,
  trabajoDe,
  valorEn,
} from './workflow.ts';

/**
 * **La CI mira a sus consumidores, y la lista es DATO** (#10).
 *
 * <h2>El hueco que esto tapa, y que costo dos veces</h2>
 *
 * Con `link:` no hay `npm publish` que actue de compuerta, ni rango semver que de margen, ni
 * lockfile del consumidor que fije nada: **cada `main` de aqui es, sin intermediario, el `main` de
 * los sistemas**. Y lo que esta CI verificaba hasta #10 es que la libreria es coherente CONSIGO
 * MISMA, que no es su contrato.
 *
 *   · **#8** renombro `--radius-radio` a `--radius`: 217 pruebas en verde aqui y `rentas` en rojo
 *     con «expected 44 to be 42». Se cazo corriendo la suite del consumidor A MANO.
 *   · **#14** anadio `cmdk` y `sonner` como `peerDependencies`: verde aqui, y `rentas` con tres
 *     archivos sin recoger. Esa vez lo dijo antes una guarda DEL CONSUMIDOR, no esta CI.
 *
 * <h2>Por que esta guarda, si el trabajo de CI ya existe</h2>
 *
 * Porque el trabajo puede quedarse sin sujeto sin que nadie lo note: una lista vacia, un JSON que
 * el workflow deja de leer, o una orden mal escrita dan un trabajo **en verde que no mira nada**.
 * Es la misma forma de fallo que este repositorio ya conoce —una guarda que no puede fallar— y
 * aqui se aplica al guardian.
 *
 * <h2>Y la disposicion en el disco, que hasta #79 se vigilaba por efecto secundario</h2>
 *
 * Los campos `directorio` y `ruta` deciden donde cae el clon del consumidor, y de eso depende que
 * su `link:` resuelva. Hasta #79 lo unico que se comprobaba era el NOMBRE —que `directorio` fuera
 * el ultimo trozo del repositorio—, que protege de rebote: es a la vez mas estricto que la
 * resolucion y ciego a la mitad del camino, porque `ruta` no lo miraba nadie. Hoy hay **tres**
 * renglones, y cada uno dice lo que es: la profundidad y el choque con esta libreria DECIDEN; el
 * nombre es CONVENCION. Los tres, con su muestra.
 *
 * <h2>Y el workflow se lee como YAML (#114)</h2>
 *
 * Hasta #114 las comprobaciones del workflow preguntaban si el TEXTO «contenia» `consumidores.json`,
 * `fromJSON` y «El veredicto», y los comentarios de `paquetes.yml` contienen las tres: quitado el
 * paso de `jq`, quitada la linea del `include` y renombrado el veredicto, las tres seguian en verde.
 * Hoy se pregunta por la FORMA del objeto que da `workflow.ts`, y las tres roturas son muestras.
 */

const JSON_DE_CONSUMIDORES = 'consumidores.json';
const WORKFLOW = '.github/workflows/paquetes.yml';

interface Consumidor {
  readonly repositorio: string;
  readonly directorio: string;
  readonly ruta: string;
  readonly orden: string;
}

const declarado = JSON.parse(readFileSync(join(RAIZ, JSON_DE_CONSUMIDORES), 'utf8')) as {
  consumidores: Consumidor[];
};
const textoDelWorkflow = readFileSync(join(RAIZ, WORKFLOW), 'utf8');
const workflow = analizarWorkflow(textoDelWorkflow, WORKFLOW);

/**
 * Los niveles que sube el `link:` del consumidor, y por tanto los que tiene que bajar el consumidor
 * desde la raiz del espacio de trabajo del corredor.
 *
 * NO se lee de ningun consumidor, porque aqui no hay ningun clon suyo que leer: es el `../../` que
 * los cuatro llevan escrito (`link:../../kamayuk-lib/paquetes/*`, medido en los cuatro
 * `frontend/package.json`). El dia que uno use otra profundidad, esta constante deja de valer para
 * todos y hay que volver a decidir que se vigila.
 */
const NIVELES_QUE_SUBE_EL_LINK = 2;

/** Donde `actions/checkout` deja ESTA libreria en el trabajo de consumidores (`path: kamayuk-lib`). */
const CARPETA_DE_LA_LIBRERIA = 'kamayuk-lib';

/** Lo que de una entrada decide la disposicion en el disco. `orden` no participa. */
type Disposicion = Pick<Consumidor, 'repositorio' | 'directorio' | 'ruta'>;

/**
 * Un tramo vacio, `.` o `..` hace que contar tramos mienta —`a/./b` baja dos niveles, no tres, y
 * `a/..` no baja ninguno—, asi que ninguno de los tres cuenta como nivel: la entrada sale roja.
 */
const esUnTramoCorriente = (tramo: string): boolean => tramo !== '' && tramo !== '.' && tramo !== '..';

/** `null` = el camino no es una cadena de nombres corrientes, y su profundidad no se puede afirmar. */
const nivelesQueBaja = ({ directorio, ruta }: Disposicion): number | null => {
  const tramos = [...directorio.split('/'), ...ruta.split('/')];
  return tramos.every(esUnTramoCorriente) ? tramos.length : null;
};

const losQueNoCaenDondeElLinkMira = (consumidores: readonly Disposicion[]): string[] =>
  consumidores
    .filter((c) => nivelesQueBaja(c) !== NIVELES_QUE_SUBE_EL_LINK)
    .map((c) => {
      const niveles = nivelesQueBaja(c);
      const cuanto =
        niveles === null
          ? 'lleva un tramo que no es un nombre de carpeta («», «.» o «..»)'
          : `baja ${niveles} niveles`;
      return `  ${c.repositorio}: «${c.directorio}/${c.ruta}» ${cuanto}, y el «link:» sube ${NIVELES_QUE_SUBE_EL_LINK}`;
    });

const losQueChocanConLaLibreria = (consumidores: readonly Disposicion[]): string[] =>
  consumidores
    .filter((c) => c.directorio === CARPETA_DE_LA_LIBRERIA)
    .map((c) => `  ${c.repositorio} pide clonarse en «${c.directorio}», que ya es el clon de esta libreria`);

const losQueNoSiguenLaConvencion = (consumidores: readonly Disposicion[]): string[] =>
  consumidores
    .filter((c) => c.directorio !== c.repositorio.split('/').pop())
    .map((c) => `  ${c.repositorio} se clona en «${c.directorio}»`);

/**
 * Todas las cadenas de un workflow ya analizado —claves y valores, a cualquier profundidad—. Es
 * donde se busca un consumidor escrito a mano: sin comentarios, porque el analizador ya los quito, y
 * con o sin comillas, porque el analizador tambien las quito (el `includes("'hneyra/rentas'")` de
 * antes de #114 no veia un `repositorio: hneyra/rentas` sin comillas).
 */
function cadenasDe(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(cadenasDe);
  if (esMapa(valor)) return Object.entries(valor).flatMap(([clave, dentro]) => [clave, ...cadenasDe(dentro)]);
  return [];
}

/**
 * Lo que le falta al workflow para LEER la lista de `consumidores.json`, en vez de traerla escrita.
 *
 * Por la FORMA, no por el texto (#114): la salida `consumidores` del trabajo `verificar` sale de un
 * paso suyo que la lee con `jq`, y la matriz del trabajo `consumidores` se llena con `fromJSON` de
 * esa salida. Antes se preguntaba si el archivo «contenia» `consumidores.json` y `fromJSON`, y los
 * comentarios de al lado los contienen: quitados el paso de `jq` y la linea del `include`, salia en
 * verde.
 */
function loQueFaltaParaLeerLaLista(workflow: Mapa): string[] {
  const faltas: string[] = [];
  const verificar = trabajoDe(workflow, 'verificar');
  const salida = valorEn(verificar, 'outputs', 'consumidores');
  const id = typeof salida === 'string' ? /steps\.([\w-]+)\.outputs\.consumidores/.exec(salida)?.[1] : undefined;
  const paso = pasosDe(verificar).find((p) => id !== undefined && p['id'] === id);
  if (paso === undefined) {
    faltas.push('el trabajo `verificar` no publica `consumidores` desde un paso suyo');
  } else if (!/\bjq\b[^\n]*\bconsumidores\.json\b/.test(ordenDe(paso))) {
    faltas.push(`el paso «${String(paso['id'])}» no lee \`consumidores.json\` con \`jq\``);
  }

  const include = valorEn(trabajoDe(workflow, 'consumidores'), 'strategy', 'matrix', 'include');
  if (typeof include !== 'string' || !/fromJSON\(\s*needs\.verificar\.outputs\.consumidores\s*\)/.test(include)) {
    faltas.push('la matriz del trabajo `consumidores` no es `include: ${{ fromJSON(needs.verificar.outputs.consumidores) }}`');
  }
  return faltas;
}

/** Los pasos del trabajo `consumidores`, que es donde se mide y se decide. */
const pasosDelConsumidor = (workflow: Mapa): Mapa[] => pasosDe(trabajoDe(workflow, 'consumidores'));

const LINEA_BASE = /checkout --quiet --detach origin\/main/;
const ESTA_RAMA = /checkout --quiet --detach "\$GITHUB_SHA"/;

/**
 * Lo que le falta a la MEDIDA DOBLE: un paso que pone la libreria en `main` y otro que la pone en
 * esta rama, cada uno con `continue-on-error: true` —sin eso el primer rojo para el trabajo y no hay
 * nada que comparar—.
 */
function loQueFaltaALaMedida(workflow: Mapa): string[] {
  const pasos = pasosDelConsumidor(workflow);
  const faltas: string[] = [];
  for (const [patron, cual] of [
    [LINEA_BASE, 'la linea base, con la libreria en `main`'],
    [ESTA_RAMA, 'la medida con esta rama'],
  ] as const) {
    const paso = pasos.find((p) => patron.test(ordenDe(p)));
    if (paso === undefined) faltas.push(`no hay paso que haga ${cual}`);
    else if (paso['continue-on-error'] !== true) faltas.push(`el paso de ${cual} no lleva \`continue-on-error: true\``);
  }
  return faltas;
}

/** El `name` del paso que decide. Lo leen las personas que miran la CI, y por eso se exige tal cual. */
const NOMBRE_DEL_VEREDICTO = 'El veredicto';

/**
 * Lo que le falta al VEREDICTO: un paso con ese nombre, DESPUES de los dos que miden —antes no
 * tendria sus resultados—, y con el rojo que para el trabajo.
 */
function loQueFaltaAlVeredicto(workflow: Mapa): string[] {
  const pasos = pasosDelConsumidor(workflow);
  const indice = pasos.findIndex((p) => p['name'] === NOMBRE_DEL_VEREDICTO);
  if (indice === -1) return [`no hay un paso llamado «${NOMBRE_DEL_VEREDICTO}» en el trabajo \`consumidores\``];
  const faltas: string[] = [];
  const ultimaMedida = Math.max(
    pasos.findIndex((p) => LINEA_BASE.test(ordenDe(p))),
    pasos.findIndex((p) => ESTA_RAMA.test(ordenDe(p))),
  );
  if (indice < ultimaMedida) faltas.push('el veredicto va antes de las medidas que tiene que leer');
  if (!/ESTA RAMA ROMPE A/.test(ordenDe(pasos[indice] ?? {}))) faltas.push('el veredicto no tiene el rojo que para el trabajo');
  return faltas;
}

/**
 * El paso `setup-node` que instala el consumidor —el que cachea SU `yarn.lock`—, o `null`.
 *
 * Del objeto y no del texto (#114): un `# check-latest: true` en un comentario no llega al objeto,
 * y una guarda que se diera por satisfecha con el pasaria en verde con la CI rota, que es justo el
 * defecto que ya se cazo una vez en este repositorio (#105).
 */
function setupNodeDelConsumidor(workflow: Mapa): Mapa | null {
  return (
    pasosDelConsumidor(workflow).find(
      (p) =>
        typeof p['uses'] === 'string' &&
        p['uses'].startsWith('actions/setup-node@') &&
        String(valorEn(p, 'with', 'cache-dependency-path') ?? '').includes('matrix.directorio'),
    ) ?? null
  );
}

/**
 * Si el paso pide la ULTIMA 24. `true` sin comillas es lo que se escribe; `"true"` es lo mismo para
 * `setup-node`, que lee sus entradas como cadenas y las pasa por `getBooleanInput` —`true`, `True`
 * o `TRUE`—, asi que exigir el booleano sacaria rojo sin que nada estuviera roto.
 */
const pideLaUltima = (paso: Mapa | null): boolean =>
  /^(?:true|True|TRUE)$/.test(String(valorEn(paso, 'with', 'check-latest') ?? ''));

describe('la CI mira a sus consumidores', () => {
  it('EL CENTINELA: hay al menos un consumidor declarado', () => {
    // Una lista vacia deja el trabajo de CI con cero casos de matriz y en VERDE. Es exactamente el
    // modo de fallo que la guarda existe para impedir, aplicado a si misma.
    expect(declarado.consumidores.length, 'no hay ni un consumidor declarado').toBeGreaterThanOrEqual(1);
  });

  it('cada consumidor dice las cuatro cosas que hacen falta para correrlo', () => {
    // Sin `directorio` el enlace del consumidor no resuelve —`link:` sube dos niveles y tiene que
    // caer JUNTO a la libreria—, y sin `orden` no se sabe que ejecutar: `rentas` encadena lint,
    // tipos y pruebas en `yarn verificar`, y otro sistema podria llamarla de otra forma.
    const incompletos = declarado.consumidores
      .filter((c) => !c.repositorio || !c.directorio || !c.ruta || !c.orden)
      .map((c) => `  ${JSON.stringify(c)}`);
    expect(
      incompletos,
      `Hay consumidores a los que les falta algo:\n${incompletos.join('\n')}`,
    ).toEqual([]);
  });

  it('el consumidor cae a la PROFUNDIDAD que su `link:` mira', () => {
    // LO QUE DE VERDAD DECIDE SI EL `link:` RESUELVE, y hasta #79 esta guarda no lo miraba.
    //
    // NO es que el clon caiga «en otro sitio», que es lo que dijo este comentario hasta #77: el
    // `path:` del `actions/checkout` del consumidor usa ESTE mismo campo, asi que el clon cae
    // exactamente donde el campo diga, y lo que viene despues —`cache-dependency-path` y los
    // `working-directory`— lo sigue. La fila de #45 ya lo habia medido y el comentario se quedo.
    // (Hasta #93 el clon caia en `consumidor/` y un `mv` lo movia; el campo era el mismo.)
    //
    // Lo que se rompe es el `link:` del consumidor, y ese `link:` mira la PROFUNDIDAD, no el
    // nombre: `link:../../kamayuk-lib/paquetes/ui` sube dos niveles desde `<directorio>/<ruta>`
    // hasta la raiz del espacio de trabajo, que es donde `actions/checkout` dejo la libreria.
    //
    // Y LA `ruta` CUENTA IGUAL QUE EL `directorio`, que es la mitad que #79 midio antes de
    // escribirla: los dos campos forman el mismo camino, asi que `caja/apps/web` rompe exactamente
    // como `a/b/frontend`. En un banco con la disposicion del job (`node:22` por Docker, yarn 1
    // —el de los cuatro consumidores, que no declaran `packageManager`—):
    //
    //   | directorio        | ruta        | yarn install | require('@kamayuk/formato')            |
    //   | caja              | frontend    | RC=0         | «la libreria»                          |
    //   | a/b               | frontend    | RC=0         | Cannot find module · MODULE_NOT_FOUND  |
    //   | caja-ruta-honda   | apps/web    | RC=0         | Cannot find module · MODULE_NOT_FOUND  |
    //
    // Los tres dejan el MISMO symlink —`../../../../kamayuk-lib/paquetes/formato`—, y en los dos
    // ultimos queda COLGANDO sin que `yarn install` diga una palabra: el rojo no llega hasta que
    // alguien importa, dentro de la suite del consumidor y sin nombrar `consumidores.json`. Por eso
    // se vigila aqui, que es donde se arregla.
    const fuera = losQueNoCaenDondeElLinkMira(declarado.consumidores);
    expect(
      fuera,
      `En «${JSON_DE_CONSUMIDORES}» hay consumidores que no caen donde su «link:» los busca:\n${fuera.join('\n')}`,
    ).toEqual([]);
  });

  it('ningun `directorio` choca con el clon de esta libreria', () => {
    // La otra forma de tumbar el trabajo, y NO rompe por donde parece: medido, si el consumidor
    // llegara a estar en `kamayuk-lib/frontend` su `link:` resolveria —yarn lo acorta a
    // `../../../paquetes/formato` y `require` devuelve «la libreria»—. Lo que se rompe es la
    // disposicion: `directorio: "kamayuk-lib"` manda el clon del consumidor AL MISMO SITIO donde el
    // primer paso dejo el de esta libreria, y uno se come al otro.
    //
    // Hasta #93 lo rompia el `mv`: `mv consumidor 'kamayuk-lib'` con `kamayuk-lib` ya existente
    // salia **RC=0** y metia el clon DENTRO, dejando `kamayuk-lib/consumidor` y ningun
    // `kamayuk-lib/frontend`. Desde #93 el clon cae directo en `path: <directorio>` y no hay `mv`,
    // asi que el destrozo lo hace `actions/checkout` sobre el directorio de la libreria en vez del
    // `mv`; el rojo sigue llegando lejos de `consumidores.json` y sin nombrarlo, que es lo que esta
    // guarda existe para adelantar. Por eso la regla se queda igual: lo que prohibe no es un `mv`
    // concreto, es que dos clones se pisen.
    const chocan = losQueChocanConLaLibreria(declarado.consumidores);
    expect(
      chocan,
      `En «${JSON_DE_CONSUMIDORES}» hay un «directorio» que choca con el clon de esta libreria:\n${chocan.join('\n')}`,
    ).toEqual([]);
  });

  it('LA CONVENCION: el `directorio` se llama como el ultimo trozo del repositorio', () => {
    // ESTO ES UNA CONVENCION, NO LA RESOLUCION, y se conserva a sabiendas (#79). Medido en #45 y
    // otra vez en #78: `caja-web/frontend` resuelve IGUAL que `caja/frontend`, asi que este renglon
    // sale rojo sin que nada este roto. Las dos comprobaciones de arriba son las que deciden.
    //
    // POR QUE SE QUEDA. Con ella, la disposicion del corredor es la MISMA que la del disco de quien
    // desarrolla —`<x>/caja/frontend` junto a `<x>/kamayuk-lib`, que es lo que pide el `link:`—, y
    // un rojo de CI se reproduce en local con las mismas rutas, copiadas tal cual del registro. Sin
    // ella, `directorio` seria un nombre libre que hay que ir a leer para saber que carpeta mira
    // cada `working-directory` del workflow.
    //
    // Y CUANTO CUESTA: hoy, nada. `directorio` es, en las cuatro entradas, el ultimo trozo de
    // `repositorio`. El dia que un consumidor necesite otro nombre —y no hay ninguno a la vista—,
    // lo que se borra es ESTE renglon con su muestra, y no las dos comprobaciones de arriba.
    const torcidos = losQueNoSiguenLaConvencion(declarado.consumidores);
    expect(
      torcidos,
      `En «${JSON_DE_CONSUMIDORES}» el «directorio» no se llama como el repositorio ` +
        `(es la CONVENCION, no la resolucion):\n${torcidos.join('\n')}`,
    ).toEqual([]);
  });

  it('LA MUESTRA: un camino que no baja dos niveles sale rojo, lo torciera el `directorio` o la `ruta`', () => {
    // Una guarda que no puede fallar no protege nada, y estas tres se comprueban sobre DATO del
    // disco: sin muestras, un `consumidores.json` sano las deja verdes para siempre sin ejercitar
    // una sola linea de la regla.
    const referencia = { repositorio: 'hneyra/caja', directorio: 'caja', ruta: 'frontend' };
    expect(losQueNoCaenDondeElLinkMira([referencia]), 'la disposicion buena sale roja').toEqual([]);

    for (const torcida of [
      { ...referencia, directorio: 'a/b' },
      { ...referencia, ruta: 'apps/web' },
      { ...referencia, directorio: 'caja/' },
      { ...referencia, ruta: './frontend' },
      { ...referencia, directorio: '..' },
    ]) {
      expect(
        losQueNoCaenDondeElLinkMira([torcida]),
        `«${torcida.directorio}/${torcida.ruta}» paso en verde`,
      ).toHaveLength(1);
      expect(
        losQueNoCaenDondeElLinkMira([torcida])[0],
        'el rojo no dice donde se arregla',
      ).toContain(torcida.repositorio);
    }
  });

  it('LA MUESTRA: un `directorio` llamado `kamayuk-lib` sale rojo, y solo el', () => {
    const referencia = { repositorio: 'hneyra/caja', directorio: 'caja', ruta: 'frontend' };
    expect(losQueChocanConLaLibreria([referencia])).toEqual([]);
    // Y no es la profundidad: `kamayuk-lib/frontend` baja dos niveles, asi que la otra regla lo deja
    // pasar. Son dos formas de romper distintas y cada una tiene su renglon.
    const choque = { repositorio: 'hneyra/kamayuk-lib-web', directorio: 'kamayuk-lib', ruta: 'frontend' };
    expect(losQueNoCaenDondeElLinkMira([choque]), 'la profundidad ya lo cazaba: la muestra no prueba nada').toEqual([]);
    expect(losQueChocanConLaLibreria([choque]), '«kamayuk-lib» como directorio paso en verde').toHaveLength(1);
  });

  it('LA MUESTRA: un nombre distinto a la misma profundidad rompe LA CONVENCION y nada mas', () => {
    // El caso que #78 midio: `caja-web/frontend` resuelve igual. Aqui se decide explicitamente que
    // pasa con el — sale rojo, pero SOLO por el renglon de la convencion, y los dos que miran la
    // resolucion lo dejan pasar. Si algun dia se afloja, esto es lo que hay que borrar.
    const otroNombre = { repositorio: 'hneyra/caja', directorio: 'caja-web', ruta: 'frontend' };
    expect(losQueNoCaenDondeElLinkMira([otroNombre]), 'la resolucion no se rompe, y la guarda dice que si').toEqual([]);
    expect(losQueChocanConLaLibreria([otroNombre])).toEqual([]);
    expect(losQueNoSiguenLaConvencion([otroNombre]), 'la convencion dejo pasar «caja-web»').toHaveLength(1);
    expect(losQueNoSiguenLaConvencion([{ ...otroNombre, directorio: 'caja' }])).toEqual([]);
  });

  it('el workflow LEE la lista, en vez de traerla escrita dentro', () => {
    // Es lo que hace que anadir `catastro` sea una linea de datos y no un `job` copiado. Con la
    // lista escrita en el YAML, el JSON se quedaria de adorno y nadie lo notaria.
    const faltas = loQueFaltaParaLeerLaLista(workflow);
    expect(faltas, `El workflow no lee la lista:\n  ${faltas.join('\n  ')}`).toEqual([]);
    const cadenas = cadenasDe(workflow);
    for (const consumidor of declarado.consumidores) {
      expect(
        cadenas.filter((cadena) => cadena.includes(consumidor.repositorio)),
        `el workflow trae «${consumidor.repositorio}» escrito dentro: la lista deja de ser dato`,
      ).toEqual([]);
    }
  });

  it('mide DOS veces: la linea base y esta rama', () => {
    // Sin la linea base, un consumidor roto por su cuenta pone este repositorio en rojo por un
    // motivo ajeno. Un guardian que da falsos positivos se acaba ignorando, y con el se ignora el
    // positivo de verdad.
    const faltas = loQueFaltaALaMedida(workflow);
    expect(faltas, `La medida doble esta incompleta:\n  ${faltas.join('\n  ')}`).toEqual([]);
  });

  it('y el veredicto va en un paso APARTE, porque los dos anteriores no fallan solos', () => {
    // `continue-on-error` en los dos pasos de medida es lo que permite comparar; sin un paso que
    // decida despues, el trabajo saldria VERDE con los dos en rojo.
    const faltas = loQueFaltaAlVeredicto(workflow);
    expect(faltas, `El veredicto no esta donde tiene que estar:\n  ${faltas.join('\n  ')}`).toEqual([]);
  });

  it('LA MUESTRA: las tres roturas de #114 salen ROJAS, aunque los comentarios sigan nombrandolas', () => {
    // El defecto que #114 cierra, puesto sobre el workflow de ESTE arbol y en memoria: antes de
    // #114 las tres salian en verde, porque `consumidores.json`, `fromJSON` y «El veredicto» los
    // siguen diciendo los comentarios de al lado. Se comprueba primero que la rotura se aplico —una
    // muestra que no rompe nada no prueba nada— y que los comentarios que la delataban siguen ahi.
    const ROTURAS: readonly {
      nombre: string;
      romper: (texto: string) => string;
      juez: (workflow: Mapa) => string[];
      loQueDiceElComentario: string;
    }[] = [
      {
        nombre: 'sin el paso de `jq`',
        romper: (texto) => texto.replace(/^ {6}- name: Quien consume esta libreria\n(?: {8}.*\n)+/m, ''),
        juez: loQueFaltaParaLeerLaLista,
        loQueDiceElComentario: 'consumidores.json',
      },
      {
        nombre: 'sin `include: fromJSON`',
        romper: (texto) => texto.replace(/^ {8}include: \$\{\{ fromJSON\(.*\n/m, ''),
        juez: loQueFaltaParaLeerLaLista,
        loQueDiceElComentario: 'fromJSON',
      },
      {
        nombre: 'con el veredicto renombrado',
        romper: (texto) => texto.replace(`- name: ${NOMBRE_DEL_VEREDICTO}\n`, '- name: Decidir\n'),
        juez: loQueFaltaAlVeredicto,
        loQueDiceElComentario: NOMBRE_DEL_VEREDICTO,
      },
    ];
    for (const { nombre, romper, juez, loQueDiceElComentario } of ROTURAS) {
      const roto = romper(textoDelWorkflow);
      expect(roto, `la rotura «${nombre}» no se aplico`).not.toBe(textoDelWorkflow);
      expect(roto, `«${loQueDiceElComentario}» ya no esta en el texto: la muestra no prueba lo de #114`).toContain(
        loQueDiceElComentario,
      );
      expect(juez(analizarWorkflow(roto, WORKFLOW)), `«${nombre}» paso en verde`).not.toEqual([]);
    }
  });

  it('LA MUESTRA: una medida sin `continue-on-error` o un veredicto antes de las medidas salen rojos', () => {
    const sinContinuar = textoDelWorkflow.replace(/^ {8}continue-on-error: true\n/m, '');
    expect(sinContinuar, 'la rotura no se aplico').not.toBe(textoDelWorkflow);
    expect(loQueFaltaALaMedida(analizarWorkflow(sinContinuar)), 'una medida que para el trabajo paso en verde').toHaveLength(1);

    const pasos = pasosDe(trabajoDe(workflow, 'consumidores'));
    const veredicto = pasos.find((p) => p['name'] === NOMBRE_DEL_VEREDICTO);
    const adelantado = {
      jobs: { consumidores: { steps: [veredicto, ...pasos.filter((p) => p !== veredicto)] } },
    };
    expect(loQueFaltaAlVeredicto(adelantado), 'un veredicto antes de las medidas paso en verde').toEqual([
      'el veredicto va antes de las medidas que tiene que leer',
    ]);
  });

  it('el Node del consumidor es la ULTIMA 24, no la que el corredor tenga en cache', () => {
    // Medido el 2026-09-23: `rentas` pidio `^24.21.0`, el corredor traia la 24.20.0 y el trabajo
    // salio rojo en la instalacion, antes de medir nada y en la linea base igual que en la rama.
    const paso = setupNodeDelConsumidor(workflow);
    expect(paso, 'no se encontro el `setup-node` que cachea el `yarn.lock` del consumidor').not.toBeNull();
    expect(pideLaUltima(paso), 'el `setup-node` del consumidor no pide la ultima 24').toBe(true);
  });

  it('LA MUESTRA: `check-latest` en un COMENTARIO no cuenta, y sin el sale rojo', () => {
    const conPaso = (extra: string) =>
      analizarWorkflow(
        [
          'jobs:',
          '  consumidores:',
          '    steps:',
          '      - uses: actions/setup-node@v7',
          '        with:',
          '          node-version: "24"',
          extra,
          "          cache-dependency-path: ${{ format('{0}/{1}/yarn.lock', matrix.directorio, matrix.ruta) }}",
          '',
        ].join('\n'),
      );
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          check-latest: true')))).toBe(true);
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          check-latest: "true"'))), 'la cadena es lo mismo para `setup-node`').toBe(true);
    expect(setupNodeDelConsumidor(conPaso('          # check-latest: true')), 'la muestra no tiene el paso').not.toBeNull();
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          # check-latest: true')))).toBe(false);
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          cache: yarn # check-latest: true')))).toBe(false);
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          check-latest: false')))).toBe(false);
    expect(pideLaUltima(setupNodeDelConsumidor(conPaso('          cache: yarn')))).toBe(false);
  });
});
