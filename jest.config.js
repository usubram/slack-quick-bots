export default {
  verbose: true,
  clearMocks: true,
  setupFiles: ['./test/setup/testsetup.js'],
  setupFilesAfterEnv: ['./test/setup/teardown.js'],
  testEnvironment: 'node',
  transform: {},
};
