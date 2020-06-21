const nrwl = require('./nwrl.config');

module.exports = {
  ...nrwl,
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
  globals: {
    'ts-jest': {
      stringifyContentPathRegex: '\\.html$',
      tsConfig: '<rootDir>/tsconfig.spec.json',
      astTransformers: [
        'jest-preset-angular/build/InlineFilesTransformer',
        'jest-preset-angular/build/StripStylesTransformer',
      ],
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
