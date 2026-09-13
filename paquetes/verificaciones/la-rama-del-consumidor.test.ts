// @vitest-environment node
//
// Lee el workflow del disco y llama al resolvedor. No es un DOM lo que necesita, y **no toca la
// red**: la comprobacion de que una rama existe de verdad vive en
// `ensayar-la-rama-del-consumidor.mjs`, que corre contra un remoto y por eso no puede ser una
// prueba de este archivo.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CLAVE, leerLasMenciones, resolverLaRama } from './rama-del-consumidor.mjs';

/**
 * **La CI mide la rama del consumidor que el PR nombra** (#26).
 *
 * <h2>El hueco</h2>
 *
 * El trabajo de #10 clona la rama por omision del consumidor, y con eso un cambio de esta libreria
 * que exija un ajuste alla **no puede salir verde nunca**: aqui se mide contra un consumidor sin el
 * ajuste y alla contra una libreria sin el cambio. El precedente esta medido del otro lado:
 * `expected 44 to be 42` en `rentas` cuando el `@theme` paso de `--radius-radio` a `--radius` (#8).
 *
 * <h2>Por que la logica NO vive en el `yaml`</h2>
 *
 * Porque un `yaml` no se puede probar, y asi es como se llego al hueco: el trabajo de #10 tiene su
 * decision escrita en un `run:` de quince lineas, y lo unico que se puede afirmar de el desde una
 * prueba es que ciertas cadenas aparecen. El parser del cuerpo y la resolucion por consumidor son
 * **dato y funcion**, viven en `rama-del-consumidor.mjs`, y aqui se les pasan las muestras que las
 * violan — que es la regla de la casa: una regla que no puede fallar no protege nada.
 *
 * Lo que sigue siendo cadena en el `yaml` —que el paso exista, que le pase el cuerpo, que el
 * `checkout` use lo resuelto— se afirma abajo igual que `los-consumidores-se-miran.test.ts` afirma
 * lo suyo, porque de eso no hay otra forma.
 */

const WORKFLOW = '.github/workflows/paquetes.yml';

/**
 * Lo que el workflow CORRE, sin lo que el workflow CUENTA.
 *
 * Y esto no es celo: **la primera version de estas afirmaciones salia verde con la rotura puesta**.
 * Quitado `--comprobar` de la orden, `toContain('--comprobar')` seguia pasando porque el comentario
 * que explica el AC3 nombra la opcion. Es la misma forma de defecto que `infrastructure`#114 midio
 * en la guarda del registro —una cabecera que cita el issue no es una fila— aplicada a un `yaml`:
 * un comentario que nombra una opcion no la ejecuta.
 *
 * Se quitan solo las lineas que EMPIEZAN por `#`: un `#10` dentro de un `echo` es texto que corre.
 * Y los espacios se colapsan porque las ordenes van en escalares plegados, o sea repartidas en
 * varias lineas que al ejecutarse son una.
 */
const workflow = readFileSync(WORKFLOW, 'utf8')
  .split('\n')
  .filter((linea) => !linea.trim().startsWith('#'))
  .join('\n');

/** Lo mismo en una sola linea, para poder exigir una orden entera. */
const ordenes = workflow.replace(/\s+/g, ' ');

/** Los declarados, como los trae `consumidores.json`. Dos, para poder distinguirlos. */
const DECLARADOS = [{ repositorio: 'hneyra/rentas' }, { repositorio: 'hneyra/catastro' }] as const;

function resolver(cuerpo: string, consumidor = 'hneyra/rentas') {
  return resolverLaRama({ cuerpo, consumidores: DECLARADOS, consumidor });
}

/** Las claves de los problemas, que es lo que se afirma: el texto se lee, las claves se comparan. */
function claves(cuerpo: string, consumidor = 'hneyra/rentas'): string[] {
  return resolver(cuerpo, consumidor).problemas.map((p) => p.clave);
}

