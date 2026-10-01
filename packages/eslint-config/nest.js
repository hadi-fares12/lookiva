const base = require("./base.js");
const nestjsPlugin = require("@darraghor/eslint-plugin-nestjs-typed");

module.exports = {
  ...base,
  plugins: {
    ...base.plugins,
    "@darraghor/nestjs-typed": nestjsPlugin,
  },
  rules: {
    ...base.rules,
    "@darraghor/nestjs-typed/injectable-should-be-provided": "warn",
    "@darraghor/nestjs-typed/all-properties-are-whitelisted": "warn",
    "@darraghor/nestjs-typed/all-whitelisted-properties-are-defined": "warn",
    "@darraghor/nestjs-typed/api-enum-property-best-practices": "warn",
    "@darraghor/nestjs-typed/api-property-should-be-typed": "warn",
    "@darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator": "warn",
  },
};
