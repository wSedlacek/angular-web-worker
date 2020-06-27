import { WebWorker } from 'angular-web-worker';
import { WorkerClient, WorkerDefinition } from 'angular-web-worker/client';

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
  const privateWorkerDefinition = (client: WorkerClient<any>): WorkerDefinition => {
    return client['definition'];
  };

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