describe('la rama del consumidor sale del cuerpo del PR', () => {
  it('EL CENTINELA: la mencion canonica se lee, con su consumidor y su rama', () => {
    // Sin esto, un parser que no encontrara NADA dejaria en verde a casi todo lo de abajo: «no
    // nombra rama» es la respuesta correcta para la mayoria de las muestras.
    const resuelta = resolver(`Arregla cosas.\n\n${CLAVE}: hneyra/rentas@la-rama-que-lo-arregla\n`);
    expect(resuelta.nombrada).toBe(true);
    expect(resuelta.rama).toBe('la-rama-que-lo-arregla');
    expect(resuelta.problemas).toEqual([]);
  });

  it('sin mencion ninguna, la rama sale vacia: la rama por omision (AC2)', () => {
    // El caso normal, que es el que NO puede cambiar. La cadena vacia es lo que `actions/checkout`
    // lee como «la rama por omision del repositorio», y por eso el resuelto es una cadena y no
    // `main`: el consumidor puede llamar a la suya de otra forma.
    const resuelta = resolver('Un cambio que no necesita nada de nadie.\n\nCloses #26');
    expect(resuelta.nombrada).toBe(false);
    expect(resuelta.rama).toBe('');
    expect(resuelta.problemas).toEqual([]);
  });

  it('un consumidor que no esta declarado es ROJO, no un silencio (la muestra que importa)', () => {
    // Es el falso verde que este mecanismo tiene que evitar: con una errata ignorada, el PR cree
    // haberse medido contra el ajuste y se midio contra la rama de siempre. Y rompe a TODOS los
    // casos de la matriz, no solo al mal nombrado, porque se lee el cuerpo entero.
    const cuerpo = `${CLAVE}: hneyra/rentass@la-rama-que-lo-arregla`;
    expect(claves(cuerpo)).toEqual(['consumidor-desconocido']);
    expect(claves(cuerpo, 'hneyra/catastro')).toEqual(['consumidor-desconocido']);
    expect(resolver(cuerpo).problemas[0]?.detalle).toContain('hneyra/rentas, hneyra/catastro');
  });

  it('una mencion mal formada es ROJA, y no «no nombra ninguna»', () => {
    // Sin rama —`consumidor: hneyra/rentas`— es la errata mas facil de cometer, y la que mas
    // barato sale ignorar: cae en «no nombra rama» y el PR se mide contra la de siempre.
    expect(claves(`${CLAVE}: hneyra/rentas`)).toEqual(['mencion-mal-formada']);
    expect(claves(`${CLAVE}: hneyra/rentas@`)).toEqual(['mencion-mal-formada']);
    expect(claves(`${CLAVE}: rentas@una-rama`)).toEqual(['mencion-mal-formada']);
    expect(claves(`${CLAVE}: hneyra/rentas@una rama con espacios`)).toEqual(['mencion-mal-formada']);
  });

  it('una rama con forma que git no admite se dice como tal', () => {
    // `git ls-remote` con un nombre imposible vuelve como «no existe», que es el mismo rojo por
    // otro motivo. Decir cual es la diferencia entre corregir una errata y buscar una rama.
    expect(claves(`${CLAVE}: hneyra/rentas@dos..puntos`)).toEqual(['rama-con-forma-imposible']);
    expect(claves(`${CLAVE}: hneyra/rentas@arreglo/`)).toEqual(['rama-con-forma-imposible']);
    expect(claves(`${CLAVE}: hneyra/rentas@lo~otro`)).toEqual(['rama-con-forma-imposible']);
  });

  it('el mismo consumidor nombrado dos veces es ROJO, aunque las dos digan lo mismo', () => {
    // Cual de las dos es la vigente no se puede adivinar, y adivinarlo bien por casualidad es
    // peor que pararse: la segunda linea suele ser un resto de una edicion anterior.
    const dos = `${CLAVE}: hneyra/rentas@una\n${CLAVE}: hneyra/rentas@otra`;
    expect(claves(dos)).toEqual(['mencion-repetida']);
    const iguales = `${CLAVE}: hneyra/rentas@una\n${CLAVE}: hneyra/rentas@una`;
    expect(claves(iguales)).toEqual(['mencion-repetida']);
  });

  it('varios consumidores a la vez, cada uno con la suya', () => {
    const cuerpo = [
      'Este cambio necesita ajuste en los dos.',
      '',
      `${CLAVE}: hneyra/rentas@la-de-rentas`,
      `${CLAVE}: hneyra/catastro@la-de-catastro`,
    ].join('\n');
    expect(resolver(cuerpo, 'hneyra/rentas').rama).toBe('la-de-rentas');
    expect(resolver(cuerpo, 'hneyra/catastro').rama).toBe('la-de-catastro');
    expect(claves(cuerpo)).toEqual([]);
  });

  it('la clave y el repositorio no distinguen mayusculas; LA RAMA SI', () => {
    // GitHub resuelve `HNeyra/Rentas` igual que `hneyra/rentas`, y quien escribe el cuerpo escribe
    // lo que le sale. Una referencia de git NO: `Arreglo` y `arreglo` son dos ramas distintas, y
    // «corregir» la caja de la rama mediria otra cosa sin decirlo.
    const resuelta = resolver('  Consumidor:  HNeyra/Rentas@Arreglo-De-La-Paleta  ');
    expect(resuelta.nombrada).toBe(true);
    expect(resuelta.rama).toBe('Arreglo-De-La-Paleta');
    expect(resuelta.problemas).toEqual([]);
  });

  it('la vineta y el `codigo` de Markdown alrededor no cambian lo que dice', () => {
    expect(resolver(`- \`${CLAVE}: hneyra/rentas@la-rama\``).rama).toBe('la-rama');
    expect(resolver(`* **${CLAVE}: hneyra/rentas@la-rama**`).rama).toBe('la-rama');
    // Y el subrayado NO se quita: es legal en un nombre de rama, y quitarlo mediria otra.
    expect(resolver(`${CLAVE}: hneyra/rentas@rama_con_guion_bajo`).rama).toBe(
      'rama_con_guion_bajo',
    );
  });

  it('dentro de un bloque de codigo NO cuenta, y se ANUNCIA (por que hay dos reglas y no una)', () => {
    // Esto no es una hipotesis: **el PR que trae este mecanismo ensena la sintaxis en su cuerpo**,
    // dentro de una valla. Si un ejemplo contara, ese PR exigiria una rama que nadie ha creado.
    const cuerpo = ['Se escribe asi:', '', '```', `${CLAVE}: hneyra/rentas@la-rama-que-lo-arregla`, '```'].join(
      '\n',
    );
    const resuelta = resolver(cuerpo);
    expect(resuelta.nombrada).toBe(false);
    expect(resuelta.problemas).toEqual([]);
    // Y lo descartado se anuncia: sin esto, la unica diferencia entre «no lo nombraste» y «lo
    // nombraste donde no cuenta» seria el silencio, que es el modo de fallo de siempre.
    expect(resuelta.descartadas).toHaveLength(1);
    expect(resuelta.descartadas[0]?.motivo).toContain('bloque de codigo');
  });

  it('dentro de una cita tampoco, y tambien se anuncia', () => {
    // Una cita es palabra de otro —el issue, un comentario de revision—; el cuerpo del PR habla en
    // primera persona. Un PR que pegue el issue entero no queda atado a lo que el issue propuso.
    const resuelta = resolver(`> ${CLAVE}: hneyra/rentas@la-del-issue`);
    expect(resuelta.nombrada).toBe(false);
    expect(resuelta.descartadas[0]?.motivo).toContain('cita');
  });

  it('y la palabra en prosa no es una instruccion', () => {
    // Anclada a los dos extremos: la linea es la mencion, o no lo es.
    const enProsa = `Se escribe la linea «${CLAVE}: hneyra/rentas@la-rama» en el cuerpo del PR.`;
    const resuelta = resolver(enProsa);
    expect(resuelta.nombrada).toBe(false);
    expect(resuelta.problemas).toEqual([]);
    expect(resuelta.descartadas).toEqual([]);
  });

  it('LA MUESTRA DEL PARSER: lee de una vez todo lo que un cuerpo de verdad trae mezclado', () => {
    const cuerpo = [
      '## Que hace',
      '',
      `> ${CLAVE}: hneyra/nadie@la-que-proponia-el-issue`,
      '',
      'La sintaxis es esta:',
      '',
      '```',
      `${CLAVE}: hneyra/catastro@un-ejemplo`,
      '```',
      '',
      `- \`${CLAVE}: hneyra/rentas@ui-26-la-paleta\``,
      '',
      'Closes #26',
    ].join('\n');
    const lectura = leerLasMenciones(cuerpo);
    expect(lectura.menciones).toEqual([
      { repositorio: 'hneyra/rentas', rama: 'ui-26-la-paleta', linea: 11 },
    ]);
    // Y las dos descartadas no dejan ni un problema detras, aunque una nombre un consumidor que no
    // existe: lo que no cuenta como mencion no cuenta tampoco para romper.
    expect(lectura.problemas).toEqual([]);
    expect(lectura.descartadas.map((d) => d.linea)).toEqual([3, 8]);
  });
});

