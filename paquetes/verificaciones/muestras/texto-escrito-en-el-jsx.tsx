/**
 * LA MUESTRA de las dos formas JSX que `el-texto-visible-es-dato` no veia: **una palabra en una
 * `prop` de texto, y una palabra entre llaves** (#53).
 *
 * Es el mando de los temas de `rentas` —`frontend/src/preferencias/MandoDeTema.tsx`— con sus `t()`
 * quitados, y viola las dos formas A PROPOSITO. **Ninguna de las formas de antes lo ve**, medido en
 * #53 con aquel detector sobre la pieza sin `t()`: cero hallazgos para sus trece palabras.
 *
 * · `rotulo="Identidad visual"` es un atributo JSX, pero `rotulo` no es un atributo ANUNCIADO —no lo
 *   lee el navegador—: es una `prop` de texto, y lo que lleva acaba en un `legend`.
 * · `{'Preferencias'}` es una expresion y no un `JsxText`, aunque se dibuje igual.
 *
 * Cada forma va con y sin llaves, y con una plantilla sin huecos: las tres escrituras dejan la misma
 * palabra en la pantalla. Su pareja, `texto-del-jsx-que-sale-del-saco.tsx`, es el MISMO mando hecho
 * bien.
 *
 * Fuera de `tsc`, de ESLint y de `vitest`, como todas las muestras: la guarda lo lee con el
 * analizador de TypeScript, igual que leeria el codigo de produccion. Si alguien «arregla» este
 * archivo, la guarda se queda sin demostracion y sale roja sola.
 */

declare function Eje(props: { readonly rotulo: string; readonly nota: string }): null;
declare function TituloDelCajon(props: { readonly children: string }): null;

export function MandoConLasPalabrasDentro() {
  return (
    <>
      {/* (1) Una `prop` de texto con un literal. */}
      <Eje rotulo="Identidad visual" nota="La paleta con que se dibuja este servicio." />
      {/* (2) La misma forma entre llaves, y como plantilla sin huecos. */}
      <Eje rotulo={'Apariencia'} nota={`Sin elegir, se sigue lo que el equipo tenga puesto.`} />
      {/* (3) Una palabra como hijo, entre llaves. */}
      <TituloDelCajon>{'Preferencias'}</TituloDelCajon>
      {/* (4) Y como plantilla sin huecos. */}
      <span>{`El del sistema`}</span>
    </>
  );
}
