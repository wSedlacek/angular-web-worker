import { WebWorker } from 'angular-web-worker';
import { WorkerDefinition, WorkerClient } from 'angular-web-worker/client';

import { WorkerManager } from './worker-manager';

@WebWorker()
class TestClass {
  name: string = 'random';
}

@WebWorker()
class TestClass2 {
  name: string = 'random22';
}

describe('WorkerManager: [angular-web-worker/client]', () => {
  let manager: WorkerManager;
  function privateWorkerDefinition(client: WorkerClient<any>): WorkerDefinition {
    return client['definition'];
  }

  beforeEach(() => {
    manager = new WorkerManager([{ worker: TestClass, initFn: null }]);
  });

  it('Should create a new worker client with a definition', () => {
    const client = manager.createClient(TestClass);
    expect(privateWorkerDefinition(client)).toEqual({ worker: TestClass, initFn: null });
  });

  it('Should throw an error if the worker class argument does not have a definition', () => {
    expect(() => manager.createClient(TestClass2)).toThrowError();
  });
});
