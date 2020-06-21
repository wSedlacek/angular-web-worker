import { WorkerAnnotations, ShallowTransferParamMetaData } from 'angular-web-worker/common';

import { ShallowTransfer } from './shallow-transfer.decorator';

class TestClass {
  doSomething(name: string, @ShallowTransfer() age: number) {}
}

describe('@ShallowTransfer() [angular-web-worker]', () => {
  it('Should attach metadata to the class prototype', () => {
    expect(
      TestClass[WorkerAnnotations.Annotation][WorkerAnnotations.ShallowTransferArgs].length
    ).toEqual(1);
  });

  it('Should attach metadata with the method name', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).name
    ).toEqual('doSomething');
  });

  it('Should attach metadata with the argument type', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).type
    ).toEqual(Number);
  });

  it('Should attach metadata with the argument index', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).argIndex
    ).toEqual(1);
  });
});
