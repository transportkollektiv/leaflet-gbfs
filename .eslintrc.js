module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'airbnb-base'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    L: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    'prefer-destructuring': ['error', {
      'array': false,
      'object': false
    }]
  }
};
