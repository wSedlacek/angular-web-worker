import { WebWorker } from 'angular-web-worker';
import { createTestClient } from 'angular-web-worker/testing';

import { FakeWorker } from '../mocks';
import { WorkerTestingClient } from './worker-testing-client';

// tslint:disable: max-classes-per-file
@WebWorker()
class TestClass {
  public property = 'propertyvalue';
}

class UndecoratedClass {}
// tslint:enable: max-classes-per-file

describe('WorkerTestingClient: [angular-web-worker/testing]', () => {
  let worker: WorkerTestingClient<TestClass>;
  beforeEach(() => {
    worker = new WorkerTestingClient<TestClass>({
      target: TestClass,
      useWorkerFactory: () => new FakeWorker(),
    });
  });

  it('should be configured for testing', () => {
    expect(worker['isTestClient']).toEqual(true);
    expect(worker['runInApp']).toEqual(true);
  });

  it('should provide access to the underlying worker instance', () => {
    expect(worker.workerInstance instanceof TestClass).toEqual(true);
  }, 200);
});

describe('createTestWorker(): [angular-web-worker/testing]', () => {
  it('Should create a new instance of a TestWorkerClient', () => {
    expect(createTestClient(TestClass) instanceof WorkerTestingClient).toEqual(true);
  });

  it('should throw an error if an undecorated class is provided', () => {
    expect(() => createTestClient(UndecoratedClass)).toThrow();
  });
});
