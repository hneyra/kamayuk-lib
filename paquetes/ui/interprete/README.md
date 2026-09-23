# El intérprete de pantallas (`@kamayuk/ui`)

Dibuja una hoja entera como **dato**. Vive dentro de `@kamayuk/ui` y sale por su índice; sus pruebas
cuentan en las de ese paquete.

## Las piezas

`bloques` admite el bloque —cabecera, nota, rejilla de campos y sus tablas, con `acciones` que abren
un acto, van a otra hoja o hacen una operación—, el `aviso`, el `pie` de operaciones, la pieza
`delConsumidor` cuya `clave` se busca en `<Pantalla piezas>`, el `acto` —un formulario con la
**observación obligatoria en el tipo** (regla 10)—, el `maestroDetalle` —un `listbox` cuya elección
**no sigue al foco**, porque cada flecha sería una lectura del detalle— y las `pestanas` —`tablist`
con tabulador itinerante, del que **sólo se monta la abierta**—.

Toda pieza salvo el pie declara `lectura` (`en-espera`, `pidiendo`, `fallo` con el peldaño **ya
resuelto** por el sistema, `con-datos`), `cuando` y `fallosDe`; los textos pueden llevar un dato
dentro (`plantilla`, `desde`, `segun`).

Las piezas anidadas se numeran **en anchura**, así que las de primer nivel conservan su índice para
`filas`, `valores` y `conteos` (`indicesDeLasPiezas`). **`cabeceraFija` sólo se mira en el primer
nivel**: una tabla con la cabecera fija dentro de una pestaña o del detalle de un maestro no hace
que la hoja ceda el alto.

## Los campos y las tablas del bloque

**Los campos son siete tipos** —`tipoDe` pela la marca de ancho y **revienta** ante un octavo,
porque dibujarlo sería un campo de menos sin ningún aviso—, y llevan `marcador`, `ayuda`, `opciones`
con rótulo propio e `insignia`.

**Un bloque tiene su tabla y además `tablas`**, cada una con `clave`, que toma sus filas de
`datos.tablas` **por nombre** —una sin `clave` las toma del bloque por su índice—; una fila es
`{ celdas, datos? }`, y sus `datos` son lo que leen las reglas: el tono de una insignia, el detalle
de la fila y las acciones que ofrece.

**Sin dato, `[]` y con filas son TRES cosas**: la ausencia —no se pudo pedir, y se dice por qué—, la
lectura que contestó una lista vacía —que dice el `vacio` de la definición, y sin él un aviso del
saco: nunca una tabla muda— y las filas con su conteo; **no se escribe un conteo que el sistema no
haya dado**, porque «0 registros» sobre una lista vacía repite con un número lo que la frase ya
dice, y sobre una que nadie pidió afirma que está vacía sin saberlo.

Las acciones de una fila van en un `role="group"` **con nombre** —tres «Descartar» seguidos no se
pueden decir en voz alta sin decir de qué fila es cada uno— y, cuando la fila no ofrece ninguna,
**«sin acciones» es texto y no un botón apagado**.

**Tres reglas puras, aparte de las piezas** (`reglas-de-las-tablas.ts`, por lo mismo que
`componer.ts`):

- `resolverInsignia`, que **nunca mira el texto para decidir el tono** y devuelve `undefined` cuando
  el dato que decide no llegó —pintar `otro` ahí afirmaría un estado que nadie ha leído—;
- `accionesQueOfrece`, que **revienta** si `segun.ofrece` nombra una acción que `acciones` no
  declara;
- y `tablasSinVacio`, con la que cada sistema recorre sus definiciones **sin montar nada** —**las
  anidadas incluidas** desde #110: recorre con `recorrerLasPiezas` y pregunta a `esBloque`, como
  `piezasSinRegistrar`, así que una tabla sin `vacio` dentro de una pestaña, abierta o cerrada, o
  del detalle de un maestro, ya no pasa la guarda—.

