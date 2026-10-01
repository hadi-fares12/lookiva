const base = require("./base.js");
const nextPlugin = require("@next/eslint-plugin-next");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const reactPlugin = require("eslint-plugin-react");

module.exports = {
  ...base,
  plugins: {
    ...base.plugins,
    "@next/next": nextPlugin,
    "react-hooks": reactHooksPlugin,
    react: reactPlugin,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    ...base.rules,
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    ...reactHooksPlugin.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/display-name": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@next/next/no-html-link-for-pages": "off",
  },
};
