import { WebWorker } from 'angular-web-worker';
import { FakeWorker } from 'angular-web-worker/testing';

import { WorkerManager } from './worker-manager';

// tslint:disable: max-classes-per-file
@WebWorker()
class TestClass {
  public name = 'random';
}

@WebWorker()
class TestClass2 {
  public name = 'random22';
}
// tslint:enable: max-classes-per-file

describe('WorkerManager: [angular-web-worker/client]', () => {
  let manager: WorkerManager;

  beforeEach(() => {
    manager = new WorkerManager([{ target: TestClass, useWorkerFactory: () => new FakeWorker() }]);
  });

  it('Should throw an error if the worker class argument does not have a definition', () => {
    expect(() => manager.createClient(TestClass2)).toThrowError();
  });
});
