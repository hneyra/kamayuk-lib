/* Comprueba que verificar-fila-del-registro.mjs muerde, y que no muerde de mas.

   Una guarda que no puede fallar no protege nada; y una que grita siempre acaba
   esquivada, que en una convencion de proceso es peor todavia — el peaje se aprende a
   rodear y la tabla se queda igual de vacia.

   Asi que se corre la comprobacion contra catorce situaciones fabricadas, ocho que tiene
   que rechazar y seis que tiene que dejar pasar, y se exige que el rechazo **nombre el
   issue**: rechazar por el motivo equivocado seria pasar por casualidad.

   La ultima en llegar es del tercer tiempo de `infrastructure`#114 y fija lo que la mudanza
   del registro destapo en tres repositorios a la vez: **una cabecera o un parrafo que citen
   el issue no valen como fila**. Hasta entonces valian, y con eso un PR podia salir en verde
   con la tabla intacta.

   Las dos ultimas en llegar son de #45 y van EN PAREJA: una toca `infrastructure/src/`
   —el descriptor de despliegue— cerrando un issue sin dejar fila y tiene que salir roja;
   la otra toca `infrastructure/` FUERA de `src/` —su prueba y su README— y tiene que
   seguir pasando. Sin la segunda, «que el descriptor cuente» se podria satisfacer
   declarando que todo cuenta, y una guarda que grita en cada PR se acaba apagando.

   Y las dos que cierran la lista son de #128, y tambien van en pareja. El registro se mezcla con
   `merge=union`, que cuando dos ramas EDITAN la misma fila se queda con las dos sin avisar;
   la primera fabrica ese registro —dos filas con el mismo issue en el titulo— y tiene que
   salir roja aunque el PR no declare nada. La segunda cita ese issue en el TEXTO de otra fila
   y tiene que pasar: las filas citan otros issues a docenas, y una guarda que contara esas
   citas daria rojo a todas. Las nueve de antes no cambian: el registro que se les pasa es uno
   limpio, con una fila.

   Y las tres ultimas son de la revision de #128, que midio dos huecos en esa pareja. Una fila
   cuyo titulo no cita ningun issue —hoy hay dos— se podia duplicar en verde, porque solo se
   contaban numeros: ahora se cuenta por el titulo entero, con su contraste de dos titulos
   distintos que tienen que pasar. Y una fila sin negrita, que para existir cuenta, para
   repetirse no contaba: ahora su titulo es la primera celda.

   Uso: node docs/00-gobierno/verificar-las-muestras-del-registro.mjs
*/

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RUTAS_DE_CODIGO } from './verificar-fila-del-registro.mjs';

const COMPROBACION = fileURLToPath(
  new URL('./verificar-fila-del-registro.mjs', import.meta.url),
);

/** Una fila de la tabla, como la que este mismo PR anade. */
const FILA = '| Lo que se verifico (#711, 3 pruebas) | La rotura | El rojo |';

/** La cabecera del registro, para fabricar uno entero. */
const CABECERA = '| Verificacion | Como se demostro que puede fallar | Resultado |\n|---|---|---|';

/** El registro que se les pasa a las muestras que no traen el suyo: limpio, con una fila. */
const REGISTRO_LIMPIO = `${CABECERA}\n| **Lo que se verifico (#711).** Algo | La rotura | El rojo |\n`;

