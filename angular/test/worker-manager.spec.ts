import { WorkerManager, WorkerDefinition, WorkerClient } from './../src/public-api';
import { AngularWebWorker } from './../../worker/src/public-api';

@AngularWebWorker()
class TestClass {
  name: string = 'random';
}

@AngularWebWorker()
class TestClass2 {
  name: string = 'random22';
}

describe('WorkerManager: [angular-web-worker/angular]', () => {
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
