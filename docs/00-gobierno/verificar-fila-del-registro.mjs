/* Comprueba que un PR que cierra un issue deja su fila en «Verificar antes de afirmar».

   El registro de «Verificar antes de afirmar» es la memoria del proyecto: cada issue
   deja ahi que se implemento y **como se demostro que la verificacion puede fallar**.
   Es lo que impide volver a descubrir el mismo hallazgo de RLS por tercera vez.

   Y no la comprobaba nadie. Al integrar #585 y #618 la fila no se escribio y los dos
   PR pasaron todos sus checks en verde; el hueco se descubrio a mano, leyendo la
   tabla. El modo de fallo es silencioso: la fila que falta no se distingue de la que
   nadie tenia que escribir.

   ## Que exige, y que NO

   Exige que **exista** una fila que nombre el issue. No mira su contenido —que la
   mutacion descrita sea real, que las cifras cuadren— porque eso no lo puede leer una
   maquina, y es justo lo que la revision si puede.

   Y solo lo exige cuando las dos cosas son ciertas:

     1. el cuerpo del PR declara que cierra un issue (`Cierra #N`, `Closes #N`,
        `Fixes #N`, `Resuelve #N`), y
     2. el cambio toca el codigo de produccion del backend, del frontend o de infra.

   Un PR de solo documentacion, de solo pruebas o sin issue asociado pasa en verde. Sin
   ese contraste la guarda seria un peaje que todo el mundo aprende a esquivar — y una
   guarda esquivada no protege nada, que es de donde venimos.

   ## Uso

     node docs/00-gobierno/verificar-fila-del-registro.mjs [--base origin/main]

   El cuerpo del PR sale de `KAMAYUK_CUERPO_DEL_PR`; sin esa variable no hay nada que
   comprobar y la comprobacion pasa, porque fuera de un PR no existe el dato.

   Las tres entradas se pueden dar por archivo —`--cuerpo`, `--archivos`, `--anadido`—,
   y es lo que usa su autoprueba: sin poder alimentarlas, demostrar que muerde exigiria
   fabricar un repositorio, y una comprobacion que no se puede probar es la que este
   issue viene a impedir.

   ## Y que ningun issue tenga dos filas (#128)

   Desde #128 el registro se mezcla solo: `.gitattributes` le pone `merge=union`, porque
   las filas solo se anaden y dos PR que anaden cada uno la suya al final de la tabla
   chocaban SIEMPRE en la misma linea. La union tiene un precio conocido: cuando dos ramas
   EDITAN la misma fila, no hay conflicto — se queda con las dos versiones, una debajo de
   la otra, y no avisa. Asi que esta guarda comprueba ademas, **en cada PR y declare lo que
   declare**, que ningun issue tenga mas de una fila en el registro entero. La fila de un
   issue es la que lo cita en su TITULO —la primera negrita de la primera celda—: las
   filas citan en su texto otros issues a docenas, y contar esas citas daria rojo a todas.
   Y una fila cuyo titulo no cita ningun issue se cuenta por el titulo entero: la revision
   de #128 midio que, contando solo numeros, las dos filas que no llevan ninguno se podian
   duplicar en verde.

   El registro se lee del arbol, o de `--registro` en la autoprueba.
*/

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Lo que hace de un cambio «codigo» a efectos de esta guarda.

    ESTA LISTA ES PROPIA DE ESTE REPOSITORIO Y NO SE COPIA. El guion vive replicado en
    los cinco y lo comun es el MECANISMO —los casos de la autoprueba, `CIERRA`, «exige
    que la fila exista y no lo que diga»—; la lista la decide cada dueno con lo que su
    arbol tiene. Copiarla a ciegas es exactamente lo que produjo el hueco de #45.

    `infrastructure/src/` (#45). El descriptor de despliegue decide que corre en la
    municipalidad: los limites, los `securityContext`, las `NetworkPolicy`, las variables
    de entorno del pod y sus rutas de ingreso. C-17 midio CINCO defectos que vivian ahi y
    que solo se ven al desplegar. Estaba fuera y en los otros tres repositorios dentro:
    este es el unico de los cuatro que tiene los dos directorios a la vez —`infra/` con la
    carga de datos, `infrastructure/` con el descriptor—, que es de donde salio la
    confusion al copiar. Se acota a `src/` a proposito: `infrastructure/verificaciones/`
    son sus pruebas, y una prueba no es codigo de produccion.

    `infra/` SE QUEDA, y no por inercia (#45 AC-2). Son cuatro guiones de carga y cuatro
    CSV, y C-6 midio lo que cuesta uno mal apuntado: un guion lanzado contra la imagen
    equivocada arranca la aplicacion, NO CARGA NI UNA FILA y sale con codigo 0 —cero
    lineas de carga, ni un aviso—, que es la clase de defecto que solo el registro
    impide volver a descubrir. LO QUE CUESTA, contado: de los diez archivos de `infra/`,
    dos son `README.md`, asi que un PR que solo los toque y ademas cierre un issue
    tendra que dejar fila. Se acepta y no se talla una excepcion para dos archivos: esos
    README documentan con que variable se invoca cada cargador —lo que el censo de
    `infrastructure` cruza contra su `@ConditionalOnProperty`— y la guarda solo dispara
    cuando el PR ADEMAS cierra un issue, asi que el exceso esta acotado.

    LO QUE SIGUE FUERA, medido y no supuesto: `despliegue/compose.yaml`, que este
    repositorio tiene desde #44. Es el mismo defecto que `caja`#39 cerro alli con
    `/^despliegue\//`, y aqui NO se cierra porque no es de #45 — queda dicho para que el
    siguiente no tenga que volver a medirlo.

    SE EXPORTA para que su autoprueba pueda exigir que cada patron tenga su muestra. Es
    la mitad que faltaba: quitar una muestra dejaba la autoprueba en «las 7 se comportan
    como deben», en verde. Y se exporta en vez de copiarse alli porque una copia se queda
    vieja sola y entonces la autoprueba certifica una lista que ya no es esta. */
export const RUTAS_DE_CODIGO = [
  // `kamayuk-lib` no tiene backend, ni descriptor, ni interfaz: tiene SEIS PAQUETES, y todo lo
  // que va dentro de ellos es codigo que cuatro sistemas van a consumir. Por eso la lista es una
  // sola entrada y es mas ancha que en los cinco sistemas: aqui no hay `src/` que separar de lo
  // demas, y una guarda que solo mirara `paquetes/*/src/` no miraria nada.
  /^paquetes\/(?!.*\.(?:test|spec)\.tsx?$)/,
];

/**
 * Donde vive la fila. **Es UNA, y ya no es una ventana de compatibilidad** (`infrastructure`#114):
 * el registro se mudo de `CLAUDE.md` a `docs/agent/HISTORY.md` —eran el 91 % de un archivo que
 * cada sesion carga entero— y **los seis repositorios migraron el 2026-09-12**, asi que el
 * estrechado llega en su cambio propio, que es como el primer tiempo dijo que se haria.
 *
 * Lo que cambia con esto: **una fila escrita en `CLAUDE.md` deja de contar**. Mientras los dos
 * sitios estuvieran aqui, un PR podia dejar su fila en el archivo viejo y salir en verde, y la
 * memoria del proyecto se partia en dos sin que nada lo dijera — que es justo lo que la mudanza
 * viene a cerrar.
 *
 * Sigue siendo una lista y no una cadena a proposito: es lo que se le pasa a `git diff -- …`, y
 * el dia que el registro se vuelva a partir —por tamano, por ejemplo— el segundo archivo entra
 * aqui y no hay nada mas que tocar.
 */
const DONDE_VIVE_LA_FILA = ['docs/agent/HISTORY.md'];

/** Como se declara que un PR cierra un issue. GitHub admite estas y alguna mas. */
const CIERRA = /\b(?:cierra|closes?|close|fixes?|fix|resuelve|resolves?)\s+#(\d+)/gi;

// Se ejecuta SOLO cuando se invoca como guion. Importarlo no hace nada, que es lo que
// permite a su autoprueba leer `RUTAS_DE_CODIGO` de aqui en vez de copiarla (#45).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal();
}

function principal() {
  const opciones = leerOpciones(process.argv.slice(2));

  // Antes que nada, y sin mirar el cuerpo: dos filas del mismo issue las deja una mezcla, no el
  // PR que las declara, asi que no se espera a que el PR cierre algo para mirarlas (#128).
  const registro = readFileSync(
    opciones.registro ??
      fileURLToPath(new URL(`../../${DONDE_VIVE_LA_FILA[0]}`, import.meta.url)),
    'utf8',
  );
  const repetidas = filasRepetidas(registro);
  if (repetidas.length > 0) {
    console.error('');
    console.error(
      `FALLO: hay filas repetidas en ${DONDE_VIVE_LA_FILA[0]}: un issue, o un titulo sin issue, ` +
        'con mas de una fila.',
    );
    console.error('');
    for (const { clave, lineas } of repetidas) {
      console.error(`  · ${clave} tiene ${lineas.length} filas: lineas ${lineas.join(', ')}.`);
    }
    console.error('');
    console.error('  El registro es una fila por issue. Dos filas del mismo issue son lo que deja');
    console.error('  `merge=union` cuando dos ramas EDITAN la misma fila: se queda con las dos');
    console.error('  versiones, sin conflicto y sin avisar. Se arregla dejando una —la buena— a mano.');
    console.error('');
    console.error('  La fila de un issue es la que lo cita en su titulo: la primera negrita de la');
    console.error('  primera celda. Citarlo en el texto de otra fila no cuenta. Una fila cuyo');
    console.error('  titulo no cita ningun issue se cuenta por el titulo entero.');
    process.exit(1);
  }

  const cuerpo = opciones.cuerpo
    ? readFileSync(opciones.cuerpo, 'utf8')
    : (process.env.KAMAYUK_CUERPO_DEL_PR ?? '');

  const issues = [...cuerpo.matchAll(CIERRA)].map((coincidencia) => coincidencia[1]);
  if (issues.length === 0) {
    console.log('El PR no declara que cierre ningun issue: no hay fila que exigir.');
    process.exit(0);
  }

  const archivos = opciones.archivos
    ? lineas(readFileSync(opciones.archivos, 'utf8'))
    : lineas(git(['diff', '--name-only', `${opciones.base}...HEAD`]));

  const deCodigo = archivos.filter((ruta) => RUTAS_DE_CODIGO.some((patron) => patron.test(ruta)));
  if (deCodigo.length === 0) {
    console.log(
      `Cierra #${issues.join(', #')} y no toca codigo de produccion: la fila no se exige.`,
    );
    process.exit(0);
  }

  const anadido = opciones.anadido
    ? readFileSync(opciones.anadido, 'utf8')
    : git(['diff', `${opciones.base}...HEAD`, '--', ...DONDE_VIVE_LA_FILA])
        .split('\n')
        .filter((linea) => linea.startsWith('+') && !linea.startsWith('+++'))
        .join('\n');

  const sinFila = issues.filter((numero) => !nombra(anadido, numero));
  if (sinFila.length > 0) {
    console.error('');
    console.error(
      `FALLO: falta la fila de «Verificar antes de afirmar» en ${DONDE_VIVE_LA_FILA[0]}.`,
    );
    console.error('');
    for (const numero of sinFila) {
      console.error(
        `  · Este PR cierra #${numero} y no lo nombra ninguna FILA nueva de ` +
          `${DONDE_VIVE_LA_FILA.join(' ni de ')}.`,
      );
    }
    console.error('');
    console.error('  Esa tabla es la memoria del proyecto: cada issue deja ahi que se');
    console.error('  implemento y COMO SE DEMOSTRO QUE LA VERIFICACION PUEDE FALLAR. Una fila');
    console.error('  que no se escribe es una leccion que el siguiente vuelve a descubrir');
    console.error('  ejecutando.');
    console.error('');
    console.error('  Lo que se comprueba aqui es solo que la fila EXISTA. Que diga la verdad');
    console.error('  —que la mutacion sea real y las cifras cuadren— lo lee la revision.');
    console.error('');
    console.error('  Y tiene que ser una FILA de la tabla —una linea que empiece por «|»—: una');
    console.error('  cabecera o un parrafo que citen el issue no cuentan. Esa era la forma de');
    console.error('  salir en verde sin una sola fila escrita.');
    console.error('');
    console.error(`  Archivos de codigo en este cambio: ${deCodigo.length}`);
    console.error(`    ${deCodigo.slice(0, 5).join('\n    ')}`);
    process.exit(1);
  }

  console.log(`Cada issue que este PR cierra tiene su fila: #${issues.join(', #')}.`);
}

// ---------------------------------------------------------------------------

/**
 * Si ese texto trae una FILA que nombre al issue —como tal y no como parte de otro numero—.
 *
 * **Que sea una fila es la mitad que faltaba, y hasta el 2026-09-12 no estaba.** Bastaba con que
 * `#N` apareciera en cualquier linea anadida, y eso **lo satisface una cabecera o un parrafo**.
 *
 * Lo destaparon TRES carriles a la vez al mudar el registro a `docs/agent/HISTORY.md`
 * (`infrastructure`#114), y este repositorio fue uno de los tres: la cabecera del archivo nuevo
 * citaba el issue que traia la mudanza, asi que la rotura de control —quitar la fila y enmendar
 * el commit— salio **VERDE**, contestando «Cada issue que este PR cierra tiene su fila» con cero
 * filas dentro. Los tres lo rodearon igual: escribiendo una cabecera que no cita su propio issue
 * y anotandolo. Eso es una costumbre, y una costumbre no es una guarda — el dia que alguien
 * escriba en la cabecera «esto se mudo por #N», la guarda vuelve a dar por buena una tabla sin
 * tocar.
 *
 * Asi que la exigencia se escribe donde se puede sostener: **una fila de una tabla de Markdown
 * empieza por `|`**. El `+` del diff se quita antes de mirar, porque lo que llega aqui son las
 * lineas anadidas del cambio.
 */
function nombra(texto, numero) {
  const cita = new RegExp(`#${numero}(?![0-9])`);
  return texto
    .split('\n')
    .map((linea) => linea.replace(/^\+/, '').trim())
    .some((linea) => linea.startsWith('|') && cita.test(linea));
}

/**
 * Las filas que el registro tiene repetidas, con las lineas de cada una (#128).
 *
 * **La fila de un issue es la que lo cita en su TITULO**, y el titulo es la primera negrita de la
 * primera celda: `| **Lo que se hizo (#N).** …`. Medido sobre las cincuenta filas de hoy: cada
 * titulo cita **uno o ningun** issue, y ningun issue sale dos veces. El texto de las filas, en
 * cambio, cita otros issues a docenas —la de #24 cita seis—, asi que contar cualquier `#N` de la
 * fila daria rojo a todas: medido, **38 issues** en rojo sobre el registro de verdad.
 *
 * **Una fila cuyo titulo no cita ningun issue se cuenta por su titulo entero**, y no se salta. Dos
 * de las filas de hoy no llevan numero —la de `subir()` y la del Node del consumidor—, y la
 * revision de #128 midio que, contando solo numeros, la de `subir()` duplicada como la deja
 * `merge=union` salia en verde: la guarda estaba ciega justo para lo que existe para cazar. Si una
 * rama cambiara ademas el titulo, las dos versiones ya no se parecerian en nada que una maquina
 * pueda leer; lo que la union deja cuando dos ramas editan el TEXTO de una fila, si.
 *
 * **Y una fila sin negrita tiene por titulo su primera celda entera.** La guarda de existencia
 * (`nombra`) acepta cualquier fila que cite el issue, negrita o no —su propia muestra, `FILA`, no
 * la lleva—, y una fila que contara para existir y no para repetirse seria una fila que la union
 * duplica sin que nadie avise.
 *
 * Una cita de otro repositorio —`caja`#99, `infrastructure`#114— no es de este: el `#` va pegado a
 * una comilla invertida o a una letra, y no cuenta. El separador de la cabecera no es una fila.
 *
 * @param {string} registro
 * @returns {{ clave: string, lineas: number[] }[]}  `clave` es `#N`, o el titulo entre «».
 */
export function filasRepetidas(registro) {
  /** @type {Map<string, number[]>} */
  const porClave = new Map();
  registro.split('\n').forEach((linea, indice) => {
    const primeraCelda = /^\|((?:\\\||[^|])*)\|/.exec(linea.trim())?.[1];
    if (primeraCelda === undefined || /^[\s:-]*$/.test(primeraCelda)) return;
    const titulo = (/^\s*\*\*(.+?)\*\*/.exec(primeraCelda)?.[1] ?? primeraCelda).trim();
    const citados = new Set(
      [...titulo.matchAll(/(?<![\w`])#(\d+)(?![0-9])/g)].map((cita) => `#${cita[1] ?? ''}`),
    );
    for (const clave of citados.size > 0 ? citados : [`«${titulo}»`]) {
      porClave.set(clave, [...(porClave.get(clave) ?? []), indice + 1]);
    }
  });
  return [...porClave]
    .filter(([, filas]) => filas.length > 1)
    .map(([clave, filas]) => ({ clave, lineas: filas }));
}

function lineas(texto) {
  return texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
}

function git(argumentos) {
  return execFileSync('git', argumentos, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function leerOpciones(argumentos) {
  const opciones = { base: 'origin/main' };
  for (let i = 0; i < argumentos.length; i += 2) {
    const nombre = argumentos[i];
    const valor = argumentos[i + 1];
    if (valor === undefined) {
      throw new Error(`Falta el valor de ${nombre}`);
    }
    if (!['--base', '--cuerpo', '--archivos', '--anadido', '--registro'].includes(nombre)) {
      throw new Error(`Opcion desconocida: ${nombre}`);
    }
    opciones[nombre.slice(2)] = valor;
  }
  return opciones;
}
