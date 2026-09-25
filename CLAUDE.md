# `kamayuk-lib` — Contexto para agentes

Las **librerías comunes del producto Kamayuk**: lo que vale igual en los cuatro sistemas y por eso
no puede vivir en ninguno. Seis paquetes npm, **sólo fuente**, consumidos por `link:` desde un clon
hermano.

Es el **sexto repositorio**. Los otros son [`rentas`](https://github.com/hneyra/rentas),
[`catastro`](https://github.com/hneyra/catastro), [`normativa`](https://github.com/hneyra/normativa),
[`caja`](https://github.com/hneyra/caja), [`identidad`](https://github.com/hneyra/identidad) e
[`infrastructure`](https://github.com/hneyra/infrastructure). El archivo histórico es
[`sgtm`](https://github.com/hneyra/sgtm), que **no se borra ni se modifica**.

Lo decide [ADR-0038](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0038-el-corte-entre-el-producto-y-el-suelo.md)
(Aceptado, 2026-09-07), que contesta `D-23b`. El reparto de los seis paquetes es de
[ADR-0030 §4](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0030-cuatro-interfaces-una-sesion.md).

## Qué hay hoy, medido y no supuesto

**Esta tabla dice el ESTADO, no cómo se llegó a él, y en una línea por pieza.** Lo que hace cada
paquete, contado entero, vive en su `README.md`, enlazado desde la primera columna (#128). Por qué
cada cosa es como es —lo que se midió, con qué rotura se demostró que la verificación muerde y qué
rojo salió— vive en [`docs/agent/HISTORY.md`](docs/agent/HISTORY.md), una fila por issue. Aquí no
se repite. **Y las cifras de pruebas no se escriben a mano**: las escribe `yarn cifras` (ver
[Verificar antes de afirmar](#verificar-antes-de-afirmar)).

| Pieza | Estado |
|---|---|
| [`paquetes/formato`](paquetes/formato/README.md) — `@kamayuk/formato` | **Existe.** Fechas, importes y documento de identidad: la hoja limpia del grafo. <!-- cifras:formato -->**68 pruebas** en 3 archivos<!-- /cifras -->. Le faltan `codigo predial` y `placa` |
| [`paquetes/api`](paquetes/api/README.md) — `@kamayuk/api` | **Existe.** `crearCliente` y sus cuatro operaciones —`solicitar`, `solicitarRespuesta`, `descargar` y `subir`—, `entregarAlNavegador` y `ErrorDeLaApi` con las cinco extensiones del contrato. <!-- cifras:api -->**146 pruebas** en 6 archivos<!-- /cifras --> |
| [`paquetes/sesion`](paquetes/sesion/README.md) — `@kamayuk/sesion` | **Existe.** `crearIdentidad` con PKCE S256, la sonda del emisor y `quienEntro()`; `peldanoDe()` con sus nueve peldaños y sus palabras como dato. <!-- cifras:sesion -->**170 pruebas** en 6 archivos<!-- /cifras --> |
| [`paquetes/ui`](paquetes/ui/README.md) — `@kamayuk/ui` | **Existe.** Los 42 tokens, cuatro identidades × dos modos, las piezas de shadcn y el `ProveedorDeTema`; no escribe ni una palabra. <!-- cifras:ui -->**545 pruebas** en 25 archivos, más las **3** de capa<!-- /cifras --> y las barreras de tipo. Le faltan los tokens contra el artboard y el contraste |
| [`paquetes/ui/interprete`](paquetes/ui/interprete/README.md) — el intérprete de pantallas | **Existe**, y dibuja una hoja entera como **dato**: bloques, avisos, pie, actos, maestro-detalle, pestañas y piezas del consumidor, con lo elegido en la ruta. Sus pruebas cuentan en `paquetes/ui` |
| [`paquetes/shell`](paquetes/shell/README.md) — `@kamayuk/shell` | **Existe.** El armazón de V8, con el catálogo por parámetro y el estado de la hoja en la ruta; no decide permisos ni escribe una palabra. <!-- cifras:shell -->**151 pruebas** en 14 archivos<!-- /cifras --> |
| [`paquetes/verificaciones`](paquetes/verificaciones/README.md) — `@kamayuk/verificaciones` | **Existe.** Las prohibiciones de ESLint con sus muestras, las guardas del árbol, los guiones de la CI y el arnés del `Request`. <!-- cifras:verificaciones -->**284 pruebas** en 19 archivos<!-- /cifras -->. Le faltan los tokens contra el artboard y el contraste |
| La guarda de la fila del registro | **Existe**, con su autoprueba de **catorce muestras**, adaptada a la forma de este repositorio; desde #128 exige además una fila por issue |

<!-- cifras:total -->**En total: 1364 pruebas en 73 archivos, más las 3 de capa.**<!-- /cifras -->

## La regla que gobierna este repositorio

> **Una librería común no puede contener lógica de negocio de un contexto.** Si `@kamayuk/ui`
> necesita saber qué es un arbitrio, dejó de ser común y es el monolito otra vez, repartido y sin
> que el build lo vea. — ADR-0030 §4

**No es una intención: la vigila `paquetes/verificaciones/sin-suponer-un-sistema.test.ts`**, que
barre el código de producción de los cinco paquetes que viajan a un navegador —omitiendo
comentarios— y prohíbe cinco cosas:

| Clave | Qué prohíbe |
|---|---|
| `prefijo-de-un-sistema` | `/rentas/api`, `/caja/api`… ADR-0030 §2: **la ruta dice quién responde**, y el prefijo es parámetro de `crearCliente` |
| `global-de-configuracion-de-un-sistema` | `__KAMAYUK_RENTAS__` y hermanos: el nombre lleva el sistema dentro |
| `catalogo-de-modulos-de-un-sistema` | `RENTAS_REGISTRO` y demás códigos de módulo |
| `vocabulario-tributario` | `arbitrio`, `alicuota`, `autovaluo`, `predial`, `contribuyente` |
| `vocabulario-catastral` | `predio`, `ficha`, `catastral` —sin límites de palabra, para que `predioId` case— (#44) |

**`@kamayuk/verificaciones` queda fuera del barrido, y lo descubrió la propia guarda: se delataba a
sí misma.** El texto de su regla cita «arbitrio» —es el ejemplo con el que ADR-0030 la escribe— y
ese texto es código, no comentario. Es el único paquete que no viaja a un navegador.

**Los comentarios se omiten a propósito.** Los docblocks explican de qué archivo de qué sistema
salió cada pieza, y esa procedencia **es la medición que se hizo**. Una guarda que obligara a
borrarla estaría pidiendo falsificar el registro.

## Estructura

```
paquetes/
  formato/   valores.ts, formato.ts, aritmetica.ts, documento.ts, partir.ts (el UNICO analisis de lo
             servido, interno)
  api/       errores.ts (ErrorDeLaApi + NoEsUnDocumento + ArchivoRechazado), cliente.ts (crearCliente),
             subir.ts (el multipart, y el UNICO XMLHttpRequest), entregar.ts (entregarAlNavegador)
  sesion/    identidad.ts (crearIdentidad, y los DOS fetch de la puerta), pkce.ts (aleatorios, reto
             S256 y base64url), rebote.ts (las cinco claves de sessionStorage), quien-entro.ts
             (leerQuienEntro), escalera.ts (peldanoDe), textos.ts (los sacos de la escalera y de la puerta)
  ui/        los tokens, las cuatro identidades y sus dos origenes, los componentes de shadcn (once + siete),
             el interprete (hoja.ts, composicion.ts y sus piezas) y textos.tsx
  shell/     el armazon: catalogo.ts, ruta.ts, busqueda.ts, acciones.ts, navegacion.tsx, contexto.tsx,
             textos.ts y las siete piezas
  verificaciones/  texto.ts, comentarios.mjs, archivos.mjs (el recorredor, el escaner de lineas y el
                   unico Hallazgo de las guardas), suposiciones.ts, marcas.ts, rama-del-consumidor.mjs,
                   las-acciones-corren-en-node-24.test.ts, arnes-del-request.ts (el arnes que se
                   publica) y el-arnes-del-request-no-se-copia.mjs (el guion que el consumidor corre
                   contra su arbol), cifras.mjs (yarn cifras), tabla-de-estado.ts (lo que mide
                   la guarda de la tabla), rutas-de-la-ci.ts, sus pruebas y sus muestras/
  */README.md      lo que hace cada paquete, contado entero (y ui/interprete/README.md, el interprete)
docs/
  agent/HISTORY.md            el registro «Verificar antes de afirmar», que se mezcla con merge=union
  00-gobierno/                la guarda de la fila y su autoprueba
.gitattributes                docs/agent/HISTORY.md merge=union, y solo eso
```

Los paquetes se importan entre sí **por ruta relativa**, y no hay `paths` ni `alias`. El motivo
está medido: un import por el nombre público resuelve **aquí** —este repositorio es raíz de workspaces y yarn crea
`node_modules/@kamayuk/*`— y se rompía en el consumidor, que resuelve el symlink **a su ruta real**
(`preserveSymlinks` está apagado por omisión en Vite y en `tsc`). Sin `node_modules`:

```
paquetes/sesion/escalera.ts(45,30): error TS2307: Cannot find module '@kamayuk/api'   RC=2
```

Un rojo que **sólo sale en CI**, dentro de un archivo de otro repositorio, y cuya primera lectura
manda a mirar donde no es. Lo vigila `sin-nombre-publico-entre-paquetes`, con su muestra. Y está
demostrado al revés: apartado `node_modules/@kamayuk` entero, `tsc` da RC=0 y las pruebas pasan
—eran 160 el día que se midió, en #4, y la cifra es de ese día—.

## Reglas que no se negocian

Son las del producto, y valen aquí igual que en los cinco sistemas. Las que este repositorio puede
romper, y por eso vigila:

**Las prohibiciones de ESLint viven aquí**, en `paquetes/verificaciones/prohibiciones.mjs`: **nueve
obligatorias** en `PROHIBICIONES`, que este repositorio se aplica a sí mismo y los cinco sistemas
derivan, y **las opcionales** en `PROHIBICIONES_OPCIONALES`, que enciende quien las quiera y aquí no
se encienden. Que estén aquí y no en cada sistema tapa un hueco
medido: el código enlazado **no lo linta nadie** —el config de cada sistema ignora `node_modules`,
que es donde el `link:` lo deja—, así que entraba al bundle código que formatea dinero y compone
peticiones sin ninguna de las cuatro prohibiciones de importes.

| # | Regla | Dónde muerde |
|---|---|---|
| 1 | **Importes en texto decimal, jamás `number`** | cuatro prohibiciones, más `@kamayuk/formato`: ni un `Number`, un `Date`, un `Intl`, un `parseInt` ni un `parseFloat` en todo el paquete, ni un `Math`, ni una conversión sin la palabra —un `+` unario, un `as unknown as number`, un `as T` o un predicado que le mienten al comprobador—, que lo vigila `formato-sin-number-ni-date` con el comprobador de TypeScript y su muestra —hasta #108 se cumplía por costumbre: había dos `Number` y la CI salía verde— |
| 2 | **Ningún método recibe `municipalidadId`** | prohibición `municipalidad-en-el-cliente`, más una prueba que espía lo que sale por el cable |
| 8 | **`alicuota`, nunca `tasa`** | prohibición `tasa-en-vez-de-alicuota` |
| — | **`fetch` sólo donde debe** | `fetch-fuera-del-cliente`, con **dos** excepciones declaradas; y dentro de `paquetes/sesion/`, sólo en `identidad.ts`, que lo vigila un bloque de `eslint.config.js` que ahí prohíbe **el nombre** y no sólo la llamada desnuda —`globalThis.fetch(…)` también— (#122) |
| — | **`XMLHttpRequest` sólo donde debe** | `el-xhr-vive-en-un-solo-sitio.test.ts`, sobre el árbol de la librería. **No es una décima prohibición de ESLint, y está medido por qué**: cada sistema le exige a cada clave **su muestra en SU árbol**, y una prohibición con `salvo` que el consumidor no sitúe en su `SALVO_EN_ESTE_ARBOL` **lanza al cargar el config** — o sea que añadirla es, por construcción, un cambio coordinado en cinco repositorios. El `src/` de los cuatro sistemas queda fuera; hoy no hay ni una llamada que vigilar |
| — | **Sin tildes ni enie en identificadores** | `identificador-con-tilde` |
| — | **Una clase nueva no compila hasta que cada `switch` tenga la suya** | los retornos anotados y los `never` del intérprete —TS2366/TS2322 con el `tsconfig` de cada consumidor, y lo vigila `la-exhaustividad-viaja.test.ts` compilando con las opciones mínimas de uno— y, para lo que el compilador no ve, `switch-exhaustiveness-check` en el lint de aquí, con su muestra. **No es una prohibición**, por lo mismo que el XHR (#111) |
| — | **Nada supone un sistema** | `sin-suponer-un-sistema`, con su muestra |
| — | **Ningún paquete se importa por su nombre público** | `sin-nombre-publico-entre-paquetes`, con su muestra |
| — | **Ninguna palabra visible escrita dentro de un componente** | `el-texto-visible-es-dato` (el barrido, con el analizador de TypeScript) más las dos guardas que **montan** el armazón y las piezas con el saco marcado (#19). En `sesion`, la cuarta forma —la frase devuelta— **sin excepciones** desde #118 |
| — | **El arnés del `Request` se importa, no se copia** | `el-arnes-del-request-se-publica.test.ts`, con su muestra: en este árbol el `Request` global se instala en **un solo archivo** —el que lo publica— y `vitest.setup.ts` lo **importa** por ruta relativa. Lo que no puede vigilar es el árbol de un consumidor que no está clonado, y por eso se publica además `el-arnes-del-request-no-se-copia.mjs`, que él corre contra el suyo (#92) |
| — | **Ninguna entrada de `exports` promete un archivo que no está** | `lo-que-exports-promete-existe`, que lee los seis manifiestos tal cual y sale en rojo también ante una forma de `exports` que no sepa leer (#24) |
| 5 | **Ninguna cifra tributaria literal en el código** | `cifra-tributaria-literal`, con su muestra de **cinco formas**. **OPCIONAL**: vive en `PROHIBICIONES_OPCIONALES` y la enciende el sistema que publica las cifras. Está medido por qué no puede ser obligatoria — `export const alicuotaPredial = '0.006';` es, a la vez, el ejemplo de código CORRECTO de `rentas` y lo que esta regla prohíbe (#58) |
| — | **El marco no decide permisos** | `el-marco-no-decide-permisos.test.ts`: `paquetes/shell` no importa `../sesion/`, no importa `../api/` y no llama a `fetch`. El catálogo lleva `acceso`/`tambien` y `accesosDe` los da; **filtrar es del sistema**, antes de pasarle el catálogo al `Armazon` (#67) |
| — | **Las cifras de pruebas las escribe un guion** | `yarn cifras --comprobar`, en `yarn verificar`, con las muestras de `las-cifras-las-escribe-un-guion.test.ts`: una cifra a mano, un marcador que falta, sobra o no cierra, y un `.md` con marcador fuera de la lista; y el guion corrido **como proceso** en `el-guion-de-las-cifras-obedece.test.ts`, que exige su código de salida (#128) |
| — | **El registro se mezcla solo** | `el-registro-se-mezcla-solo.test.ts`: dos ramas que añaden fila, mezcladas con el `.gitattributes` del árbol, sin conflicto; su muestra sin el atributo, que choca; y el árbol entero, con los `.gitattributes` anidados, en `union` (#128) |
| — | **El registro, una fila por issue** | la guarda del registro, con sus muestras en la autoprueba: `merge=union` no avisa cuando dos ramas editan la misma fila (#128) |
| — | **La tabla de estado, una línea por pieza** | `el-estado-cabe-en-una-linea.test.ts`, con sus muestras: ninguna fila pasa de 400 bytes y cada `README.md` de `paquetes/**` tiene su fila (#128) |
| — | **Ninguna acción de la CI baja de la mayor que declara `node24`** | `las-acciones-corren-en-node-24.test.ts`, con sus muestras. Lee el **directorio** `.github/workflows/` y fija la mayor **medida**, con el `runs.using` literal al lado; lo que decide es ese `runs.using` y **no el número** —`caja` midió un `@v5` que aún declaraba `node20`—. **Sin red al correr**, y lo que no conoce sale en rojo diciéndolo (#93) |

**`fetch` tiene DOS sitios legítimos, y la lista se comprueba entera, no se cuenta.** Uno es el
cliente HTTP. El otro es `paquetes/sesion/identidad.ts`, que lo llama **dos veces** y por el mismo
motivo: ni el canje PKCE ni la sonda del emisor pueden pasar por `solicitar()` — van a Keycloak, el
canje con otro tipo de contenido, sin el token (que es justo lo que va a buscar) y sin el
`problem+json` del backend; la sonda en `no-cors`, sin credenciales y sin leer la respuesta. Las dos
caen dentro del mismo sitio declarado. Mientras el cliente HTTP y la puerta de identidad vivieron en
el mismo `src/api/` de un sistema, una sola excepción las cubría y esto no se veía. **La excepción
declarada es el directorio `paquetes/sesion/`** —cada consumidor la sitúa en su árbol, y tocar su
valor es un cambio en cinco repositorios—, así que desde que la puerta se partió en `pkce.ts` y
`rebote.ts` un `fetch` en una pieza pasaba el lint (medido: RC=0). Un bloque de `eslint.config.js`
le devuelve la prohibición al resto del directorio, sólo en este árbol (#122), y ahí prohíbe el
**nombre** `fetch` y no sólo `fetch(…)`: el selector de `PROHIBICIONES` no ve `globalThis.fetch(…)`
ni `window.fetch(…)` (medido: RC=0), y fuera de la puerta sigue sin verlos.

**Si agregas una regla, agrega también la muestra que la viola.** Una regla que no puede fallar no
protege nada.

**Y lo que no se toca**, que desde #128 vive entero en el `README.md` de su pieza. Aquí va una línea
por cosa, porque es regla y no historia, y este archivo es el que se carga:

- [`ui/interprete`](paquetes/ui/interprete/README.md): lo impedido sale con `BotonConMotivo`, **nunca
  `disabled`**; `TextosDelInterprete` no gana claves y `DefinicionDePantalla` sigue genérica —medido:
  las dos rompen `rentas`—; y **`@kamayuk/ui` no importa `@kamayuk/shell`**, que hoy no vigila
  ninguna guarda de este árbol.
- [`ui`](paquetes/ui/README.md): `estilos/temas.css` es **generado** (`KAMAYUK_REGENERAR=1`); los
  bloques oscuros declaran `color-scheme: dark` por sus dos caminos; no escribe ni una palabra.
- [`api`](paquetes/api/README.md): el `Content-Type` del multipart no se fija a mano, y el
  `XMLHttpRequest` vive sólo en `subir.ts`.
- [`sesion`](paquetes/sesion/README.md): la sonda sube con `credentials: 'omit'`.
- [`shell`](paquetes/shell/README.md): no decide permisos ni escribe una palabra.

## Idioma

Español en el dominio, inglés en lo técnico. **Sin tildes en identificadores.** Comentarios, pruebas
y mensajes de commit en español.

## Comandos

```bash
yarn install
yarn verificar               # lint, tipos y pruebas, mas las de capa y la comprobacion de las cifras
yarn test                    # solo las pruebas (SIN las de capa)
yarn test:capas              # las que abren una capa con posicionador. Ver `las-capas-corren.test.ts`
yarn registro                # la guarda de la fila del registro
yarn registro:autoprueba     # sus catorce muestras
yarn cifras                  # reescribe las cifras de pruebas de CLAUDE.md y del README (#128)
yarn cifras --comprobar      # sale en rojo si alguna cifra escrita no es la medida
yarn consumidor:rama --consumidor duenno/sistema [--comprobar]   # contra que rama se mide (#26)
yarn consumidor:ensayo       # el ensayo de esa resolucion contra un remoto de verdad. Sale a la red
yarn arnes:copias            # que nadie haya vuelto a escribir a mano el arnes del Request (#92)
```

**Un PR puede nombrar la rama del consumidor contra la que quiere medirse** (#26), con una línea de
su cuerpo: `consumidor: duenno/sistema@la-rama-que-lo-arregla`. Sin ella se mide la rama por omisión
del consumidor, que es el caso normal; con ella, **la rama nombrada es el contrato** y si sale roja
bloquea, aunque la línea base también esté roja —que es lo normal, porque esa rama trae el ajuste
que espera el cambio de aquí—. Una rama nombrada que no existe **sale roja diciéndolo**: no se cae a
la de por omisión en silencio. Por qué es una línea del cuerpo del PR y no un archivo ni una
etiqueta está medido en `paquetes/verificaciones/rama-del-consumidor.mjs`.

## Verificar antes de afirmar

**Ejecutar la prueba vale más que razonar sobre ella.** Y no basta con que la verificación esté
escrita: **tiene que demostrarse que puede fallar** — se rompe a propósito el código que protege,
se ejecuta, y se anota el rojo exacto que sale.

Las filas viven en [`docs/agent/HISTORY.md`](docs/agent/HISTORY.md), y ahí es donde se escribe la
siguiente. Que la fila **exista** lo comprueba `docs/00-gobierno/verificar-fila-del-registro.mjs` en
cada PR que cierre un issue y toque código de producción. Lo que la fila **diga** lo lee la revisión.

**El registro se mezcla solo** (#128): `.gitattributes` le pone `merge=union`, así que dos PR que
añaden cada uno su fila al final de la tabla ya no chocan —lo ensaya `el-registro-se-mezcla-solo`
con el `.gitattributes` del árbol—. Lo que la unión no avisa —dos ramas que **editan** la misma fila
dejan las dos versiones— lo caza la misma guarda, que en cada PR exige **una fila por issue**: la
que lo cita en su título, la primera negrita de la primera celda; la que no cita ninguno cuenta por
su título entero. **Y GitHub NO la respeta, medido** (PR #131, dos ramas con una fila cada una):
el PR sale `mergeable_state: dirty` y «Update branch» contesta `merge conflict between base and
head`, mientras que `git merge` local de las mismas dos ramas sale limpio con las dos filas. O sea:
la unión sirve a quien mezcla `main` **en local**, que es como se integran las ramas aquí; el botón
de GitHub sigue chocando.

**Y las cifras de pruebas no se escriben a mano** (#128). Las de la tabla de arriba y las del
`README.md` de la raíz viven entre dos marcadores de una misma línea —`<!-- cifras:<paquete> -->`, o
`cifras:total`, y `<!-- /cifras -->`— y las escribe `yarn cifras`, que mide con `vitest list --json`
con los argumentos de `yarn test` y `yarn test:capas`. `yarn cifras --comprobar` corre dentro de
`yarn verificar`. **Un conflicto en una cifra se resuelve ejecutando `yarn cifras`, no sumando.**
