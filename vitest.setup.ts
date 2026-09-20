import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * La limpieza del DOM entre pruebas, A MANO.
 *
 * Testing Library la registra sola **solo si el ejecutor expone globales**, y aqui `globals` esta
 * en `false` a proposito: un `describe` que aparece de la nada no dice de donde sale, y el
 * compilador tampoco. El precio es este `afterEach`, y el precio de no pagarlo esta medido:
 * sin el, cada `render` se acumula en el mismo documento y `getByText` empieza a encontrar TRES
 * coincidencias de lo mismo. El rojo que sale habla de un selector ambiguo y no de que falte
 * limpiar, asi que manda a mirar la prueba en vez del arnes.
 */
afterEach(cleanup);

/**
 * EL `Request` DEL ARNES ACEPTA LA SENAL QUE CREA EL DOCUMENTO. **Y ya no esta escrito aqui** (#92).
 *
 * Nacio en este archivo con #90 y a los pocos dias estaba copiado en el `vitest.setup.ts` de otro
 * sistema, con su docblock de treinta lineas, y hacia falta en tres mas. Cinco copias de la misma
 * costura es lo que esta libreria existe para evitar, asi que vive en
 * `@kamayuk/verificaciones/arnes-del-request` —que es donde esta tambien la explicacion entera: por
 * que el `Request` y no los globales del documento— y **este archivo lo importa como uno de los
 * cinco sistemas**, que es lo que hace que la via publicada este probada de verdad.
 *
 * Por RUTA RELATIVA, y no por `@kamayuk/verificaciones/arnes-del-request`: el nombre publico
 * resuelve aqui —este repositorio es raiz de workspaces— y no en el consumidor, que resuelve el
 * symlink a su ruta real (#4). Que lo enchufe y que lo enchufe asi lo vigila
 * `el-arnes-del-request-se-publica.test.ts`, con su muestra.
 *
 * Se monta al importarlo: no hay una segunda linea que se pueda olvidar.
 */
import './paquetes/verificaciones/arnes-del-request.ts';
