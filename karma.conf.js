const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: ['./tests.ts', '**/*.spec.ts'],
    mode: 'development',
    reporters: ['kjhtml'],
    preprocessors: {
      '**/*.ts': ['webpack'],
    },
    webpack: {
      node: {
        fs: 'empty',
        child_process: 'empty',
      },
      resolve: {
        extensions: ['.js', '.ts', '.tsx'],
        plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.spec.json' })],
        alias: {
          'angular-web-worker/common': path.resolve(__dirname, 'common/src/public-api.ts'),
        },
      },
      mode: 'development',
      stats: {
        warnings: false,
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: [/node_modules/],
            use: {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.spec.json',
              },
            },
          },
        ],
      },
    },
    port: 9867,
    browsers: ['Chrome'],
    logLevel: config.LOG_INFO,
    colors: true,
    client: {
      clearContext: false,
    },
    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly'],
    },
    autoWatch: true,
    singleRun: false,
  });
};