«La tabla del bloque y sus `tablas`» se dice **en un solo sitio**, `tablasDe(bloque)`, interno y
fuera del índice; «qué es un bloque», sólo en `esBloque` (#110).

## Cuatro cosas que no se tocan

- Lo impedido sale con **`BotonConMotivo`**: `aria-disabled` y `aria-describedby` hacia el motivo
  visible, **nunca `disabled`**.
- `TextosDelInterprete` **no gana claves** y `DefinicionDePantalla` es genérica con el valor por
  omisión de hoy, porque las dos cosas, medidas, rompen la compilación de `rentas`.
- El árbol, las definiciones y el vocabulario de tonos se quedan en cada sistema, y `traducir`,
  `textos` y `tonoDeLaInsignia` entran por `props`.
- Lo que necesita del marco es una **forma** y no un import —`HojaDelMarco`
  (`{ ruta, marco?, moverLaRuta, marcarSucia?, marcarGuardada?, tecleado?, alTeclear? }`), que
  `useHoja()` cumple y una barrera de tipo vigila con los cuatro de #86 obligatorios—, así
  **`@kamayuk/ui` no importa `@kamayuk/shell`**.

## Lo que se elige en un campo vive en la ruta (#94)

**Un campo puede decir dónde vive en la ruta lo que se elige en él**
(`eleccion: { enLaRuta, cuando? }`, en el que se teclea y en el que elige de una lista): la página y
el orden llegaban a la ruta y **un filtro no**, así que lo tecleado se quedaba en el estado de
`<Pantalla>` sin llegar ni a `nombrados` ni a la barra de direcciones.

**No abre un segundo canal**: desde #67 la ruta ya entra en `nombrados` como `ruta.<clave>`, así que
un campo que escribe en `?descripcion=` lo leen `resolverTexto`, `seCumple` y los `parametros` de
una acción `va` sin publicar el estado interno del intérprete.

Se escribe **al elegir** —un gesto, un movimiento— o **al salir del campo y con Intro** —lo que se
teclea: nunca una dirección por tecla, y el retardo se miró y no entra—, y cambiarlo **devuelve a la
primera página** las tablas de su bloque en un solo `cambiosEn`. Un filtro **no ensucia la hoja**:
no es trabajo sin guardar.

Y desde aquí **una fecha viaja en ISO y se lee `dd/mm/aaaa`** (`shadcn/fecha.ts`), porque
`20/9/2026` no lo parsea ningún backend del producto y ordenado como texto va después de octubre.

## La guarda de `delConsumidor` se escribe con lo que el índice publica (#102)

`esBloque` sale por `@kamayuk/ui` junto a `piezasSinRegistrar`, `resolverTexto` y `seCumple`
—`rentas` lo había copiado—, y `piezasSinRegistrar(definicion, piezas)` pide
**`Readonly<Record<string, unknown>> | undefined`**: el cuerpo sólo pregunta `Object.hasOwn`, y la
firma de antes, `ComponentType<never>`, **no aceptaba un `PiezasDelConsumidor` declarado con su
tipo** por el `defaultProps` de `ComponentClass`. Lo vigila `costuras-del-consumidor.test.tsx`, que
importa por el índice y llama sin `as` —**barrera de `tsc`**, no de vitest—.

**Una serie entra aplanada en `nombrados`, y aplanar es el contrato** (`recaudacion.<i>.<campo>`,
cada valor en texto): `DatoConNombre` no gana un canal para datos que no son texto hasta que el
gráfico suba a bloque del intérprete (#25), para que la API salga de dos usos y no de uno; los
motivos, en su docblock.

## La hoja sucia, lo tecleado, los campos, los actos y la prosa (#86)

Los once huecos, cada uno por un dato OPCIONAL y sin él como antes.

- **La hoja sucia.** `definicion.hoja.suciaAlTeclear` hace que **cada** cambio llame a
  `hoja.marcarSucia()` y que guardar un acto limpie la hoja y vacíe lo tecleado, así que puede
  volver a ensuciarse.
- **Lo tecleado.** `definicion.hoja.conservaLoTecleado: 'soloSiSucia'` —la opción C— sube lo
  tecleado, campos y acto abierto, al marco (`hoja.tecleado`/`alTeclear`, con la forma `LoTecleado`
  de `hoja.ts`), y sobrevive a irse y volver **sólo si la hoja sigue sucia**; la negativa del
  servidor sigue siendo de `datos.lecturas`.
- **Los actos.** Un acto gana `descartar` —un secundario que vacía lo escrito y lo dice en un
  `role="status"`—, `errores: 'trasElPrimerIntento'` —el error de cada obligatorio vacío bajo su
  campo, con `mensajes.obligatorio` o la frase del saco—, y `alTerminar`/`alFallar` —un aviso de
  `avisar()`—.
- **Los bloques y los campos.** Un bloque gana `insignias` fijas y `aLaDerecha: { codigo }`
  **fuera** del `<h2>` de la cabecera; y un campo de solo lectura, su `ayuda`. **«(opcional)» sale
  de `campo.opcional` y ya no de la palabra en la ayuda**: es el único cambio de #86 sin opt-in, y
  es deliberado.
- **La nota con marcas.** `notaConMarcas`, en el bloque y en el acto, que gana a `nota`, es una
  lista de tramos `{ texto }`/`{ codigo }`/`{ fuerte }` que `ProsaConMarcas` dibuja en la misma
  frase con `<code>` y `<strong>`, y **el tramo `codigo` no se traduce**; va en un campo aparte
  porque meterla en `nota` rompe, medido, a quien la lee como `Texto`, y `datosQueLee` —junto a
  `resolverTexto`, publicado— recorre también los tramos. `instruccion` **no** entra: la dibuja el
  armazón y ensancharía el catálogo de los seis sistemas.
- **El filtro local de una tabla.** `tabla.filtroLocal` con `buscador`, `chips` sobre los `datos` de
  la fila, `total` y `sinCoincidencias` acota las filas **que llegaron** (en cliente, antes de
  cortar la página) y **no viaja**: ni a la ruta ni al servidor, y no ensucia; puesto, dice «N de M»
  en un `role="status"` y «· T en total» **sólo si el sistema lo dio**, y si no deja ninguna lo dice
  con su frase y **no con el `vacio`**; la regla es pura (`filtrarLasFilas`, `conteoDelFiltro`).
- **Una cuarta clase de acción, `guarda`.** Pone en un `Blob` el texto de `nombrados` **tal cual**
  —`texto: { desde }`, sin plantilla ni `traducir`— y lo entrega con `entregarAlNavegador` de
  `@kamayuk/api`, el primer import de `ui` hacia `api`, por ruta relativa; si el navegador no
  descarga lo dice `sinDescarga` **antes** de pulsar, y sin el texto el botón sale impedido con su
  motivo.

## La fila de una tabla se elige, y el detalle se dibuja sin elección (#95)

Cada cosa por un dato OPCIONAL y sin él como antes: la `<table>` sin `eleccion` se compara **byte a
byte** con la medida sobre `a8b1902`.

`tabla.eleccion: { enLaRuta, desde }`, hermano de `paginacion.enLaRuta` y `orden.enLaRuta`, escribe
en la ruta **en un solo movimiento** el dato `desde` **de la fila** al pulsarla o con Intro o
Espacio, y la que casa con la ruta sale realzada —fondo y filo, no sólo color— con
`aria-selected="true"`: recargar la conserva, y las demás piezas la leen como `ruta.<enLaRuta>`.

**La `<table>` pasa a `role="grid"`**, porque `aria-selected` en una fila sólo se anuncia dentro de
un `grid` —y es la única conversión de `table` que `jsx-a11y` admite—, con tabulador itinerante
**por filas** y la elección que **no sigue al foco**, como el maestro de #67; los botones de
`accionesPorFila` siguen en el tabulador y **pulsarlos —con el ratón o con Intro— no elige la
fila**; una fila sin el dato **no es elegible** —ni foco, ni clic, ni `aria-selected`—; cambiar de
página o de orden **no borra la elección**, que es otro sitio de la ruta; y sin `hoja` vive en el
estado de la tabla. Regla pura `valorDeLaFila`, publicada con `EleccionDeLaFila`.

`detalle.sinEleccionSeDibuja` hace que el `maestroDetalle` sin elección **dibuje su detalle**
—cabecera, piezas y cada lectura en el estado que el sistema le ponga— con `sinEleccion` encima, en
vez de sustituirlo entero; va en un campo aparte porque la unión en `sinEleccion` rompe, medido, a
quien ya lo lee como `Texto`. Ninguna palabra nueva en ningún saco.

## Las muestras

Un ejemplo por hueco en `interprete/muestras*.ts`, que las pruebas montan uno a uno.

---

Este archivo dice **el estado** del intérprete, y salió de la tabla de
[`CLAUDE.md`](../../../CLAUDE.md) en #128. Por qué cada cosa es como es —lo que se midió, con qué
rotura y qué rojo salió— vive en [`docs/agent/HISTORY.md`](../../../docs/agent/HISTORY.md), una fila
por issue.
