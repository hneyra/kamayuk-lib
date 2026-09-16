# `kamayuk-lib`

Las **librerías comunes del producto Kamayuk**: lo que vale igual en los cuatro sistemas y por
tanto no puede vivir en ninguno.

Lo decide [ADR-0038 — «El corte entre el producto y el suelo»](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0038-el-corte-entre-el-producto-y-el-suelo.md),
que contesta [`D-23b`](https://github.com/hneyra/infrastructure/blob/main/docs/00-gobierno/D-23b-quien-publica-las-librerias-comunes.md),
con un criterio de una línea:

> Si describe el clúster, es de `infrastructure`. Si describe el producto y vale igual en los
> cuatro sistemas, es de **`kamayuk-lib`**. Si sólo vale en uno, es de ese sistema.

Y una regla que lo gobierna, de [ADR-0030 §4](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0030-cuatro-interfaces-una-sesion.md):

> **Una librería común no puede contener lógica de negocio de un contexto.** Si `@kamayuk/ui`
> necesita saber qué es un arbitrio, dejó de ser común y es el monolito otra vez, repartido y sin
> que el build lo vea.

Esa regla no es una intención: la vigila
[`sin-suponer-un-sistema.test.ts`](paquetes/verificaciones/sin-suponer-un-sistema.test.ts), con su
muestra que la viola.

## Los seis paquetes

| Paquete | Qué trae | Estado |
|---|---|---|
| [`@kamayuk/formato`](paquetes/formato) | fechas, importes y documento de identidad | **Existe.** 67 pruebas |
| [`@kamayuk/api`](paquetes/api) | `solicitar()`, `solicitarRespuesta()`, `descargar()`, `subir()`, la clave de idempotencia y el catálogo de errores | **Existe.** 118 pruebas |
| [`@kamayuk/sesion`](paquetes/sesion) | OIDC con PKCE S256, la sonda del emisor, la consola de la cuenta y la escalera de peldaños | **Existe.** 45 pruebas |
| [`@kamayuk/ui`](paquetes/ui) | tokens, tres temas por dos modos, shadcn | Vacío |
| [`@kamayuk/shell`](paquetes/shell) | barra, árbol, paleta, enrutado, fallo | Vacío |
| [`@kamayuk/verificaciones`](paquetes/verificaciones) | las barreras y sus muestras | **Existe.** 13 pruebas |

## Cómo se consume

**Por `link:` a un clon hermano, no por un artefacto publicado.** Es el mismo mecanismo que los
cinco sistemas ya usan para `@kamayuk/infra-contrato`, y el motivo está escrito en
`infrastructure/librerias-backend/README.md`:

> Un jar publicado a mano se queda viejo sin que nada se ponga rojo, y una verificación vieja que
> pasa en verde es exactamente el modo de fallo que este proyecto lleva doscientos issues evitando.

En el `package.json` del sistema que consume:

```json
{
  "dependencies": {
    "@kamayuk/formato": "link:../../kamayuk-lib/paquetes/formato",
    "@kamayuk/api": "link:../../kamayuk-lib/paquetes/api",
    "@kamayuk/sesion": "link:../../kamayuk-lib/paquetes/sesion"
  }
}
```

Los paquetes son **sólo fuente** —`main: index.ts`, sin compilar— así que quien los consume los
compila con su propio Vite, y React, Radix y Tailwind entran como `peerDependencies`.

**Los cuatro frontends pasan a depender de un clon hermano**, y ADR-0038 lo dice sin disimular: *«ésa
es la propiedad que se pierde. A cambio, el marco deja de estar escrito cuatro veces»*.

## Quién la consume, y a quién mide la CI

Con `link:` no hay versión que dé margen: cada `main` de aquí es el `main` de los sistemas. Por eso
el trabajo `consumidores` de [`paquetes.yml`](.github/workflows/paquetes.yml) le corre la suite a
cada consumidor **dos veces** —con la librería en `main` y con la rama del PR— y falla si la rama lo
pone rojo (#10). A quién mide no está escrito en el workflow: lo lee de
[`consumidores.json`](consumidores.json), y lo vigila `los-consumidores-se-miran.test.ts`.

| Sistema | Enlaza `kamayuk-lib` | La CI lo mide |
|---|---|---|
| `rentas` | sí | **sí**, desde #10 |
| `catastro` | sí, desde `catastro`#118 | **sí**, desde #45 |
| `caja` | sí, desde `caja`#83 | **sí**, desde #75 |
| `ciudadano` | sí | **sí**, desde #56 |
| `pcf` | sí, desde su T1 | **sí**, desde #82 |
| `normativa` | no | no |

La columna del medio se midió sobre el `main` de cada sistema el 2026-09-16, contando los
`link:../../kamayuk-lib/paquetes/*` de `frontend/package.json`: seis en `rentas`, `catastro` y
`caja`, **cuatro en `pcf`** —`ui`, `shell`, `api` y `formato`; no enlaza `sesion`, porque su login es
el JWT propio del sistema que porta, ni `verificaciones`—, tres en `ciudadano` y cero en `normativa`. **Un sistema entra en la lista cuando ya enlaza, y no antes**: medirlo
antes sería correr una suite que no lee nada de aquí.

## Comandos

```bash
yarn install
yarn verificar     # lint, tipos y pruebas
yarn registro      # la guarda de la fila del registro
```

## Qué NO hay aquí

- **Nada de un solo sistema.** Ni un prefijo de ruta, ni un catálogo de módulos, ni una palabra del
  vocabulario tributario. Lo vigila `sin-suponer-un-sistema`.
- **Los módulos de backend** —`comun-dominio`, `comun-plataforma`, `comun-integracion`,
  `comun-gobierno` y `comun-verificaciones`— que ADR-0038 también manda traer aquí. Llegan por su
  propio camino (`infrastructure`#22, #23, #24); mezclarlos con la primera interfaz haría imposible
  saber qué rompió qué.
