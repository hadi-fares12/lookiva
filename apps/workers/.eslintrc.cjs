module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'no-console': 'off',
  },
};
