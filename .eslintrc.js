module.exports = {
  "env": {
    "browser": true,
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2017,
  },
  "rules": {
    "max-len": "error",
    "camelcase": "off",
    "no-unused-vars": "warn",
    "no-console": "off",
    "no-var": "error",
    "prefer-const": "warn",
    "no-multi-spaces": "error",
    "no-trailing-spaces": "error",
    "prefer-arrow-callback": "error",
    "sort-imports": [
      "error",
    ],
    "arrow-parens": ["error", "as-needed"],
    "arrow-body-style": ["error", "as-needed"],
    "eqeqeq": "error",
    "prefer-template": "error",
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
      "never",
    ],
    "curly": [
      "error",
      "multi",
    ],
  },
};
