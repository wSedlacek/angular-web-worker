import { WorkerAnnotations, AccessibleMetaData } from 'angular-web-worker/common';

import { Accessible } from './accessible.decorator';

class TestClassWithoutOptions {
  @Accessible()
  public property: string;
}

class TestClassWithOptions {
  @Accessible({
    get: false,
    set: false,
    shallowTransfer: true,
  })
  public property: string;
  public property2: string;
  constructor() {}
}

describe('@Accessible(): [angular-web-worker]', () => {
  it('Should attach metadata to the class prototype', () => {
    expect(
      TestClassWithoutOptions[WorkerAnnotations.Annotation][WorkerAnnotations.Accessibles].length
    ).toEqual(1);
  });

  it('Should attach metadata with the property name', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).name
    ).toEqual('property');
  });

  it('Should attach metadata with the design type', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).type
    ).toEqual(String);
  });

  it('Should attach metadata with the default options', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).get
    ).toEqual(true);
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).set
    ).toEqual(true);
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).shallowTransfer
    ).toEqual(false);
  });

  it('Should attach metadata with the provided options', () => {
    expect(
      (TestClassWithOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).get
    ).toEqual(false);
    expect(
      (TestClassWithOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).set
    ).toEqual(false);
    expect(
      (TestClassWithOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Accessibles
      ][0] as AccessibleMetaData).shallowTransfer
    ).toEqual(true);
  });
});
