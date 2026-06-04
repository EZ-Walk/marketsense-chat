/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Helps Jest resolve TS ESM imports that may include ".js" in compiled output
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

