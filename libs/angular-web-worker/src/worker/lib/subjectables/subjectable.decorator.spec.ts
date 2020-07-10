import { SubjectableMetaData, WorkerAnnotations } from 'angular-web-worker/common';
import { Subject } from 'rxjs';

import { Subjectable } from './subjectable.decorator';

class TestClass {
  @Subjectable()
  public event: Subject<any> = new Subject();
}

describe('@Subjectable(): [angular-web-worker]', () => {
  it('Should attach metadata to the class prototype', () => {
    expect(TestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Subjectables].length).toEqual(
      1
    );
  });

  it('Should attach metadata with the property name', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.Subjectables
      ][0] as SubjectableMetaData).name
    ).toEqual('event');
  });

  it('Should attach metadata with the design type', () => {
    expect(
      (TestClass[WorkerAnnotations.Annotation][
        WorkerAnnotations.Subjectables
      ][0] as SubjectableMetaData).type
    ).toEqual(Subject);
  });
});
