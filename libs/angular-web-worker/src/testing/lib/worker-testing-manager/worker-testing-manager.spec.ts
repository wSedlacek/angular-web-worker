import { MockWorker } from 'angular-web-worker/mocks';
import { WorkerTestingClient } from 'angular-web-worker/testing';

import { createTestManager, WorkerTestingManager } from './worker-testing-manager';

describe('WorkerTestingManager: [angular-web-worker/testing]', () => {
  let manager: WorkerTestingManager;
  beforeEach(() => {
    manager = new WorkerTestingManager([MockWorker]);
  });

  it('should to create a new instance of a worker client', () => {
    expect(manager.createClient(MockWorker)).toBeInstanceOf(WorkerTestingClient);
  });

  it('should through an error if no worker classes are provided', () => {
    expect(() => new WorkerTestingManager(null as any)).toThrowError();
  });
});

describe('createTestManager(): [angular-web-worker/testing]', () => {
  it('should create a new instance of a TestWorkerManager', () => {
    expect(createTestManager([MockWorker])).toBeInstanceOf(WorkerTestingManager);
  });
});
