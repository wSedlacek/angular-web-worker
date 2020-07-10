import { WorkerAnnotations, WorkerConfig } from 'angular-web-worker/common';

import { WebWorker } from './web-worker.decorator';

@WebWorker()
class WorkerTestClass {
  public name: string;

  constructor() {
    this.name = 'Peter';
  }
}

describe('@WebWorker(): [angular-web-worker]', () => {
  it('should attach metadata', () => {
    expect(WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.IsWorker]).toEqual(true);
  });

  it('should attach metadata with a factory function', () => {
    expect(typeof WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory]).toEqual(
      'function'
    );
  });

  describe('Worker factory', () => {
    const config: WorkerConfig = {
      isClient: false,
    };
  });

  // TODO: Setup real test that meaningfully check the functionality of this decorator
});
