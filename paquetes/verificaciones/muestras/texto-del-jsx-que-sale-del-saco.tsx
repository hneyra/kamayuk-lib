/**
 * LA OTRA MITAD de la muestra de las dos formas JSX de #53: **el mismo mando, hecho bien**.
 *
 * Es `texto-escrito-en-el-jsx.tsx` con las palabras fuera: entran por el saco y aqui solo se
 * referencian. La guarda tiene que dar **cero hallazgos** sobre este archivo.
 *
 * Su papel es el que una muestra sola no puede cumplir: una forma que denunciara todo atributo
 * literal pasaria la prueba de «muerde» y seria inservible —el mando esta lleno de ellos: `lado`,
 * `className`, `data-slot`, `type`, `name`—. Aqui se comprueba que tambien **sabe callarse**, sobre
 * lo que de verdad hay alrededor de una palabra: literales sin letras entre llaves, una `prop` de
 * texto vacia y atributos que no son de texto.
 *
 * Fuera de `tsc`, de ESLint y de `vitest`, como todas las muestras.
 */

interface ElSaco {
  readonly titulo: string;
  readonly ejeDeLaIdentidad: string;
  readonly notaDeLaIdentidad: string;
  readonly elDelSistema: string;
}

declare function Eje(props: { readonly rotulo: string; readonly nota: string }): null;
declare function TituloDelCajon(props: { readonly children: string }): null;
declare function PanelDelCajon(props: { readonly lado: string; readonly className: string }): null;

export function MandoConLasPalabrasDelSaco({ textos, grupo }: { readonly textos: ElSaco; readonly grupo: string }) {
  return (
    <>
      {/* La `prop` de texto, desde el saco. */}
      <Eje rotulo={textos.ejeDeLaIdentidad} nota={textos.notaDeLaIdentidad} />
      {/* Y el hijo, desde el saco. */}
      <TituloDelCajon>{textos.titulo}</TituloDelCajon>
      <span>{textos.elDelSistema}</span>
      {/* Lo que NO es una palabra aunque vaya entre llaves o en un atributo: un espacio, un
          separador, una `prop` de texto vacia y los atributos que no son de texto. */}
      <span>{' '}</span>
      <span>{'·'}</span>
      <Eje rotulo="" nota={``} />
      <PanelDelCajon lado="derecha" className="w-[min(360px,92vw)]" />
      <div data-slot="mando-de-tema" />
      <input type="radio" name={grupo} value="sistema" className="size-4 shrink-0 accent-azul" />
    </>
  );
}
