import { COMBINACIONES, derivar } from './derivar.ts';

/**
 * De la paleta base a las seis, como texto CSS.
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

export function generar(base: ReadonlyMap<string, string>): string {
  const bloques: string[] = [];
  for (const clave of COMBINACIONES) {
    const paleta = derivar(base, clave);
    const cuerpo = [...paleta]
      .map(([n, v]) => `    --color-${n.slice(2)}: ${v};`)
      .join('\n');
    const [identidad, modo] = clave.split('/');
    const esOscuro = modo === 'oscuro';
    const raiz = identidad === 'institucional' ? ':root' : `[data-tema='${identidad ?? ''}']`;

    if (!esOscuro) {
      const sel = identidad === 'institucional' ? `:root,\n[data-tema='institucional']` : raiz;
      bloques.push(`/* ${clave} */\n${sel} {\n${cuerpo}\n}`);
      continue;
    }
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
   LAS SEIS PALETAS. ARCHIVO GENERADO — no se edita a mano.

   Tres identidades por dos modos. Sale de \`temas/generar.ts\` aplicando las reglas de
   \`temas/derivar.ts\` a la paleta del artboard, y \`temas/contraste.test.ts\` comprueba que
   volver a generarlo da EXACTAMENTE esto. Un valor tocado a mano sale rojo.

   Los dos ejes son independientes a proposito:

       data-tema   institucional | alto-contraste | sepia     <- la identidad, del servicio
       data-modo   claro | oscuro | (ausente = el del sistema) <- la apariencia, de la persona

   El oscuro se escribe dos veces —bajo \`prefers-color-scheme\` y bajo \`[data-modo='oscuro']\`—
   y el primero lleva \`:not([data-modo='claro'])\`: sin eso, quien pide claro en un equipo puesto
   en oscuro no podria salir de ahi.
   ============================================================================ */
`;

// El selector se exporta para que la guarda pueda hablar de el sin repetirlo.
export { selector };
