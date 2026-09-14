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

| Pieza | Estado |
|---|---|
| `paquetes/formato` — `@kamayuk/formato` | **Existe.** Fechas, importes y documento de identidad, copiado **verbatim** de `rentas/frontend/src/dominio/`. **67 pruebas.** Es la hoja limpia del grafo: no importa nada de nadie. Le faltan `codigo predial` y `placa`, que ADR-0030 §4 le encarga y **no se inventan**: entran el día que el sistema dueño del dato diga cuál es su forma |
| `paquetes/api` — `@kamayuk/api` | **Existe.** `ErrorDeLaApi` y `crearCliente({ prefijo, token })`. **No se extrajo: se diseñó** — medido el 2026-09-12, los tres clientes de `rentas`, `normativa` y `catastro` tenían **tres clases de error incompatibles** y compartían 45 líneas de 135. **Y desde #43 baja documentos**: `Cliente.descargar(ruta, { nombre?, senal? })` devuelve `{ nombre, tipoDeMedio, contenido: Blob }` **sin tocar el DOM** —sus pruebas corren en entorno `node`, donde no hay `document`—, con el mismo prefijo, token y `ErrorDeLaApi` que `solicitar`; un 200 con JSON **lanza** `NoEsUnDocumento` —subclase de `ErrorDeLaApi`, no un `codigo` inventado—, y el nombre sale de `Content-Disposition` antes que del argumento. Entregarlo es otra función, `entregarAlNavegador(documento)`, la única del paquete que toca el DOM: medida en Chromium 151 con la URL revocada al volver del clic, 5 MiB byte a byte. **52 pruebas** |
| `paquetes/sesion` — `@kamayuk/sesion` | **Existe.** `crearIdentidad(config)` con PKCE S256 y `peldanoDe()` con sus **siete** peldaños. Venía de `rentas`, el único de los cuatro que se autenticaba, y **nada dentro nombraba a `rentas`**: lo único que lo ataba eran tres datos, hoy parámetros. **Y desde #42 alcanza a la copia de `rentas`, que siguió aprendiendo sin la librería**: `entrar()` pregunta al documento de descubrimiento antes de navegar y devuelve `FallaDeLaPuerta` si el emisor no contesta (`rentas`#112), y `urlDeLaCuenta()`/`abrirLaCuenta()` llevan a la consola de cuenta de Keycloak derivándola del realm (`rentas`#115). La sonda sube con **una línea que la de `rentas` no tiene**, `credentials: 'omit'`: medido en Chromium, con el emisor en el mismo origen que la interfaz —que es el caso del clúster, `https://<dominio>/keycloak/…`— la de `rentas` le manda las cookies de la sesión. **45 pruebas** (eran 33) |
| `paquetes/ui` — `@kamayuk/ui` | **Capa 1 hecha (#6).** Los **42** tokens del artboard en un `@theme` de Tailwind v4 —38 colores, 2 radios, 2 sombras—, `Importe`/`Insignia`/`FechaDeCalculo`/`Icono` y los trazos con nombre genérico. **15 pruebas** más las barreras de tipo. **Capa 2 hecha (#8)**: seis paletas —tres identidades × dos modos— derivadas de la del artboard con reglas en OKLCH, el `ProveedorDeTema` y el primer componente de shadcn. **56 pruebas.** **Capa 3 hecha (#11)**: las once piezas de shadcn que el interprete de V8 pide en cada pantalla, mas la tabla de que pieza dibuja cada uno de los siete tipos de campo. **Capa 4 hecha (#13)**: las siete piezas del armazon —`Miga`, `Plegable`, `Menu`, `Confirmacion`, `Cajon`, `PaletaDeMando` y `Avisos`—, sobre Radix, `cmdk` y `sonner`. Los demas componentes de shadcn entran cuando se usen. **Capa 5 hecha (#27)**: el **interprete de pantallas** sube de `rentas` con el segundo consumidor, `caja` —`interprete/Pantalla.tsx` y sus tres piezas, y los tipos de la definicion con nombre `Definicion…` porque `Campo` y `Tabla` ya son piezas—. Lo que en `rentas` salia de `i18next` y de su `tono.ts` entra por `props`: `traducir` (tal cual por omision), `textos` (las tres palabras propias, en `textos.tsx`) y `tonoDeLaInsignia`, **obligatoria**. El arbol, las definiciones y el vocabulario de tonos se quedan en cada sistema. Al subir, `shadcn/foco.test.ts` destapo que el disparador de fecha escribia el anillo de foco a mano: hoy toma `CONTROL`. **Y desde #19 no escribe ni una palabra**: las **seis** que decia por su cuenta viven en `textos.tsx` y entran por `props` con valor por omision. Ahi se destapo que `cmdk` montaba su lista como `aria-label="Suggestions"`, el mismo defecto que `sonner` tenia en #13. **Y desde #23 las seis paletas SALEN del paquete**: `estilos/temas.css` existia, estaba bien escrito y **no lo importaba nadie** —medido sobre el `dist` de `rentas`: `data-tema` 0, `data-modo` 0, `prefers-color-scheme` 0—. Lo arrastra `estilos.css` con un `@import`, y no una entrada aparte, porque el segundo `import` que el consumidor puede olvidar deja exactamente el defecto de hoy sin que nada lo diga. Lo vigila una guarda **sobre el CSS emitido**, que compila la hoja publicada como la compila Vite. **Y desde #33 el oscuro se lo dice al navegador**: los tres bloques oscuros declaran `color-scheme: dark` —**seis** sitios, cada uno por sus dos caminos— y así los controles nativos, la barra de desplazamiento y el fondo previo del lienzo dejan de quedarse claros bajo una paleta oscura. La propiedad la emite `temas/generar.ts` y `temas.css` se regenera: **no se toca a mano**. Lo vigila la misma guarda del CSS emitido, buscando **la propiedad dentro de su regla** y no la cadena — que sale **diez** veces en el CSS, tres de ellas en el preludio de un `@media` donde no declara nada. **Y desde #56 hay una cuarta identidad, `clasico`, y una SEGUNDA paleta de origen**: `estilos/clasico.css`, que no se importa sino que se lee —como el `@theme`—, y de la que sale `clasico/claro` tal cual (los 38 colores y `--font-sans: Arial`) y `clasico/oscuro` derivado con reglas. Cada identidad sale de **un** origen (`ORIGEN_DE` en `temas/derivar.ts`), y `derivar()` recibe todos los origenes y elige: pasarle a una identidad la base de otra deja de ser posible. Los nueve bloques de las otras tres identidades en `temas.css` son byte a byte los de antes, y lo vigila una huella por bloque; la fuente se mide con la cascada del CSS emitido resuelta hasta `<html>` (`temas/la-fuente-es-de-la-identidad.test.ts`). **Y desde #44 el intérprete tiene punto de extensión y estados de una lectura**: `bloques` admite, además del bloque de #27, un `aviso`, el `pie` de operaciones y una pieza `delConsumidor` cuya `clave` se busca en `<Pantalla piezas>` —sin registrar, un aviso visible—; toda pieza salvo el pie puede declarar `lectura` (`en-espera`, `pidiendo`, `fallo` con el peldaño **ya resuelto** por el sistema, `con-datos`), `cuando` y `fallosDe`; los textos pueden llevar un dato (`plantilla`, `desde`, `segun`) de `datos.nombrados`, y el bloque gana `pie`. **`DefinicionDePantalla` es genérica con el valor por omisión de hoy** y `TextosDelInterprete` **no gana claves** —van en `TEXTOS_DE_LAS_PIEZAS`—: las dos cosas, medidas, rompían la compilación de `rentas`. Un ejemplo por hueco en `interprete/muestras.ts`, que la prueba monta uno a uno. **Y desde #66 la hoja HACE**: `bloques` admite `{ tipo: 'acto' }` —un formulario con la **observación obligatoria en el tipo** (regla 10), en un área de texto y con su `largo: { minimo, maximo }` como dato sin valor por omisión; `advertencia` pide la `Confirmacion`; lo envía el manejador de `<Pantalla actos>`, que puede devolver una promesa— y el bloque gana `acciones` (`abre` un acto, `va` a otra hoja por `<Pantalla navegacion>`, `hace` una operación de `alHacer`). Lo impedido sale con **`BotonConMotivo`**: `aria-disabled` y `aria-describedby` hacia el motivo visible, **nunca `disabled`** |
| `paquetes/shell` — `@kamayuk/shell` | **Existe (#13).** El armazón de V8: barra global, carril de módulos plegable con filtro, paleta de mando (`Ctrl/Cmd+K`), cabecera con miga, acciones al pie y el aviso de cambios sin guardar. **No se extrajo: se reescribió** — había cuatro implementaciones divergentes (445 líneas de diferencia sólo entre `rentas` y `normativa`, y `catastro` con todo dentro de un archivo de 1 238). **El catálogo de módulos y destinos entra por parámetro** y el enrutado es por hash con `createHashRouter`, con **una sola ruta** y el destino resuelto en el render: lo que el catálogo no trae no se ofrece en el árbol, ni en la paleta, ni en la miga, **ni por el hash**. **Hasta #20 había una ruta por destino ofrecido, y por eso el armazón reventaba si su catálogo cambiaba después de montar** —que es el caso normal: el catálogo sale de la red—. El enrutador se construye **una vez**, y la propiedad de que nada se abra por el hash la sostiene el mismo dato que dibuja las tres listas. **Y desde #19 tampoco escribe una palabra**: las **32** que decía por su cuenta entran por `<Armazon textos={…} />`, un `Partial` con el castellano por omisión, **sin ninguna `peerDependency` nueva** — `i18next` obligaría a los cuatro sistemas a montarlo antes de dibujar un botón. **66 pruebas**. **Y desde #66 una pantalla puede ir a otra hoja**: `useNavegacion()` da `{ ofrece, ir }` sobre el mismo índice del catálogo y el mismo `irA` que el árbol —lo no ofrecido no se abre ni pregunta; con la hoja sucia salta el aviso—, y el sujeto y los parámetros los escribe **solo** `ubicacionDe`. **Y desde #67 el estado de una hoja vive en la ruta**: `#/<slug>/<sujeto>?<parametro>=<valor>`, sólo lo que `Destino.enLaRuta` declara —lo demás se ignora con aviso, y `#/<slug>` sigue siendo la de las 40 hojas de `rentas`—; `ubicacionDe` escribe esa forma y `leerLaRuta` la lee, así que `ir` y `useHoja().ruta` dicen lo mismo. `useHoja()` gana `ruta`, `moverLaRuta` y `marco`; la pantalla lleva `key` por destino; `Destino` gana `acceso`/`tambien` —que el marco **no usa**: no importa `@kamayuk/sesion` ni `@kamayuk/api`, lo vigila `el-marco-no-decide-permisos`— y `aSangre`, y el `Armazon`, `marco` y `enLaBarra`. En el intérprete, `maestroDetalle` y `pestanas` escriben la ruta y la restituyen por `<Pantalla hoja={useHoja()}>` |
| `paquetes/verificaciones` — `@kamayuk/verificaciones` | **Existe.** Las **nueve prohibiciones** de ESLint con sus nueve muestras, `sin-suponer-un-sistema`, `sin-nombre-publico-entre-paquetes`, `las-capas-corren`, `los-consumidores-se-miran` y —desde #19— `el-texto-visible-es-dato` mas el arnes de marcas que usan las dos guardas montadas. **Y desde #24 `lo-que-exports-promete-existe`**, que lee los seis `package.json` TAL CUAL —no una lista escrita a mano— y comprueba que las **20 promesas** de hoy (8 subrutas de `exports` mas 12 `main`/`types`) apuntan a un archivo que existe y que es un archivo; y que una forma de `exports` que no sepa leer —condicional anidado, array, el atajo de condiciones— sale **en rojo diciendolo** en vez de pasar en verde. **Y desde #26 `rama-del-consumidor.mjs`**, que decide contra que rama del consumidor se mide un PR leyendola de su cuerpo, con sus muestras y su ensayo contra un remoto de verdad. **Y desde #42 el rojo de las guardas de texto nombra la línea DEL ARCHIVO**: `sinComentarios` vaciaba cada comentario de bloque en un solo espacio y se llevaba sus saltos de línea, así que un `'/rentas/api/v1'` escrito en la línea 297 de `identidad.ts` salía como `identidad.ts:129`, en mitad de un docblock. **87 pruebas.** Le faltan los tokens contra el artboard y el contraste |
| La guarda de la fila del registro | **Existe**, con su autoprueba de **nueve muestras**, adaptada a la forma de este repositorio |

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
  api/       cliente.ts (ErrorDeLaApi + NoEsUnDocumento + crearCliente), entregar.ts (entregarAlNavegador)
  sesion/    identidad.ts (crearIdentidad), escalera.ts (peldanoDe)
  ui/        los tokens, las cuatro identidades y sus dos origenes, los componentes de shadcn (once + siete) y textos.tsx
  shell/     el armazon: catalogo.ts, busqueda.ts, acciones.ts, textos.ts y las siete piezas
  verificaciones/  texto.ts, suposiciones.ts, marcas.ts, rama-del-consumidor.mjs, sus pruebas y sus muestras/
docs/
  agent/HISTORY.md            el registro «Verificar antes de afirmar»
  00-gobierno/                la guarda de la fila y su autoprueba
```

Los paquetes se importan entre sí **por ruta relativa**, y no hay `paths` ni `alias`. Es lo
contrario de lo que este archivo decía hasta #4, y el motivo está medido: un import por el nombre
público resolvía **aquí** —este repositorio es raíz de workspaces y yarn crea
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

**Las nueve prohibiciones de ESLint viven aquí desde #4**, en
`paquetes/verificaciones/prohibiciones.mjs`, y este repositorio se lint a sí mismo con ellas. El
motivo de mudarlas es un hueco medido: el código enlazado **no lo lintaba nadie** —el config de cada
sistema ignora `node_modules`, que es donde el `link:` lo deja—, así que entraba al bundle código
que formatea dinero y compone peticiones sin ninguna de las cuatro prohibiciones de importes.

| # | Regla | Dónde muerde |
|---|---|---|
| 1 | **Importes en texto decimal, jamás `number`** | cuatro prohibiciones, más `@kamayuk/formato`: ni un `Number` ni un `Date` en todo el paquete |
| 2 | **Ningún método recibe `municipalidadId`** | prohibición `municipalidad-en-el-cliente`, más una prueba que espía lo que sale por el cable |
| 8 | **`alicuota`, nunca `tasa`** | prohibición `tasa-en-vez-de-alicuota` |
| — | **`fetch` sólo donde debe** | `fetch-fuera-del-cliente`, con **dos** excepciones declaradas |
| — | **Sin tildes ni enie en identificadores** | `identificador-con-tilde` |
| — | **Nada supone un sistema** | `sin-suponer-un-sistema`, con su muestra |
| — | **Ningún paquete se importa por su nombre público** | `sin-nombre-publico-entre-paquetes`, con su muestra |
| — | **Ninguna palabra visible escrita dentro de un componente** | `el-texto-visible-es-dato` (el barrido, con el analizador de TypeScript) más las dos guardas que **montan** el armazón y las piezas con el saco marcado (#19) |
| — | **Ninguna entrada de `exports` promete un archivo que no está** | `lo-que-exports-promete-existe`, que lee los seis manifiestos tal cual y sale en rojo también ante una forma de `exports` que no sepa leer (#24) |

**`fetch` tiene DOS sitios legítimos, y son dos desde #4.** Lo destapó la propia prohibición al
mudarse, con un rojo en `paquetes/sesion/identidad.ts:282`: el canje PKCE llama a `fetch`, y ese
canje **no puede pasar por `solicitar()`** — va a Keycloak, con otro tipo de contenido, sin el token
(que es justo lo que va a buscar) y sin el `problem+json` del backend. Mientras el cliente HTTP y la
puerta de identidad vivieron en el mismo `src/api/` de un sistema, una sola excepción las cubría y
esto no se veía. La lista se **comprueba entera**, no se cuenta. **Desde #42 ese archivo llama a
`fetch` dos veces**: la segunda es la sonda del emisor, que tampoco puede pasar por `solicitar()` —va
a Keycloak, en `no-cors`, sin credenciales y sin leer la respuesta— y cae dentro del mismo sitio
declarado, así que la lista no crece.

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
