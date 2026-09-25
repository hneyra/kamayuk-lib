# `@kamayuk/verificaciones`

Las prohibiciones de ESLint que este repositorio se aplica y los cinco sistemas derivan, las guardas
del árbol, los guiones de la CI y el **arnés del `Request`**. Es el único paquete que no viaja a un
navegador, y por eso `sin-suponer-un-sistema` no lo barre.

## Las prohibiciones de ESLint

- Las **nueve prohibiciones obligatorias**, con sus nueve muestras.
- **Una décima OPCIONAL** con la suya —`cifra-tributaria-literal`, en `PROHIBICIONES_OPCIONALES` y
  `REGLAS_OPCIONALES`—, que enciende el sistema que **publica** cifras y no los cinco: medido,
  dentro de `PROHIBICIONES` pone rojo a `rentas` **sin tocar nada suyo**, por dos sitios a la vez
  (#58).
- **Los nombres de importe del PRODUCTO en UNA lista**: `CAMPOS_DE_DINERO` gana `uit`, `alicuota`,
  `arancel`, los tres cuadros de ADR-0017 con apellido, `valorNumerico`, `valorM2`, `deduccion`,
  `depreciacion`, `reajuste` y `baseImponible`, y la lista de `reduce` gana `parametros`; `valor`,
  `porcentaje`, `base` y `tramos` **se quedan fuera, con su falso positivo medido en código que
  existe**.
- **Una regla con tipos que no es una prohibición** (#111): `@typescript-eslint/switch-exhaustiveness-check`,
  en un bloque propio de `eslint.config.js` —el único con `projectService`—, con su muestra
  `switch-sin-agotar` en `OTRAS_MUESTRAS`. No entra en `PROHIBICIONES` por lo mismo que el XHR: allí
  sólo caben selectores, y una clave nueva exige muestra en el árbol de los cinco sistemas.
  `reglas-de-eslint.test.ts` la juzga con el config entero sobre la muestra **en su ruta de verdad**
  —el servicio de proyectos no tipa una ruta sintética—, en sus dos mitades: señalada, y limpia con
  el `case` que le faltaba; además, señalada **con un `default`** que no agota nada
  (`considerDefaultExhaustiveForUnions: false`), y aplicada con tipos en los cinco archivos del
  intérprete que tienen un `switch`, `.ts` y `.tsx`.
- **La exhaustividad que viaja** (#111): `la-exhaustividad-viaja.test.ts` compila el intérprete con
  las opciones mínimas de un consumidor —`strict` y nada de `tsconfig.base.json`— y un miembro de más,
  en memoria, en cada unión que agota, y exige el rojo **exacto** en su sitio: TS2366 en
  `CampoDelBloque`, `EstadoDeLaLectura` y la clave de `data-accion`, TS2322 en `PiezaDeLaPantalla` y
  `claseDe`. Es lo que protege a los consumidores, que no corren el lint de aquí.

## Las guardas

- **Sus herramientas son unas** (#126): `archivos.mjs` —en JavaScript, porque el guion del arnés lo
  corre un consumidor con `node`— tiene el único recorredor (`archivosDe`), la única `APARTADAS`
  (`node_modules`, `dist`, `muestras`), la única normalización de rutas (`rutaDesde`, con `/`), el
  escáner de líneas sin comentarios (`lineasQueCasan`) y el único `Hallazgo`; `texto.ts` los
  reexporta. Lo mide `el-recorrido-es-uno` sobre un árbol fabricado de cuatro niveles, con una
  carpeta apartada en cada uno, y fija también las **cinco extensiones** que leen las guardas del
  árbol (`.ts`, `.tsx`, `.mjs`, `.js`, `.css`): quitar una no pone roja ninguna guarda, las deja
  mirando menos. El guion del arnés extiende `APARTADAS` con `build` y `coverage` y
  salta los directorios ocultos, y lo mide un árbol de consumidor fabricado en
  `el-arnes-del-request-se-publica`. El quitador de comentarios de CSS es `sinComentariosCss`, en
  `ui/temas/base.ts`.
- `sin-suponer-un-sistema`, `sin-nombre-publico-entre-paquetes`, `las-capas-corren` y
  `los-consumidores-se-miran`.
- `el-texto-visible-es-dato`: el barrido con el analizador de TypeScript, que desde #52 tiene una
  **cuarta forma**: **la frase** —dos rachas de letras separadas por un espacio— sobre los paquetes
  que escriben palabras **sin dibujar nada**, hoy `sesion`, cuyo `textos.ts` guarda **dos sacos**
  —`TEXTOS_DE_LA_ESCALERA` y `TEXTOS_DE_LA_PUERTA`— y es lo único que no se barre. **Sin
  excepciones desde #118**: la que hubo, `identidad.ts`, declarada en #52, sobrevivió a su motivo y
  se borró, y una prueba nombra `escalera.ts` e `identidad.ts` para que no vuelva sin leerse.
  La cuarta forma **no se aplica a `ui` ni a `shell`** y está medido por qué: una lista de clases de Tailwind
  es dos rachas de letras separadas por un espacio, y daría **393 hallazgos en `ui` y 86 en
  `shell`**. Más el arnés de marcas que usan las guardas montadas.
- `formato-sin-number-ni-date` (#108): pasa el código de producción de `paquetes/formato/` por el
  **comprobador de TypeScript**, no por texto, y denuncia `Number`, `Date`, `Intl`, `parseInt` y
  `parseFloat` como identificador o como cadena exacta, **y la conversión sin la palabra**: un
  `+`, `-` o `~` unario, o un operador aritmético, sobre lo que no es `number` ni `bigint`, y una
  llamada que da `any`. Por texto dejaba pasar `String(+dia)` y un `Number` escondido detrás de un
  `'//'` dentro de una cadena. **Y no se fía del comprobador**: vigila también por dónde se le
  miente —un `as` que estrecha (`unknown as T`), un predicado `valor is number`, una sobrecarga, un
  `declare`, un `@ts-expect-error`, un `any` escrito— y dónde se convierte lo mentido —`Math` y la
  aritmética sobre `number`, que en `formato` es de `bigint`—. Lo que no ve, y lo dice: un
  `number` que da la covarianza de los arreglos y acaba en un método de texto
  (`'x'.repeat(cifras[0] ?? 0).length`). Con su centinela archivo por archivo y su muestra, de la
  que exige archivo, línea y qué de las veintiséis. Sólo
  `formato`: `api` y `ui` usan `Date` y `Number` con todo derecho, y la promesa de «ni uno» es de
  ese paquete.
- `lo-que-exports-promete-existe`: lee los seis `package.json` **tal cual**, no una lista escrita a
  mano, comprueba que cada promesa apunta a un archivo que existe y que es un archivo, y ante una
  forma de `exports` que no sepa leer sale **en rojo diciéndolo** en vez de pasar en verde.
- `las-acciones-corren-en-node-24` (#93): lee el **directorio** `.github/workflows/`, no una lista
  escrita, y fija por acción la mayor **cuyo `runs.using` se midió**, con el literal anotado al
  lado. No baja el `action.yml` porque eso exige red, y una guarda que necesita red es una que se
  salta el día que la red falla; lo que la tabla no conoce y lo que no es `@vN` salen **en rojo
  diciéndolo**.
- `las-cifras-las-escribe-un-guion` (#128): las muestras de `cifras.mjs` —la de `decidir`, que es
  lo que decide el código de salida, incluida—, y que `CLAUDE.md` y el `README.md` de la raíz estén
  en la lista y lleven un marcador por paquete, que ningún otro `.md` lleve uno sin estar en ella,
  que `yarn verificar` corra la comprobación como un eslabón propio y que la CI se dispare cuando
  esos dos archivos cambian.
- `el-guion-de-las-cifras-obedece` (#128): corre `cifras.mjs` **como proceso**, copiado en una raíz
  fabricada y con un `vitest` falso, y exige que el código de salida, lo dicho y lo escrito en el
  disco sean lo que `decidir` dice —una cifra tocada con `--comprobar` es RC=1 y no escribe; sin él,
  reescribe; una cifra ilegible es RC=1 y una medida vacía, RC=2—.
- `el-estado-cabe-en-una-linea` (#128), sobre `tabla-de-estado.ts` y con sus muestras: que ninguna
  línea de la tabla de estado de `CLAUDE.md` pase de 400 bytes, y que cada `README.md` de
  `paquetes/**` —el del intérprete incluido— tenga una fila que lo enlace.
- `el-registro-se-mezcla-solo` (#128): monta dos ramas que añaden fila al registro y las mezcla con
  el `.gitattributes` del árbol, que tiene que salir limpio; la muestra es la misma mezcla sin el
  atributo, que choca. Y ensaya el precio: dos ramas que editan la misma fila, que la guarda del
  registro tiene que cazar. Además le pregunta a git por el árbol **entero** —con los
  `.gitattributes` anidados, que anulan el de la raíz sin tocarlo— que el registro siga en `union`,
  y exige que la CI se dispare con cualquier `.gitattributes`.
- **Lo que un archivo importa lo dice el analizador de TypeScript, no una expresión regular**
  (#112): `imports.mjs` —en JavaScript, porque lo carga el guion del arnés— saca el especificador
  de cada import con `ts.preProcessFile`, y así ven el import de efecto, el dinámico, el
  `export … from`, el `require` y el subcamino (`@kamayuk/ui/estilos.css`), sin contar los
  comentarios ni las cadenas; el `@import` de los `.css` va aparte, en todas sus formas —también
  `url(x)` sin comillas, que se escapaba—. Lo usan
  `sin-nombre-publico-entre-paquetes`, `el-marco-no-decide-permisos` —con su muestra,
  `marco-que-decide-permisos.ts`— y el guion del arnés. Lo que no ve, y lo dice: un
  `import(variable)`, y el texto JSX, que contaría de más.

## Los guiones

- `rama-del-consumidor.mjs`: decide contra qué rama del consumidor se mide un PR, con sus muestras y
  su ensayo contra un remoto de verdad (#26).
- `cifras.mjs` (#128): `yarn cifras` mide con `vitest list --json` —con los argumentos de
  `yarn test` y `yarn test:capas`, leídos de `package.json`— y reescribe **sólo** el texto entre sus
  marcadores; `yarn cifras --comprobar` sale en rojo nombrando lo escrito y lo medido, y corre
  dentro de `yarn verificar`.

## El arnés del `Request` (#92)

`arnes-del-request.ts`, publicado por `exports` como `@kamayuk/verificaciones/arnes-del-request`, es
lo que permite a los cinco correr sobre jsdom con Node 24, y **esta librería lo importa desde ahí**,
por ruta relativa, en su `vitest.setup.ts`. Lo vigilan `el-arnes-del-request-se-publica.test.ts` con
su muestra y el guion `el-arnes-del-request-no-se-copia.mjs`, que **el consumidor ejecuta contra su
propio árbol** porque esta librería no lo tiene clonado. Desde #112 el guion reconoce el enchufe por
el analizador de TypeScript, y lo busca junto a esta librería y, si no, **en el árbol mirado**: en
la CI de un consumidor la librería es un clon sin `node_modules`. Sin `typescript` en ninguno de los
dos sale con RC=2 diciéndolo; sus argumentos, su RC=0/1 y sus líneas no cambian.

## Lo que le falta

Los tokens contra el artboard y el contraste.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
