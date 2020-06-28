module.exports = {
  name: 'samples-basic',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/apps/samples/basic',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
