// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';
const originalConfig = require('./.config/jest.config');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...originalConfig,
  moduleNameMapper: {
      ...originalConfig.moduleNameMapper,
      '^@/(.*)': '<rootDir>/src/$1',
  }
};
