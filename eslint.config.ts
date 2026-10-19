import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import css from "@eslint/css";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/", "dist-electron/", "dist-mcp/", "release/"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    plugins: { js },
    extends: ["js/recommended", tseslint.configs.recommended, pluginVue.configs["flat/essential"]],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    // Pages du routeur (Dashboard, Budget…) et composants de base (Chart, Modal) : noms d'un seul mot assumés
    // `slot="…"` est ici l'attribut HTML natif des composants web @material/web, pas l'ancienne syntaxe Vue 2
    rules: { "vue/multi-word-component-names": "off", "vue/no-deprecated-slot-attribute": "off" },
  },
  { files: ["**/*.vue"], languageOptions: { parserOptions: { parser: tseslint.parser } } },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    // use-baseline fait planter ESLint (Maximum call stack, @eslint/css 2.0.1) et ne sert à rien sous Electron
    rules: { "css/use-baseline": "off" },
  },
]);
