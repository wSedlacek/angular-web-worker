import { WebWorker } from 'angular-web-worker';
import { WorkerTestingClient } from 'angular-web-worker/testing';

import { createTestManager, WorkerTestingManager } from './worker-testing-manager';

// tslint:disable: max-classes-per-file
@WebWorker()
class TestClass {
  public property = 'propertyvalue';
}
// tslint:enable: max-classes-per-file

describe('WorkerTestingManager: [angular-web-worker/testing]', () => {
  let manager: WorkerTestingManager;
  beforeEach(() => {
    manager = new WorkerTestingManager([TestClass]);
  });

  it('should to create a new instance of a worker client', () => {
    expect(manager.createClient(TestClass) instanceof WorkerTestingClient).toEqual(true);
  });

  it('should through an error if no worker classes are provided', () => {
    expect(() => new WorkerTestingManager(null as any)).toThrowError();
  });
});

describe('createTestManager(): [angular-web-worker/testing]', () => {
  it('should create a new instance of a TestWorkerManager', () => {
    expect(createTestManager([TestClass]) instanceof WorkerTestingManager).toEqual(true);
  });
});
