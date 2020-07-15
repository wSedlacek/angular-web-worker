import { MockWorker, UndecoratedWorker } from 'angular-web-worker/mocks';
import { createTestClient } from 'angular-web-worker/testing';

import { FakeWorker } from '../mocks';
import { WorkerTestingClient } from './worker-testing-client';

describe('WorkerTestingClient: [angular-web-worker/testing]', () => {
  let worker: WorkerTestingClient<MockWorker>;
  beforeEach(() => {
    worker = new WorkerTestingClient<MockWorker>({
      target: MockWorker,
      useWorkerFactory: () => new FakeWorker(),
    });
  });

  it('should provide access to the underlying worker instance', async () => {
    await worker.connectionCompleted$.toPromise();
    expect(worker.workerInstance).toBeInstanceOf(MockWorker);
  }, 200);
});

describe('createTestWorker(): [angular-web-worker/testing]', () => {
  it('Should create a new instance of a TestWorkerClient', () => {
    expect(createTestClient(MockWorker)).toBeInstanceOf(WorkerTestingClient);
  });

  it('should throw an error if an undecorated class is provided', () => {
    expect(() => createTestClient(UndecoratedWorker)).toThrow();
  });
});