const CASOS = [
  {
    nombre: 'cierra un issue, toca un paquete y NO deja fila',
    cuerpo: 'Cierra #711.\n\nLo de siempre.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    esperado: 'rojo',
    dice: '#711',
  },
  {
    nombre: 'la fila que anade nombra a OTRO issue',
    cuerpo: 'Closes #711',
    archivos: ['paquetes/shell/BarraGlobal.tsx'],
    anadido: '+| Otra cosa (#712) | … | … |',
    esperado: 'rojo',
    dice: '#711',
  },
  {
    nombre: 'un numero que solo CONTIENE al del issue no cuenta como su fila',
    cuerpo: 'Cierra #71',
    archivos: ['paquetes/api/cliente.ts'],
    anadido: '+| Una fila cualquiera (#711) | … | … |',
    esperado: 'rojo',
    dice: '#71',
  },
  {
    // `infrastructure`#114, tercer tiempo. Hasta el 2026-09-12 `nombra()` buscaba `#N` en
    // CUALQUIER linea anadida, y eso lo satisface una cabecera o un parrafo. Lo destaparon tres
    // carriles a la vez al mudar el registro: la cabecera del archivo nuevo citaba el issue de
    // la mudanza y la rotura de control —quitar la fila— salia VERDE.
    nombre: 'una cabecera o un parrafo que citen el issue NO valen como fila',
    cuerpo: 'Cierra #711.',
    archivos: ['paquetes/formato/formato.ts'],
    anadido: '+# Registro\n+\n+Se mudo aqui por #711, y esto no es una fila.',
    esperado: 'rojo',
    dice: '#711',
  },
  {
    // Aqui una guarda ES el producto: `@kamayuk/verificaciones` es uno de los seis paquetes que
    // los cuatro sistemas consumen. En los cinco sistemas una barrera vive fuera de
    // `RUTAS_DE_CODIGO` y cambiarla no exige fila; en este repositorio cambiarla es cambiar lo
    // que se publica, y si exige.
    nombre: 'cierra un issue, cambia el dato de una guarda y NO deja fila',
    cuerpo: 'Cierra #44.\n\nSe afloja una suposicion.',
    archivos: ['paquetes/verificaciones/suposiciones.ts'],
    anadido: '',
    esperado: 'rojo',
    dice: '#44',
  },
  {
    // El contraste, y es el que impide que la correccion se satisfaga declarando que todo
    // cuenta: una guarda que grita en cada PR se acaba apagando (#437). Una prueba DENTRO de un
    // paquete no es codigo de produccion, igual que `src/test/java` no lo es en los cinco.
    nombre: 'toca solo pruebas dentro de un paquete, y su README, y no exige fila',
    cuerpo: 'Cierra #44.',
    archivos: ['paquetes/api/cliente.test.ts', 'README.md'],
    anadido: '',
    esperado: 'verde',
  },
  {
    nombre: 'cierra un issue, toca un paquete y SI deja su fila',
    cuerpo: 'Cierra #711.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: `+${FILA}`,
    esperado: 'verde',
  },
  {
    nombre: 'cierra un issue y NO toca codigo de produccion',
    cuerpo: 'Cierra #711.',
    archivos: ['docs/00-gobierno/algo.md', 'paquetes/sesion/identidad.test.ts'],
    anadido: '',
    esperado: 'verde',
  },
  {
    nombre: 'toca un paquete y no declara que cierre nada',
    cuerpo: 'Un arreglo suelto, sin issue.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    esperado: 'verde',
  },
  {
    // #128. Lo que deja `merge=union` cuando `main` y la rama editan la MISMA fila: las dos
    // versiones, una debajo de la otra, sin conflicto. Sale roja aunque el PR no declare nada,
    // porque la fila repetida la trae una mezcla y no el PR que la declara.
    nombre: 'el registro tiene dos filas con el mismo issue en el titulo',
    cuerpo: 'Un arreglo suelto, sin issue.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    registro:
      `${CABECERA}\n` +
      '| **Lo que se verifico (#711).** La version de main | La rotura | El rojo |\n' +
      '| **Lo que se verifico (#711).** La version de la rama | La rotura | El rojo |\n',
    esperado: 'rojo',
    dice: '#711 tiene 2 filas',
  },
  {
    // Su contraste. La fila de #712 CITA a #711 en su texto —como la de #24 cita a seis—, y eso
    // no es una segunda fila de #711: una guarda que contara las citas daria rojo a todas.
    nombre: 'una fila que cita otro issue en su texto no es una segunda fila de ese issue',
    cuerpo: 'Cierra #712.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '+| **Lo siguiente (#712).** Sale de #711 | La rotura | El rojo |',
    registro:
      `${CABECERA}\n` +
      '| **Lo que se verifico (#711).** Algo | La rotura | El rojo |\n' +
      '| **Lo siguiente (#712).** Sale de #711 | La rotura | El rojo |\n',
    esperado: 'verde',
  },
  {
    // De la revision de #128: una fila sin issue en el titulo —como la de `subir()`— duplicada
    // por la union. Contando solo numeros, salia verde.
    nombre: 'dos filas sin issue en el titulo, con el mismo titulo',
    cuerpo: 'Un arreglo suelto, sin issue.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    registro:
      `${CABECERA}\n` +
      '| **Lo que se verifico sin issue.** La version de main | La rotura | El rojo |\n' +
      '| **Lo que se verifico sin issue.** La version de la rama | La rotura | El rojo |\n',
    esperado: 'rojo',
    dice: '«Lo que se verifico sin issue.» tiene 2 filas',
  },
  {
    // Su contraste: dos filas sin numero, y distintas, no son la misma fila. Sin esta, contar
    // todas las filas sin numero como una sola saldria rojo en el registro de verdad y aqui no.
    nombre: 'dos filas sin issue en el titulo, con titulos distintos, son dos filas',
    cuerpo: 'Un arreglo suelto, sin issue.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    registro:
      `${CABECERA}\n` +
      '| **Lo que se verifico sin issue.** Algo | La rotura | El rojo |\n' +
      '| **Otra cosa sin issue.** Algo | La rotura | El rojo |\n',
    esperado: 'verde',
  },
  {
    // Y la fila sin negrita, que es la forma de `FILA` de arriba: la guarda de existencia la da
    // por buena, asi que la de repetidas tiene que verla.
    nombre: 'dos filas sin negrita con el mismo issue en la primera celda',
    cuerpo: 'Un arreglo suelto, sin issue.',
    archivos: ['paquetes/ui/Boton.tsx'],
    anadido: '',
    registro:
      `${CABECERA}\n` +
      '| Lo que se verifico (#711, 3 pruebas) | La version de main | El rojo |\n' +
      '| Lo que se verifico (#711, 3 pruebas) | La version de la rama | El rojo |\n',
    esperado: 'rojo',
    dice: '#711 tiene 2 filas',
  },
];

/* Y la direccion que faltaba, que es de #45: TODO patron de `RUTAS_DE_CODIGO` tiene que
   tener al menos una muestra ROJA que lo ejerza.

   Sin ella, quitar una muestra no pone nada rojo: **deja de comprobarse, en verde**.
   Medido con la de `infrastructure/src/` fuera, la autoprueba decia «Las 7 muestras se
   comportan como deben» y salia con 0 — y peor, su contraste seguia ahi certificando que
   `infrastructure/` fuera de `src/` no cuenta, mientras nadie comprobaba que `src/` si.
   Es la leccion de «una regla sin muestra no protege nada» por el eje de las rutas.

   La lista se LEE del guion y no se copia aqui: una copia se queda vieja sola y entonces
   esto certificaria una lista que ya no es la que corre. Y si viniera vacia, lo de abajo
   se cumpliria sobre el conjunto vacio, asi que se dice y se falla. */
if (RUTAS_DE_CODIGO.length === 0) {
  console.error('MAL: `RUTAS_DE_CODIGO` se leyo vacia, asi que esto no mediria nada.');
  process.exit(2);
}

const sinMuestra = RUTAS_DE_CODIGO.filter(
  (patron) =>
    !CASOS.some(
      (caso) => caso.esperado === 'rojo' && caso.archivos.some((ruta) => patron.test(ruta)),
    ),
);
if (sinMuestra.length > 0) {
  console.error('');
  console.error('MAL: hay rutas de codigo de produccion sin muestra que las ejerza.');
  for (const patron of sinMuestra) {
    console.error(`  · ${patron} no lo toca ninguna muestra que espere rojo.`);
  }
  console.error('');
  console.error('  Una ruta sin muestra no falla: DEJA DE COMPROBARSE, en verde. Anade una');
  console.error('  muestra que toque esa ruta cerrando un issue y sin dejar fila.');
  console.error('');
  process.exit(1);
}

const carpeta = mkdtempSync(join(tmpdir(), 'sgtm-711-'));
let fallos = 0;

for (const caso of CASOS) {
  const cuerpo = join(carpeta, 'cuerpo.txt');
  const archivos = join(carpeta, 'archivos.txt');
  const anadido = join(carpeta, 'anadido.txt');
  const registro = join(carpeta, 'registro.md');
  writeFileSync(cuerpo, caso.cuerpo);
  writeFileSync(archivos, caso.archivos.join('\n'));
  writeFileSync(anadido, caso.anadido);
  writeFileSync(registro, caso.registro ?? REGISTRO_LIMPIO);

  let salida = '';
  let codigo = 0;
  try {
    salida = execFileSync(
      'node',
      [
        COMPROBACION,
        '--cuerpo',
        cuerpo,
        '--archivos',
        archivos,
        '--anadido',
        anadido,
        '--registro',
        registro,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (fallo) {
    codigo = fallo.status ?? -1;
    salida = `${fallo.stdout ?? ''}${fallo.stderr ?? ''}`;
  }

  const fueRojo = codigo !== 0;
  const esperabaRojo = caso.esperado === 'rojo';
  if (fueRojo !== esperabaRojo) {
    console.error(`MAL: «${caso.nombre}» esperaba ${caso.esperado} y salio lo contrario.`);
    console.error(salida.trim());
    fallos++;
    continue;
  }
  if (esperabaRojo && !salida.includes(caso.dice)) {
    console.error(`MAL: «${caso.nombre}» se puso rojo sin nombrar ${caso.dice}.`);
    console.error(salida.trim());
    fallos++;
    continue;
  }
  console.log(`OK (${caso.esperado}): ${caso.nombre}`);
}

if (fallos > 0) {
  console.error(`\nFALLO: ${fallos} de ${CASOS.length} muestras no se comportan como deben.`);
  process.exit(1);
}
console.log(
  `\nLas ${CASOS.length} muestras se comportan como deben, y las ` +
    `${RUTAS_DE_CODIGO.length} rutas`,
);
console.log('declaradas como codigo de produccion tienen quien las ejerza.');