describe('y el workflow lo usa de verdad', () => {
  it('resuelve la rama con el guion, y no con logica escrita en el `yaml`', () => {
    expect(ordenes, 'el workflow no llama al resolvedor').toContain(
      'node paquetes/verificaciones/rama-del-consumidor.mjs',
    );
    expect(workflow, 'el resolvedor no recibe el cuerpo del PR').toContain(
      'KAMAYUK_CUERPO_DEL_PR',
    );
    expect(workflow, 'el cuerpo no sale del evento del PR').toContain(
      'github.event.pull_request.body',
    );
  });

  it('COMPRUEBA que la rama existe, que es el AC3', () => {
    // Sin `--comprobar`, una rama mal escrita se le pasa a `actions/checkout` y el rojo que sale
    // es el suyo, en otro paso y con otras palabras. Se exige la ORDEN ENTERA: la opcion suelta la
    // nombra tambien el comentario de al lado, y con eso la rotura de control salia verde.
    expect(ordenes, 'el resolvedor no comprueba la existencia de la rama').toContain(
      'rama-del-consumidor.mjs --consumidor "$QUIEN" --comprobar',
    );
    expect(workflow, 'el resolvedor no tiene con que preguntar').toContain('KAMAYUK_TOKEN_DE_CLON');
  });

  it('el clon del consumidor usa lo resuelto, y no una rama escrita a mano', () => {
    expect(workflow, 'el `checkout` del consumidor no usa la rama resuelta').toMatch(
      /ref:\s*\$\{\{\s*steps\.\w+\.outputs\.rama\s*\}\}/,
    );
  });

  it('el veredicto tiene los DOS caminos, y el de la rama nombrada bloquea', () => {
    // Con rama nombrada, la linea base puede estar legitimamente roja —la rama del consumidor trae
    // el ajuste que espera el cambio de aqui—, asi que «los dos rojos» deja de significar «no es
    // de esta rama». Lo que manda es la rama nombrada: si sale roja, bloquea.
    expect(workflow, 'el veredicto no distingue si hay rama nombrada').toContain(
      'RAMA_DEL_CONSUMIDOR',
    );
    expect(workflow, 'no hay rojo propio del camino con rama nombrada').toMatch(/NO CIERRA CON/);
    // Y el camino de siempre sigue entero, que es el AC2 visto desde el veredicto.
    expect(workflow, 'se perdio el rojo del camino de siempre').toMatch(/ESTA RAMA ROMPE A/);
  });

  it('y el ensayo contra un remoto de verdad corre en CI', () => {
    // Una costumbre no es una guarda (#19). El ensayo es lo unico que demuestra el AC3 de punta a
    // punta —una rama que no existe sale roja diciendolo—, y por eso tiene su paso.
    expect(ordenes, 'el ensayo de la resolucion no corre en CI').toContain(
      'node paquetes/verificaciones/ensayar-la-rama-del-consumidor.mjs',
    );
  });
});
