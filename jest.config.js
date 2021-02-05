module.exports = {
  preset: 'ts-jest',

  // Test files are .js and .ts files inside of __tests__ folders and with a suffix of .test or .spec
  testMatch: ['**/__tests__/**/?(*.)+(spec|test).[jt]s'],

  // Included files for test coverage (npm run test:coverage)
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts'
  ],

  setupFiles: ['jest-localstorage-mock' /* @todo remove when migrating InLocalStorage */],
};
