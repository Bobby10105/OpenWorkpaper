const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
const customJestConfig = {
  setupFilesAfterEnv: [],
  testEnvironment: 'node'
};
module.exports = createJestConfig(customJestConfig);
