import { WorkerClient, WorkerManager } from 'angular-web-worker/client';
import { WebWorkerType } from 'angular-web-worker/common';

import { WorkerTestingClient } from '../worker-testing-client/worker-testing-client';

/**
 * **Used for Testing**
 *
 * Testing implementation of the `WorkerManager` service, overriding the `createClient()` method to create a testable instance of the
 * `WorkerClient`
 *
 */
export class WorkerTestingManager extends WorkerManager {
  constructor(private readonly workers: WebWorkerType<any>[]) {
    super(
      workers.map((x) => {
        return { worker: x, initFn: () => null };
      })
    );

    if (!Array.isArray(workers)) {
      throw new Error(
        'the workers argument for the TestWorkerManager constructor cannot be undefined or null'
      );
    }
  }

  @Override()
  public createClient<T>(workerType: WebWorkerType<T>, runInApp: boolean = false): WorkerClient<T> {
    const definition = this.workers.find((p) => p === workerType);
    if (definition) {
      return new WorkerTestingClient<T>({ worker: workerType, initFn: () => null });
    }

    throw new Error(
      'WorkerManager: all web workers must be registered in the createTestManager function'
    );
  }
}

/**
 * Creates a new `TestWorkerManager`
 * @param workers array of workers that can be created through the `createClient` method
 */
export const createTestManager = (workers: WebWorkerType<any>[]): WorkerTestingManager => {
  return new WorkerTestingManager(workers);
};
