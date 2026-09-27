/**
 * **El veredicto del trabajo `consumidores`** (#115): con la linea base y la medida con esta rama
 * ya hechas, decide si el trabajo de UN consumidor sale verde o rojo, y con que palabras.
 *
 * <h2>Por que es un guion y no un `run:`</h2>
 *
 * Es lo unico entre un PR de esta libreria y el `main` de los sistemas que la enlazan: una rama
 * equivocada aqui es un verde falso para todos, o un rojo falso que acaba ignorandose. Hasta #115
 * era un `if`/`exit` de cuatro caminos, 62 lineas de bash en `paquetes.yml`, y lo unico que se podia
 * afirmar de el desde una prueba es que ciertas frases aparecian: cambiar un `exit 0` por un
 * `exit 1` seguia en verde. Es el mismo hueco que #26 cerro sacando la resolucion de la rama a
 * `rama-del-consumidor.mjs`, y se cierra igual: **la decision es una funcion pura**, con su tabla de
 * ocho casos en `el-veredicto-tiene-su-tabla.test.ts`, y el workflow solo la llama.
 *
 * <h2>Los cuatro caminos</h2>
 *
 *   · **Sin rama nombrada** (#10): lo que para el trabajo es «esta rama lo puso rojo» —base verde y
 *     rama roja—. Si las dos salen rojas, el consumidor ya estaba roto y no es de aqui: se avisa y
 *     se sigue.
 *   · **Con rama nombrada** (#26): la rama del consumidor trae el ajuste que ESPERA el cambio de
 *     aqui, asi que contra la libreria en `main` puede estar legitimamente roja, y «las dos rojas, no
 *     es de aqui» dejaria pasar sin comprobar nada. El contrato es el PAR, y se mide una vez: con
 *     esta rama. Si sale roja, bloquea, este como este la linea base.
 *
 * Un `outcome` que no es `success` cuenta como rojo —`failure`, `cancelled`, `skipped`—, igual que
 * lo contaba el bash.
 *
 * <h2>Las frases</h2>
 *
 * Son las mismas que escribia el bash, letra por letra: las leen las personas que miran la CI, y
 * las `::error::`, `::warning::` y `::notice::` son ordenes de GitHub que las suben al resumen.
 *
 * <h2>Uso</h2>
 *
 *     BASE=success RAMA=failure QUIEN=duenno/sistema RAMA_DEL_CONSUMIDOR= \
 *       node paquetes/verificaciones/veredicto.mjs
 *
 * Lee las cuatro variables de entorno que el paso le pone, escribe las lineas por la salida estandar
 * y sale con el codigo del veredicto. **Una entrada que falta o que no es un `outcome` de GitHub no
 * se decide**: sale con 2 diciendo cual. Es lo que pasaria si se renombrara el `id` de un paso de
 * medida —`steps.<id>.outcome` de un paso que no existe vale la cadena vacia— y el bash lo contaba
 * como rojo: con las dos vacias y sin rama nombrada, «ya estaba rojo» y VERDE.
 */

import { pathToFileURL } from 'node:url';

/** Lo que GitHub pone en `steps.<id>.outcome`. */
export const RESULTADOS = /** @type {const} */ (['success', 'failure', 'cancelled', 'skipped']);

/**
 * @typedef {object} Entrada
 * @property {string} base El `outcome` de la linea base, con la libreria en `main`.
 * @property {string} rama El `outcome` de la medida con esta rama.
 * @property {string} quien El consumidor, `duenno/sistema`.
 * @property {string} ramaDelConsumidor La rama que nombro el PR, o la cadena vacia si no nombro ninguna.
 */

/**
 * @typedef {object} Veredicto
 * @property {0 | 1} codigo Con el que sale el paso: 1 para el trabajo.
 * @property {string[]} lineas Lo que el paso escribe, en orden.
 */

/**
 * El veredicto, sin tocar ni el entorno ni el proceso.
 *
 * @param {Entrada} entrada
 * @returns {Veredicto}
 */
