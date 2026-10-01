const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const prettierCompat = require("eslint-config-prettier");

module.exports = {
  files: ["**/*.{ts,tsx,js,jsx}"],
  ignores: ["dist/**", ".next/**", "node_modules/**", "build/**", "coverage/**"],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
  },
  rules: {
    ...tseslint.configs.recommended.rules,
    ...prettierCompat.rules,
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};
