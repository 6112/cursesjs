module.exports = {
  "env": {
    "browser": true,
    "es6": true,
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "module",
  },
  "rules": {
    "max-len": "error",
    "camelcase": "off",
    "no-unused-vars": "warn",
    "no-console": "off",
    "no-var": "error",
    "prefer-const": "warn",
    "indent": [
      "warn",
      2, {
        "CallExpression": { "arguments": "first" },
        "ArrayExpression": "first",
      },
    ],
    "linebreak-style": [
      "error",
      "unix",
    ],
    "quotes": [
      "error",
      "double",
    ],
    "semi": [
      "error",
      "always",
    ],
  },
};
