module.exports = {
  "env": {
    "es6": true,
    "node": true,
    "mocha": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module"
  },
  "rules": {
    "indent": [
      "error", 4
    ],
    "linebreak-style": [
      "error", "unix"
    ],
    "quotes": [
      "error", "double"
    ],
    "semi": [
      "error", "always"
    ],
    "no-console": 0,
    "no-unused-vars": [
      "error", {
        "argsIgnorePattern": "^_"
      }
    ]
  }
};
