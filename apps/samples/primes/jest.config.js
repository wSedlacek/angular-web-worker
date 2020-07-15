module.exports = {
  name: 'samples-primes',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/apps/samples/primes',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
