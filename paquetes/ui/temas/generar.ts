import { COMBINACIONES, derivar, fuenteDeLaIdentidad, identidadDe, type Origenes } from './derivar.ts';

/**
 * De las paletas de origen a las ocho combinaciones, como texto CSS.
 *
 * La salida se VERSIONA (`estilos/temas.css`) y una guarda comprueba que volver a generarla da
 * exactamente lo mismo. Sin esa comprobacion, «derivado» seria una palabra: nadie sabria si los
 * valores del archivo salen de estas reglas o de que alguien los toco a mano una tarde.
 */

/** El selector de una combinacion. Ver el javadoc de `temas.css` para el orden. */
function selector(clave: string): string {
  const [identidad, modo] = clave.split('/');
  if (modo === 'claro') {
    return identidad === 'institucional'
      ? `:root,\n[data-tema='institucional']`
      : `[data-tema='${identidad ?? ''}']`;
  }
  // El oscuro se escribe DOS veces: una bajo `prefers-color-scheme` para quien no ha elegido, y
  // otra bajo `[data-modo='oscuro']` para quien si. La primera lleva `:not([data-modo='claro'])`
  // porque elegir «claro» tiene que ganarle al sistema — sin eso, quien pide claro en un equipo
  // en oscuro no puede salir de ahi.
  const base = identidad === 'institucional' ? ':root' : `[data-tema='${identidad ?? ''}']`;
  return (
    `@media (prefers-color-scheme: dark) {\n  ${base}:not([data-modo='claro'])` +
    `\n}\n@@SEPARADOR@@\n${base}[data-modo='oscuro']`
  );
}

/**
 * Lo que el AGENTE DE USUARIO tiene que saber, y que ningun `--color-*` le dice (#33).
 *
 * Los 38 tokens son lo que pinta la hoja; `color-scheme` es lo que pinta el navegador POR SU
 * CUENTA: los controles de formulario sin estilar, la barra de desplazamiento, el resaltado de los
 * menus nativos y el fondo del lienzo antes de que el CSS cargue. Sin esta propiedad la pantalla
 * se oscurece entera menos eso, que se queda blanco — medido en #33.
 *
 * Va DENTRO de cada bloque oscuro, y por eso son ocho sitios y no uno: los dos ejes son
 * independientes, asi que el oscuro llega por dos caminos —el del equipo y el elegido— para cada
 * una de las cuatro identidades. Una sola declaracion suelta no podria decir «oscuro» solo cuando
 * toca, que es justo lo que el `color-scheme: light` de `estilos.css` hace mal por sitio.
 */
const ESQUEMA_OSCURO = '    color-scheme: dark;';

/**
 * La fuente de una identidad, como declaracion, o nada si su origen no declara ninguna (#56).
 *
 * Va SOLO en el bloque claro, y basta: `[data-tema='clasico']` casa con el documento en los dos
 * modos —el oscuro solo le suma `data-modo` o `prefers-color-scheme`—, asi que la fuente llega a
 * los tres caminos sin escribirse tres veces. Y las identidades cuyo origen no la declara no
 * emiten nada: sus bloques salen byte a byte como antes de que esto existiera.
 */
function declaracionDeLaFuente(origenes: Origenes, clave: string): string {
  const fuente = fuenteDeLaIdentidad(origenes, identidadDe(clave));
  return fuente === null ? '' : `\n    --font-sans: ${fuente};`;
}

export function generar(origenes: Origenes): string {
  const bloques: string[] = [];
  for (const clave of COMBINACIONES) {
    const paleta = derivar(origenes, clave);
    const colores = [...paleta]
      .map(([n, v]) => `    --color-${n.slice(2)}: ${v};`)
      .join('\n');
    const [identidad, modo] = clave.split('/');
    const esOscuro = modo === 'oscuro';
    const raiz = identidad === 'institucional' ? ':root' : `[data-tema='${identidad ?? ''}']`;

    if (!esOscuro) {
      // El claro NO declara `color-scheme`: el `:root` de `estilos.css` ya dice `light`, que es el
      // valor por omision y el que el artboard declara. Repetirlo aqui seria una segunda fuente.
      const sel = identidad === 'institucional' ? `:root,\n[data-tema='institucional']` : raiz;
      bloques.push(`/* ${clave} */\n${sel} {\n${colores}${declaracionDeLaFuente(origenes, clave)}\n}`);
      continue;
    }
    const cuerpo = `${ESQUEMA_OSCURO}\n${colores}`;
    bloques.push(
      `/* ${clave} — para quien no ha elegido modo */\n@media (prefers-color-scheme: dark) {\n  ${raiz}:not([data-modo='claro']) {\n${cuerpo
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n  }\n}`,
    );
    bloques.push(`/* ${clave} — para quien lo eligio */\n${raiz}[data-modo='oscuro'] {\n${cuerpo}\n}`);
  }
  return `${CABECERA}\n${bloques.join('\n\n')}\n`;
}

const CABECERA = `/* ============================================================================
   LAS OCHO PALETAS. ARCHIVO GENERADO — no se edita a mano.

   Cuatro identidades por dos modos. Sale de \`temas/generar.ts\` aplicando las reglas de
   \`temas/derivar.ts\` a la paleta de origen de cada identidad, y \`temas/temas.test.ts\`
   comprueba que volver a generarlo da EXACTAMENTE esto. Un valor tocado a mano sale rojo.

   Los origenes son dos, y cada identidad sale de uno solo:

       estilos/estilos.css (@theme)   institucional, alto-contraste, sepia
       estilos/clasico.css            clasico

   Los dos ejes son independientes a proposito:

       data-tema   institucional | alto-contraste | sepia | clasico   <- la identidad, del servicio
       data-modo   claro | oscuro | (ausente = el del sistema)        <- la apariencia, de la persona

   El oscuro se escribe dos veces —bajo \`prefers-color-scheme\` y bajo \`[data-modo='oscuro']\`—
   y el primero lleva \`:not([data-modo='claro'])\`: sin eso, quien pide claro en un equipo puesto
   en oscuro no podria salir de ahi.

   Y los CUATRO bloques oscuros —los ocho sitios, contando ese duplicado— declaran ademas
   \`color-scheme: dark\` (#33). Los \`--color-*\` pintan lo que pinta la hoja; \`color-scheme\`
   pinta lo que dibuja el navegador por su cuenta: controles nativos, barra de desplazamiento y
   fondo del lienzo. Sin ella la pantalla se oscurece entera menos eso. El claro no la declara: el
   \`:root\` de \`estilos.css\` ya dice \`light\`, que es el valor por omision.

   La fuente es de la identidad y no del modo: la declara el bloque claro de la identidad cuyo
   origen la trae (\`--font-sans\`), y ese selector casa tambien en oscuro. Las que no la traen
   se quedan con la de Tailwind.
   ============================================================================ */
`;

// El selector se exporta para que la guarda pueda hablar de el sin repetirlo.
export { selector };
