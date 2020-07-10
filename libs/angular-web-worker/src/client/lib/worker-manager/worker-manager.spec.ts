import { WebWorker } from 'angular-web-worker';
import { MockWorker } from 'angular-web-worker/mocks';
import { FakeWorker } from 'angular-web-worker/testing';

import { WorkerManager } from './worker-manager';

@WebWorker()
class TestClass {
  public name = 'random';
}

describe('WorkerManager: [angular-web-worker/client]', () => {
  let manager: WorkerManager;

  beforeEach(() => {
    manager = new WorkerManager([{ target: MockWorker, useWorkerFactory: () => new FakeWorker() }]);
  });

  it('Should throw an error if the worker class argument does not have a definition', () => {
    expect(() => manager.createClient(TestClass)).toThrowError();
  });
});