export function veredicto({ base, rama, quien, ramaDelConsumidor }) {
  const lineas = [
    `el consumidor se midio en:     ${ramaDelConsumidor || 'su rama por omision'}`,
    `linea base (libreria en main): ${base}`,
    `con esta rama:                 ${rama}`,
  ];
  const baseVerde = base === 'success';
  const ramaVerde = rama === 'success';

  if (ramaDelConsumidor !== '') {
    const par = `${quien}@${ramaDelConsumidor}`;
    if (ramaVerde) {
      lineas.push(`«${par}» sale en verde con esta rama: el par cierra.`);
      if (!baseVerde) {
        lineas.push(
          `::notice::La linea base salio ROJA, y aqui eso se ESPERA: «${ramaDelConsumidor}» trae el ajuste que este cambio necesita, asi que contra la libreria en «main» tenia que fallar. No es un aviso de nada.`,
        );
      }
      lineas.push(
        '',
        'Las dos mitades se mezclan JUNTAS, y esta CI no lo hace por nadie: lo unico que',
        'dice es que el par cierra. Mezclar primero la del consumidor deja su «main» roto',
        'hasta que se mezcle esta.',
      );
      return { codigo: 0, lineas };
    }
    lineas.push(
      `::error::ESTA RAMA NO CIERRA CON «${par}».`,
      'El PR nombra esa rama del consumidor como la que trae el ajuste que su cambio',
      'necesita, y con las dos puestas la suite sale en ROJO: el par no cierra.',
      '',
      'Y este trabajo bloquea aunque la linea base tambien este roja. Cuando un PR nombra',
      'una rama, LA RAMA NOMBRADA ES EL CONTRATO: «las dos rojas, no es de aqui» valia',
      'cuando las dos median lo mismo, y aqui la rama nombrada esta puesta justo para que',
      'no lo hagan.',
    );
    return { codigo: 1, lineas };
  }

  if (ramaVerde) {
    lineas.push(`«${quien}» sigue en verde con esta rama.`);
    return { codigo: 0, lineas };
  }
  if (!baseVerde) {
    lineas.push(
      `::warning::«${quien}» ya estaba rojo con la libreria en «main». Esta rama NO es la causa,`,
      '::warning::asi que este trabajo no la bloquea. Pero alguien tiene que mirarlo alli.',
      '',
      'Y si ese rojo ES el ajuste que esta rama necesita, el PR lo puede decir con una',
      'linea en su cuerpo —«consumidor: <duenno>/<sistema>@<rama>»— y entonces se mide',
      'contra esa rama en vez de contra la de por omision (#26).',
    );
    return { codigo: 0, lineas };
  }
  lineas.push(
    `::error::ESTA RAMA ROMPE A «${quien}».`,
    'Con la libreria en «main» su suite sale en VERDE; con esta rama, en ROJO.',
    'El registro del paso «Con esta rama» dice que fallo.',
    '',
    'Es lo que kamayuk-lib#10 existe para cazar: con «link:» no hay version que de',
    'margen — lo que se mezcle aqui es lo que ese sistema tiene en el siguiente «git pull».',
    '',
    'Si el arreglo esta en una rama del consumidor, nombrala en el cuerpo del PR',
    '—«consumidor: <duenno>/<sistema>@<rama>»— y esta CI medira contra ella (#26).',
  );
  return { codigo: 1, lineas };
}

/**
 * Lo que le falta al entorno para poder decidir: `BASE` y `RAMA` tienen que ser un `outcome` de
 * GitHub, y `QUIEN` no puede ir vacio. `RAMA_DEL_CONSUMIDOR` vacia es el caso normal.
 *
 * @param {Readonly<Record<string, string | undefined>>} entorno
 * @returns {string[]}
 */
export function loQueFaltaParaDecidir(entorno) {
  const faltas = [];
  for (const clave of ['BASE', 'RAMA']) {
    const valor = entorno[clave];
    if (!RESULTADOS.includes(/** @type {never} */ (valor))) {
      faltas.push(
        `${clave} vale «${valor ?? ''}», que no es un resultado de paso de GitHub (${RESULTADOS.join(', ')})`,
      );
    }
  }
  if (!entorno['QUIEN']) faltas.push('QUIEN va vacio: no se sabe de que consumidor es el veredicto');
  return faltas;
}

// ---------------------------------------------------------------------------

// Se ejecuta SOLO como guion. Importarlo no hace nada, que es lo que deja a su prueba llamar a la
// funcion sin que salga el proceso (el mismo reparto que `rama-del-consumidor.mjs`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal();
}

function principal() {
  const entorno = process.env;
  const faltas = loQueFaltaParaDecidir(entorno);
  if (faltas.length > 0) {
    console.log('::error::EL VEREDICTO NO SE PUEDE DECIDIR con lo que le pasa el paso:');
    for (const falta of faltas) console.log(`  · ${falta}`);
    process.exit(2);
  }
  const { codigo, lineas } = veredicto({
    base: entorno['BASE'] ?? '',
    rama: entorno['RAMA'] ?? '',
    quien: entorno['QUIEN'] ?? '',
    ramaDelConsumidor: entorno['RAMA_DEL_CONSUMIDOR'] ?? '',
  });
  for (const linea of lineas) console.log(linea);
  process.exit(codigo);
}
