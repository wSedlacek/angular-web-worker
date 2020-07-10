import {
  CallableMetaData,
  SecretResult,
  WorkerAnnotations,
  WorkerEvents,
} from 'angular-web-worker/common';

import { Callable } from './callable.decorator';

// tslint:disable: max-classes-per-file
class TestClassWithoutOptions {
  @Callable()
  public doSomething(value: string, value2: number): string {
    return value + String(value2);
  }
}

class TestClassWithOptions {
  @Callable({ shallowTransfer: true })
  public doSomething(value: string, value2: number): string {
    return value + String(value2);
  }
}
// tslint:enable: max-classes-per-file

describe('@Callable(): [angular-web-worker]', () => {
  it('should attach metadata to the class prototype', () => {
    expect(
      TestClassWithoutOptions[WorkerAnnotations.Annotation][WorkerAnnotations.Callables].length
    ).toEqual(1);
  });

  it('should attach metadata with the property name', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Callables
      ][0] as CallableMetaData).name
    ).toEqual('doSomething');
  });

  it('should attach metadata with the return type', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Callables
      ][0] as CallableMetaData).returnType
    ).toEqual(String);
  });

  it('should attach metadata with the default options', () => {
    expect(
      (TestClassWithoutOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Callables
      ][0] as CallableMetaData).shallowTransfer
    ).toEqual(false);
  });

  it('should attach metadata with the provided options', () => {
    expect(
      (TestClassWithOptions[WorkerAnnotations.Annotation][
        WorkerAnnotations.Callables
      ][0] as CallableMetaData).shallowTransfer
    ).toEqual(true);
  });

  it('For client instances, it should replace the function implementation to return a secret', () => {
    const instance = new TestClassWithOptions();
    instance[WorkerAnnotations.Config] = {
      isClient: true,
      clientSecret: 'my-secret',
    };

    const result: SecretResult<WorkerEvents.Callable> = {
      propertyName: 'doSomething',
      types: [WorkerEvents.Callable],
      clientSecret: 'my-secret',
      body: {
        args: ['hello', 1],
      },
    };
    expect(instance.doSomething('hello', 1)).toEqual(result);
  });

  it('should not replace the function implementation for worker instances', () => {
    const instance = new TestClassWithOptions();
    instance[WorkerAnnotations.Config] = {
      isClient: false,
    };
    expect(instance.doSomething('twelve', 12)).toEqual('twelve12');
  });

  it('should not replace the function implementation for instances where no config has been set', () => {
    const instance = new TestClassWithOptions();
    expect(instance.doSomething('joe', 20)).toEqual('joe20');
  });
});
