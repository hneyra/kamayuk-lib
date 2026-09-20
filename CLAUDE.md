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

**Esta tabla dice el ESTADO, no cómo se llegó a él.** Por qué cada cosa es como es —lo que se midió,
con qué rotura se demostró que la verificación muerde y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](docs/agent/HISTORY.md), una fila por issue. Aquí no se repite.

| Pieza | Estado |
|---|---|
| `paquetes/formato` — `@kamayuk/formato` | **Existe.** Fechas, importes y documento de identidad, copiado **verbatim** de `rentas/frontend/src/dominio/`. Es la **hoja limpia del grafo**: no importa nada de nadie, y no hay ni un `Number` ni un `Date` en todo el paquete (regla 1). **67 pruebas** en 3 archivos. **Le faltan `codigo predial` y `placa`**, que ADR-0030 §4 le encarga y **no se inventan**: entran el día que el sistema dueño del dato diga cuál es su forma |
| `paquetes/api` — `@kamayuk/api` | **Existe.** `crearCliente({ prefijo, token })` y cuatro operaciones sobre el mismo prefijo, el mismo token —leído en **cada** llamada, con la misma función— y el mismo `ErrorDeLaApi`: `solicitar`; `solicitarRespuesta(ruta, opciones?)`, que devuelve `{ estado, cabeceras, texto }` con el cuerpo **tal cual llegó** —sin `JSON.parse`, sin `JSON.stringify` y sin `trim`—, para el recurso que viene firmado con una huella en una cabecera: reserializar el objeto da otro texto (`1.0` vuelve `1`, un escape vuelve la letra) y por tanto otra huella, y **comprobarla es del sistema que la pide, no de aquí**. Es **la misma petición que `solicitar`** —las dos las compone `pedir()`, así que compartirlo es una propiedad del código y no una promesa del docblock— y **no mira el `Content-Type`**: un 200 con JSON es su caso normal, lo contrario que `descargar`. `OpcionesDeSolicitud` lleva `claveDeIdempotencia?`, que sale como `Idempotency-Key` y **en blanco lanza antes de llamar a `fetch`** —el backend trata una clave en blanco como si no hubiera clave, y el reintento duplicaría sin avisar—, y **no tiene ninguna cabecera libre**: ni `cabeceras` ni `headers`, porque por ahí se sobrescribiría el `Authorization` o viajaría el inquilino (regla 2, ADR-0005), y lo vigilan tres barreras de tipo. `descargar(ruta, { nombre?, senal? })`, que devuelve `{ nombre, tipoDeMedio, contenido: Blob }` **sin tocar el DOM** —un 200 con JSON lanza `NoEsUnDocumento`, subclase de `ErrorDeLaApi` y no un `codigo` inventado, y el nombre sale de `Content-Disposition` antes que del argumento—; y `subir<T>(ruta, { archivo, nombre?, campo?, campos?, metodo?, senal?, alAvanzar?, limiteDeBytes?, admite? })`, un `multipart/form-data` cuyos tres desenlaces llegan distinguidos a la pantalla: `ArchivoRechazado` con `motivo` `'demasiado-grande'` o `'tipo-no-admitido'` —local, `estado: 0` y **sin mandar un byte**, o del 413/415 del servidor— y el 422 de la casa como `ErrorDeLaApi`. Entregar el documento al usuario es otra función, `entregarAlNavegador(documento)`, **la única del paquete que toca el DOM**. Las clases de error viven en `errores.ts`, aparte del cliente, porque juntas cerraban un ciclo. **Dos cosas que no se tocan**: el `Content-Type` del multipart **no se fija a mano** —lo pone el navegador con su `boundary`, y lo vigilan dos pruebas, una de ellas sobre la lista entera de cabeceras—, y el `XMLHttpRequest` que da el avance de subida —lo que `fetch` no da sin `duplex: 'half'`, que es sólo Chromium, sólo HTTP/2, y mediría lo escrito y no lo recibido— vive **sólo** en `subir.ts`, que es lo que vigila `el-xhr-vive-en-un-solo-sitio.test.ts`. **118 pruebas** en 5 archivos |
| `paquetes/sesion` — `@kamayuk/sesion` | **Existe.** `crearIdentidad(config)` con PKCE S256 y `peldanoDe()` con sus **siete** peldaños. Viene de `rentas`, el único de los cuatro que se autenticaba, y **nada dentro nombra a un sistema**: lo que lo ataba eran tres datos, hoy parámetros. `entrar()` pregunta al documento de descubrimiento antes de navegar y devuelve `FallaDeLaPuerta` si el emisor no contesta; `urlDeLaCuenta()`/`abrirLaCuenta()` llevan a la consola de cuenta de Keycloak **derivándola del realm**, no escrita a mano. **La sonda sube con `credentials: 'omit'`**, y no es adorno: medido en Chromium, con el emisor en el mismo origen que la interfaz —el caso del clúster, `https://<dominio>/keycloak/…`— sin esa línea le van las cookies de la sesión. **45 pruebas** en 2 archivos |
| `paquetes/ui` — `@kamayuk/ui` | **Existe.** Los **42** tokens del artboard en un `@theme` de Tailwind v4 —38 colores, 2 radios, 2 sombras—; **cuatro identidades × dos modos**, ocho paletas derivadas con reglas en OKLCH de **dos orígenes** —el `@theme` y `estilos/clasico.css`, que no se importa sino que se lee— con `ORIGEN_DE` decidiendo cuál le toca a cada una, de modo que pasarle a una identidad la base de otra no es posible; `Importe`/`Insignia`/`FechaDeCalculo`/`Icono` y los trazos con nombre genérico; **once + siete** piezas de shadcn —las que el intérprete pide en cada pantalla y las del armazón, sobre Radix, `cmdk` y `sonner`—; y el `ProveedorDeTema`. Los demás componentes de shadcn entran cuando se usen. **Tres cosas que no se tocan**: `estilos/temas.css` es **archivo generado** —sale de `temas/generar.ts`, se regenera con `KAMAYUK_REGENERAR=1`, lo arrastra `estilos.css` con un `@import` y lo vigila una guarda **sobre el CSS emitido**, que lo compila como lo compila Vite—; los tres bloques oscuros declaran `color-scheme: dark` **por sus dos caminos cada uno**, sin lo cual los controles nativos, la barra de desplazamiento y el fondo previo del lienzo se quedan claros bajo una paleta oscura; y **el paquete no escribe ni una palabra visible** —lo suyo vive en `textos.tsx` y entra por `props` con valor por omisión—. **434 pruebas** en 22 archivos, más las **3** de capa y las barreras de tipo. Le faltan los tokens contra el artboard y el contraste |
| `paquetes/ui/interprete` — el intérprete de pantallas | **Existe**, y dibuja una hoja entera como **dato**. `bloques` admite el bloque —cabecera, nota, rejilla de campos y sus tablas, con `acciones` que abren un acto, van a otra hoja o hacen una operación—, el `aviso`, el `pie` de operaciones, la pieza `delConsumidor` cuya `clave` se busca en `<Pantalla piezas>`, el `acto` —un formulario con la **observación obligatoria en el tipo** (regla 10)—, el `maestroDetalle` —un `listbox` cuya elección **no sigue al foco**, porque cada flecha sería una lectura del detalle— y las `pestanas` —`tablist` con tabulador itinerante, del que **sólo se monta la abierta**—. Toda pieza salvo el pie declara `lectura` (`en-espera`, `pidiendo`, `fallo` con el peldaño **ya resuelto** por el sistema, `con-datos`), `cuando` y `fallosDe`; los textos pueden llevar un dato dentro (`plantilla`, `desde`, `segun`). Las piezas anidadas se numeran **en anchura**, así que las de primer nivel conservan su índice para `filas`, `valores` y `conteos` (`indicesDeLasPiezas`). **`cabeceraFija` sólo se mira en el primer nivel**: una tabla con la cabecera fija dentro de una pestaña o del detalle de un maestro no hace que la hoja ceda el alto.<br><br>**Los campos y las tablas del bloque.** **Los campos son siete tipos** —`tipoDe` pela la marca de ancho y **revienta** ante un octavo, porque dibujarlo sería un campo de menos sin ningún aviso—, y llevan `marcador`, `ayuda`, `opciones` con rótulo propio e `insignia`. **Un bloque tiene su tabla y además `tablas`**, cada una con `clave`, que toma sus filas de `datos.tablas` **por nombre** —una sin `clave` las toma del bloque por su índice—; una fila es `{ celdas, datos? }`, y sus `datos` son lo que leen las reglas: el tono de una insignia, el detalle de la fila y las acciones que ofrece. **Sin dato, `[]` y con filas son TRES cosas**: la ausencia —no se pudo pedir, y se dice por qué—, la lectura que contestó una lista vacía —que dice el `vacio` de la definición, y sin él un aviso del saco: nunca una tabla muda— y las filas con su conteo; **no se escribe un conteo que el sistema no haya dado**, porque «0 registros» sobre una lista vacía repite con un número lo que la frase ya dice, y sobre una que nadie pidió afirma que está vacía sin saberlo. Las acciones de una fila van en un `role="group"` **con nombre** —tres «Descartar» seguidos no se pueden decir en voz alta sin decir de qué fila es cada uno— y, cuando la fila no ofrece ninguna, **«sin acciones» es texto y no un botón apagado**. **Tres reglas puras, aparte de las piezas** (`reglas-de-las-tablas.ts`, por lo mismo que `componer.ts`): `resolverInsignia`, que **nunca mira el texto para decidir el tono** y devuelve `undefined` cuando el dato que decide no llegó —pintar `otro` ahí afirmaría un estado que nadie ha leído—; `accionesQueOfrece`, que **revienta** si `segun.ofrece` nombra una acción que `acciones` no declara; y `tablasSinVacio`, con la que cada sistema recorre sus definiciones **sin montar nada**.<br><br>**Cuatro cosas que no se tocan**: lo impedido sale con **`BotonConMotivo`** —`aria-disabled` y `aria-describedby` hacia el motivo visible, **nunca `disabled`**—; `TextosDelInterprete` **no gana claves** y `DefinicionDePantalla` es genérica con el valor por omisión de hoy, porque las dos cosas, medidas, rompen la compilación de `rentas`; el árbol, las definiciones y el vocabulario de tonos se quedan en cada sistema, y `traducir`, `textos` y `tonoDeLaInsignia` entran por `props`; y lo que necesita del marco es una **forma** y no un import —`HojaDelMarco` (`{ ruta, marco?, moverLaRuta }`), que `useHoja()` cumple y una barrera de tipo vigila—, así **`@kamayuk/ui` no importa `@kamayuk/shell`**.<br><br>**Y desde #94 un campo puede decir dónde vive en la ruta lo que se elige en él** (`eleccion: { enLaRuta, cuando? }`, en el que se teclea y en el que elige de una lista): la página y el orden llegaban a la ruta y **un filtro no**, así que lo tecleado se quedaba en el estado de `<Pantalla>` sin llegar ni a `nombrados` ni a la barra de direcciones. **No abre un segundo canal**: desde #67 la ruta ya entra en `nombrados` como `ruta.<clave>`, así que un campo que escribe en `?descripcion=` lo leen `resolverTexto`, `seCumple` y los `parametros` de una acción `va` sin publicar el estado interno del intérprete. Se escribe **al elegir** —un gesto, un movimiento— o **al salir del campo y con Intro** —lo que se teclea: nunca una dirección por tecla, y el retardo se miró y no entra—, y cambiarlo **devuelve a la primera página** las tablas de su bloque en un solo `cambiosEn`. Un filtro **no ensucia la hoja**: no es trabajo sin guardar. Y desde aquí **una fecha viaja en ISO y se lee `dd/mm/aaaa`** (`shadcn/fecha.ts`), porque `20/9/2026` no lo parsea ningún backend del producto y ordenado como texto va después de octubre.<br><br>Un ejemplo por hueco en `interprete/muestras*.ts`, que las pruebas montan uno a uno |
| `paquetes/shell` — `@kamayuk/shell` | **Existe.** El armazón de V8: barra global, carril de módulos plegable con filtro, paleta de mando (`Ctrl/Cmd+K`), cabecera con miga, acciones al pie y el aviso de cambios sin guardar. **El catálogo de módulos y destinos entra por parámetro**; el enrutado es por hash con `createHashRouter`, con **una sola ruta** y el destino resuelto en el render, y el enrutador **se construye una vez** —el catálogo sale de la red y cambia después de montar—: lo que el catálogo no trae no se ofrece en el árbol, ni en la paleta, ni en la miga, **ni por el hash**. **El estado de una hoja vive en la ruta**: `#/<slug>/<sujeto>?<parametro>=<valor>`, y sólo lo que `Destino.enLaRuta` declara —lo demás se ignora con aviso y la hoja se abre igual—; `#/<slug>` a secas sigue siendo la forma de las 40 hojas de `rentas`. **Toda dirección que el marco escribe pasa por `ubicacionDe`** —el árbol, la paleta, `ir` y `moverLaRuta`—, y `leerLaRuta` lee lo que ella escribe. `useHoja()` da `{ ruta, moverLaRuta, marco }`; `useNavegacion()`, `{ ofrece, ir }` sobre el mismo índice del catálogo y el mismo `irA` que el árbol. La pantalla lleva `key` **por destino**, no por ruta: cambiar de sujeto o de pestaña no la desmonta. **Dos cosas que no se tocan**: el marco **no decide permisos** —`Destino` lleva `acceso`/`tambien` y `accesosDe` los da, pero filtrar es del sistema, antes de pasarle el catálogo; el paquete no importa `@kamayuk/sesion`, no importa `@kamayuk/api` y no llama a `fetch`, y lo vigila `el-marco-no-decide-permisos`—; y **tampoco escribe una palabra**: las **32** suyas entran por `<Armazon textos={…} />`, un `Partial` con el castellano por omisión y **sin ninguna `peerDependency` nueva** —`i18next` obligaría a los cuatro sistemas a montarlo antes de dibujar un botón—. **113 pruebas** en 9 archivos |
| `paquetes/verificaciones` — `@kamayuk/verificaciones` | **Existe.** Las **nueve prohibiciones obligatorias** de ESLint con sus nueve muestras; **una décima OPCIONAL** con la suya —`cifra-tributaria-literal`, en `PROHIBICIONES_OPCIONALES` y `REGLAS_OPCIONALES`, que enciende el sistema que **publica** cifras y no los cinco: medido, dentro de `PROHIBICIONES` pone rojo a `rentas` **sin tocar nada suyo**, por dos sitios a la vez (#58)—; y **los nombres de importe del PRODUCTO en UNA lista** —`CAMPOS_DE_DINERO` gana `uit`, `alicuota`, `arancel`, los tres cuadros de ADR-0017 con apellido, `valorNumerico`, `valorM2`, `deduccion`, `depreciacion`, `reajuste` y `baseImponible`, y la lista de `reduce` gana `parametros`; `valor`, `porcentaje`, `base` y `tramos` **se quedan fuera, con su falso positivo medido en código que existe**—. Más las guardas: `sin-suponer-un-sistema`, `sin-nombre-publico-entre-paquetes`, `las-capas-corren`, `los-consumidores-se-miran`, `el-texto-visible-es-dato` —el barrido con el analizador de TypeScript— más el arnés de marcas que usan las guardas montadas, `lo-que-exports-promete-existe` —que lee los seis `package.json` **tal cual**, no una lista escrita a mano, comprueba que cada promesa apunta a un archivo que existe y que es un archivo, y ante una forma de `exports` que no sepa leer sale **en rojo diciéndolo** en vez de pasar en verde— `rama-del-consumidor.mjs`, que decide contra qué rama del consumidor se mide un PR, con sus muestras y su ensayo contra un remoto de verdad, y `las-acciones-corren-en-node-24` —que lee el **directorio** `.github/workflows/`, no una lista escrita, y fija por acción la mayor **cuyo `runs.using` se midió**, con el literal anotado al lado: no baja el `action.yml` porque eso exige red, y una guarda que necesita red es una que se salta el día que la red falla; lo que la tabla no conoce y lo que no es `@vN` salen **en rojo diciéndolo** (#93)—. Y —desde #92— desde #92— **el arnés del `Request`**: `arnes-del-request.ts`, publicado por `exports` como `@kamayuk/verificaciones/arnes-del-request`, que es lo que permite a los cinco correr sobre jsdom con Node 24 y que **esta librería importa desde ahí**, por ruta relativa, en su `vitest.setup.ts`; lo vigilan `el-arnes-del-request-se-publica.test.ts` con su muestra y el guion `el-arnes-del-request-no-se-copia.mjs`, que **el consumidor ejecuta contra su propio árbol** porque esta librería no lo tiene clonado.  **181 pruebas** en 12 archivos —remedidas tras mezclar #93 y #92, que anadieron 10 y 18: la cifra de partida, 144 en 8, se habia quedado vieja y eran 153 en 9—. **Le faltan** los tokens contra el artboard y el contraste |
| La guarda de la fila del registro | **Existe**, con su autoprueba de **nueve muestras**, adaptada a la forma de este repositorio |

**En total: 958 pruebas en 53 archivos, mas las 3 de capa.**

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
  formato/   valores.ts, formato.ts, aritmetica.ts, documento.ts
  api/       errores.ts (ErrorDeLaApi + NoEsUnDocumento + ArchivoRechazado), cliente.ts (crearCliente),
             subir.ts (el multipart, y el UNICO XMLHttpRequest), entregar.ts (entregarAlNavegador)
  sesion/    identidad.ts (crearIdentidad), escalera.ts (peldanoDe)
  ui/        los tokens, las cuatro identidades y sus dos origenes, los componentes de shadcn (once + siete),
             el interprete (hoja.ts, composicion.ts y sus piezas) y textos.tsx
  shell/     el armazon: catalogo.ts, ruta.ts, busqueda.ts, acciones.ts, navegacion.tsx, contexto.tsx,
             textos.ts y las siete piezas
  verificaciones/  texto.ts, comentarios.mjs, suposiciones.ts, marcas.ts, rama-del-consumidor.mjs,
                   las-acciones-corren-en-node-24.test.ts, arnes-del-request.ts (el arnes que se
                   publica) y el-arnes-del-request-no-se-copia.mjs (el guion que el consumidor corre
                   contra su arbol), sus pruebas y sus muestras/
docs/
  agent/HISTORY.md            el registro «Verificar antes de afirmar»
  00-gobierno/                la guarda de la fila y su autoprueba
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
demostrado al revés: apartado `node_modules/@kamayuk` entero, `tsc` da RC=0 y las 160 pruebas pasan.

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
| 1 | **Importes en texto decimal, jamás `number`** | cuatro prohibiciones, más `@kamayuk/formato`: ni un `Number` ni un `Date` en todo el paquete |
| 2 | **Ningún método recibe `municipalidadId`** | prohibición `municipalidad-en-el-cliente`, más una prueba que espía lo que sale por el cable |
| 8 | **`alicuota`, nunca `tasa`** | prohibición `tasa-en-vez-de-alicuota` |
| — | **`fetch` sólo donde debe** | `fetch-fuera-del-cliente`, con **dos** excepciones declaradas |
| — | **`XMLHttpRequest` sólo donde debe** | `el-xhr-vive-en-un-solo-sitio.test.ts`, sobre el árbol de la librería. **No es una décima prohibición de ESLint, y está medido por qué**: cada sistema le exige a cada clave **su muestra en SU árbol**, y una prohibición con `salvo` que el consumidor no sitúe en su `SALVO_EN_ESTE_ARBOL` **lanza al cargar el config** — o sea que añadirla es, por construcción, un cambio coordinado en cinco repositorios. El `src/` de los cuatro sistemas queda fuera; hoy no hay ni una llamada que vigilar |
| — | **Sin tildes ni enie en identificadores** | `identificador-con-tilde` |
| — | **Nada supone un sistema** | `sin-suponer-un-sistema`, con su muestra |
| — | **Ningún paquete se importa por su nombre público** | `sin-nombre-publico-entre-paquetes`, con su muestra |
| — | **Ninguna palabra visible escrita dentro de un componente** | `el-texto-visible-es-dato` (el barrido, con el analizador de TypeScript) más las dos guardas que **montan** el armazón y las piezas con el saco marcado (#19) |
| — | **El arnés del `Request` se importa, no se copia** | `el-arnes-del-request-se-publica.test.ts`, con su muestra: en este árbol el `Request` global se instala en **un solo archivo** —el que lo publica— y `vitest.setup.ts` lo **importa** por ruta relativa. Lo que no puede vigilar es el árbol de un consumidor que no está clonado, y por eso se publica además `el-arnes-del-request-no-se-copia.mjs`, que él corre contra el suyo (#92) |
| — | **Ninguna entrada de `exports` promete un archivo que no está** | `lo-que-exports-promete-existe`, que lee los seis manifiestos tal cual y sale en rojo también ante una forma de `exports` que no sepa leer (#24) |
| 5 | **Ninguna cifra tributaria literal en el código** | `cifra-tributaria-literal`, con su muestra de **cinco formas**. **OPCIONAL**: vive en `PROHIBICIONES_OPCIONALES` y la enciende el sistema que publica las cifras. Está medido por qué no puede ser obligatoria — `export const alicuotaPredial = '0.006';` es, a la vez, el ejemplo de código CORRECTO de `rentas` y lo que esta regla prohíbe (#58) |
| — | **El marco no decide permisos** | `el-marco-no-decide-permisos.test.ts`: `paquetes/shell` no importa `../sesion/`, no importa `../api/` y no llama a `fetch`. El catálogo lleva `acceso`/`tambien` y `accesosDe` los da; **filtrar es del sistema**, antes de pasarle el catálogo al `Armazon` (#67) |
| — | **Ninguna acción de la CI baja de la mayor que declara `node24`** | `las-acciones-corren-en-node-24.test.ts`, con sus muestras. Lee el **directorio** `.github/workflows/` y fija la mayor **medida**, con el `runs.using` literal al lado; lo que decide es ese `runs.using` y **no el número** —`caja` midió un `@v5` que aún declaraba `node20`—. **Sin red al correr**, y lo que no conoce sale en rojo diciéndolo (#93) |

**`fetch` tiene DOS sitios legítimos, y la lista se comprueba entera, no se cuenta.** Uno es el
cliente HTTP. El otro es `paquetes/sesion/identidad.ts`, que lo llama **dos veces** y por el mismo
motivo: ni el canje PKCE ni la sonda del emisor pueden pasar por `solicitar()` — van a Keycloak, el
canje con otro tipo de contenido, sin el token (que es justo lo que va a buscar) y sin el
`problem+json` del backend; la sonda en `no-cors`, sin credenciales y sin leer la respuesta. Las dos
caen dentro del mismo sitio declarado. Mientras el cliente HTTP y la puerta de identidad vivieron en
el mismo `src/api/` de un sistema, una sola excepción las cubría y esto no se veía.

**Si agregas una regla, agrega también la muestra que la viola.** Una regla que no puede fallar no
protege nada.

## Idioma

Español en el dominio, inglés en lo técnico. **Sin tildes en identificadores.** Comentarios, pruebas
y mensajes de commit en español.

## Comandos

```bash
yarn install
yarn verificar               # lint, tipos y pruebas, mas las de capa
yarn test                    # solo las pruebas (SIN las de capa)
yarn test:capas              # las que abren una capa con posicionador. Ver `las-capas-corren.test.ts`
yarn registro                # la guarda de la fila del registro
yarn registro:autoprueba     # sus nueve muestras
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
