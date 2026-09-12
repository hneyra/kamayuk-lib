import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * El lint de las librerias comunes.
 *
 * Las NUEVE PROHIBICIONES del producto no viven aqui: viven en
 * `paquetes/verificaciones/prohibiciones.mjs`, que es lo que consumen los cuatro sistemas y
 * tambien este mismo archivo. Se enganchan cuando ese paquete exista (paso 8 del plan); hasta
 * entonces este config es la base y nada mas, y el hueco esta dicho aqui para que no se
 * descubra tarde.
 */
export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'paquetes/verificaciones/muestras/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Sin tildes ni enie en identificadores: Checkstyle lo revisa en el backend y ESLint
      // aqui. Es la regla de idioma de la casa, y es la unica de las nueve que no necesita
      // el catalogo compartido para morder.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Identifier[name=/[áéíóúÁÉÍÓÚñÑüÜ]/]',
          message: 'Sin tildes ni enie en identificadores: alicuota, no alícuota.',
        },
      ],
    },
  },
  {
    // Las pruebas pueden nombrar lo que verifican, y varias verifican precisamente que una
    // cadena con tilde llega intacta al usuario.
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
