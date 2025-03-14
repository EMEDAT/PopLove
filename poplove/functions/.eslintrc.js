module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    // Disable common issues in your errors list
    "quotes": ["off"],
    "max-len": ["off"],
    "no-trailing-spaces": ["off"],
    "require-jsdoc": ["off"],
    "comma-dangle": ["off"],
    "object-curly-spacing": ["off"],
    "arrow-parens": ["off"],
    "@typescript-eslint/no-explicit-any": ["off"],
    "eol-last": ["off"],
    "import/no-duplicates": ["off"],
    "import/no-unresolved": "off"
  },
};