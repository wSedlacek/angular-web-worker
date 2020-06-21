import { WorkerAnnotations, SubscribableMetaData } from 'angular-web-worker/common';
import { Subject } from 'rxjs';

import { Subscribable } from './subscribable.decorator';

class TestClass {
  @Subscribable()
  public event: Subject<any>;
}

describe('@Subscribable(): [angular-web-worker]', () => {
  it('Should attach metadata to the class prototype', () => {
    expect(TestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Observables].length).toEqual(
      1
    );
  });

  it('Should attach metadata with the property name', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.Observables
      ][0] as SubscribableMetaData).name
    ).toEqual('event');
  });

  it('Should attach metadata with the design type', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.Observables
      ][0] as SubscribableMetaData).type
    ).toEqual(Subject);
  });
});
