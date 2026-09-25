# `@kamayuk/shell`

El armazón de V8: barra global, carril de módulos plegable con filtro, paleta de mando
(`Ctrl/Cmd+K`), cabecera con miga, acciones al pie y el aviso de cambios sin guardar.

## El catálogo y el enrutado

**El catálogo de módulos y destinos entra por parámetro**; el enrutado es por hash con
`createHashRouter`, con **una sola ruta** y el destino resuelto en el render, y el enrutador **se
construye una vez** —el catálogo sale de la red y cambia después de montar—: lo que el catálogo no
trae no se ofrece en el árbol, ni en la paleta, ni en la miga, **ni por el hash**.

## El estado de una hoja vive en la ruta

`#/<slug>/<sujeto>?<parametro>=<valor>`, y sólo lo que `Destino.enLaRuta` declara —lo demás se
ignora con aviso y la hoja se abre igual—; `#/<slug>` a secas sigue siendo la forma de las 40 hojas
de `rentas`.

**Toda dirección que el marco escribe pasa por `ubicacionDe`** —el árbol, la paleta, `ir` y
`moverLaRuta`—, y `leerLaRuta` lee lo que ella escribe.

`useHoja()` da `{ ruta, moverLaRuta, marco }` y, desde #86, `tecleado` y `alTeclear`: **lo tecleado
de cada hoja vive en el marco junto a `sucias` y con su misma clave** —el destino—, `limpiar` borra
las dos cosas y dejar una hoja que no está sucia la olvida, así que el árbol dice «SIN GUARDAR» si y
sólo si lo tecleado espera al volver. `useNavegacion()` da `{ ofrece, ir }` sobre el mismo índice
del catálogo y el mismo `irA` que el árbol.

La pantalla lleva `key` **por destino**, no por ruta: cambiar de sujeto o de pestaña no la desmonta.

## Por dentro: `Cascara` compone y nada más

Desde #119 cada trabajo del marco vive en su hook interno, y ninguno se exporta: `useCarril` y
`usePaleta` (`paleta-y-carril.ts`), `useRegistroDeHojas` (`registro-de-hojas.ts`: `sucias` y lo
tecleado en un **reductor puro**, `cambiarElRegistro`, con sus pruebas sin DOM),
`useNavegacionGuardada` (`navegacion-guardada.ts`: `irA`, lo pendiente y las tres salidas del aviso
en un solo `resolver`) y `useHojaAbierta` con `useRutaDeLaHoja` (`hoja-abierta.ts`). `Cascara` queda
en la maquetación, y `la-cascara-solo-compone.test.ts` la mide: como mucho 150 líneas y 8 hooks.

## Dos cosas que no se tocan

- El marco **no decide permisos**: `Destino` lleva `acceso`/`tambien` y `accesosDe` los da, pero
  filtrar es del sistema, antes de pasarle el catálogo; el paquete no importa `@kamayuk/sesion`, no
  importa `@kamayuk/api` y no llama a `fetch`, y lo vigila `el-marco-no-decide-permisos`.
- **Tampoco escribe una palabra**: las **32** suyas entran por `<Armazon textos={…} />`, un
  `Partial` con el castellano por omisión y **sin ninguna `peerDependency` nueva** —`i18next`
  obligaría a los cuatro sistemas a montarlo antes de dibujar un botón—.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
