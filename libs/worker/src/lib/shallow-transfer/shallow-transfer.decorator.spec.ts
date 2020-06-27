import { ShallowTransferParamMetaData, WorkerAnnotations } from 'angular-web-worker/common';

import { ShallowTransfer } from './shallow-transfer.decorator';

class TestClass {
  public doSomething(_name: string, @ShallowTransfer() _age: number): void {}
}

describe('@ShallowTransfer() [angular-web-worker]', () => {
  it('should attach metadata to the class prototype', () => {
    expect(
      TestClass[WorkerAnnotations.Annotation][WorkerAnnotations.ShallowTransferArgs].length
    ).toEqual(1);
  });

  it('should attach metadata with the method name', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).name
    ).toEqual('doSomething');
  });

  it('should attach metadata with the argument type', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).type
    ).toEqual(Number);
  });

  it('should attach metadata with the argument index', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.ShallowTransferArgs
      ][0] as ShallowTransferParamMetaData).argIndex
    ).toEqual(1);
  });
});
