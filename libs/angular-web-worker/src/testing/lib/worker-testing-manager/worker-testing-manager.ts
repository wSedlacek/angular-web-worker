import { Inject } from '@angular/core';

import { WorkerClient, WorkerManager } from 'angular-web-worker/client';
import { Instantiable } from 'angular-web-worker/common';

import { FakeWorker } from '../mocks';
import { TESTING_WORKERS } from '../tokens/workers.token';
import { WorkerTestingClient } from '../worker-testing-client/worker-testing-client';

/**
 * **Used for Testing**
 *
 * Testing implementation of the `WorkerManager` service, overriding the `createClient()` method to create a testable instance of the
 * `WorkerClient`
 *
 */
export class WorkerTestingManager extends WorkerManager {
  constructor(@Inject(TESTING_WORKERS) private readonly workers: Instantiable<Object>[]) {
    super(workers?.map((target) => ({ target, useWorkerFactory: () => new FakeWorker() })));

    if (!Array.isArray(workers)) {
      throw new Error(
        'The workers argument for the TestWorkerManager constructor cannot be undefined or null'
      );
    }
  }

  public createClient<T>(workerType: Instantiable<T>): WorkerClient<T> {
    const definition = this.workers.find((p) => p === workerType);
    if (definition) {
      return new WorkerTestingClient<T>({
        target: workerType,
        useWorkerFactory: () => new FakeWorker(),
      });
    }

    throw new Error(
      'WorkerManager: All web workers must be registered in the createTestManager function'
    );
  }
}

/**
 * Creates a new `TestWorkerManager`
 * @param workers array of workers that can be created through the `createClient` method
 */
export const createTestManager = (workers: Instantiable<any>[]): WorkerTestingManager => {
  return new WorkerTestingManager(workers);
};
