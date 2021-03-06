module.exports = {
  "extends": [
    "airbnb-base",
  ],
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 8,
    "ecmaFeatures": {
      // "jsx": true,
      "experimentalObjectRestSpread": true,
    }
  },
  "globals": {
    "jest": false
  },
  "rules": {
    "max-len": ["error", 80, {
      "ignoreStrings": true,
      "comments": 100
    }],
    "linebreak-style": ["error", "unix"],
    "no-console": "off",
    "quotes": ["error", "single", { "avoidEscape": true }],
    "semi-style": ["error", "first"],
    "semi": ["error", "never"],
    "space-before-function-paren": ["error", "always"],
    "func-style": ["error", "expression", { "allowArrowFunctions": true }],
    "func-names": ["error", "as-needed"],
    "import/no-extraneous-dependencies": ["error", {"devDependencies": ["**/*.test.js", "rollup.config.js"]}],
  }
}
