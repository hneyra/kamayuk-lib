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
