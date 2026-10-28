import configMetarhia from 'eslint-config-metarhia';
import globals from 'globals';

const [baseConfig] = configMetarhia;

export default [
  {
    // Two vendor files, two manners. `hls.mjs` is upstream code,
    // carried in whole and read as was written for it: its own repo
    // lints its own style, and the house's rules are for the house's
    // rooms. It is *not* skipped by the privacy scan, which is the one
    // reading that must believe it. `prebuf.mjs` is the house's own
    // room and lints like one — leave it in.
    ignores: ['dist/*', 'artifacts/*', 'node_modules/*', 'src/vendor/hls.mjs'],
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
    // The `.mjs` rooms of src are house rooms too — the pre-buffer the
    // page’s compartment imports is one — and lint like one.
    files: ['src/**/*.js', 'src/**/*.mjs'],
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
