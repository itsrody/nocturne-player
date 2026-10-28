import configMetarhia from 'eslint-config-metarhia';
import globals from 'globals';

const [baseConfig] = configMetarhia;

export default [
  {
    // The vendored own engine is upstream code, carried in whole and
    // read as was written for it: its own repo lints its own style, and
    // the house's rules are for the house's rooms. It is *not* skipped
    // by the privacy scan, which is the one reading that must believe it.
    ignores: ['dist/*', 'artifacts/*', 'node_modules/*', 'src/vendor/*'],
  },
  {
    ...baseConfig,
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ...baseConfig.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Firefox gives content scripts these for talking to the page's own
        // compartment; they are not part of the standard browser globals.
        cloneInto: 'readonly',
        exportFunction: 'readonly',
      },
    },
  },
  {
    files: ['esbuild.config.mjs', 'tools/**/*.mjs', 'test/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
