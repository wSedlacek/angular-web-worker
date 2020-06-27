import { ModuleWithProviders } from '@angular/core';
import { WorkerManager, WorkerModule } from 'angular-web-worker/client';
import { WebWorkerType, WorkerAnnotations, WorkerUtils } from 'angular-web-worker/common';

import { WorkerTestingManager } from './worker-testing-manager/worker-testing-manager';

/**
 * **Used for Testing**
 *
 * Testing implementation a `WorkerModule`, which provides a `WorkerTestingManager` that creates testable worker client that dos not run in a worker script but mocks the serialization that occurs when messages are transferred to
 * and from a worker.
 */
export class WorkerTestingModule {
  public static forWorkers(workers: WebWorkerType<any>[]): ModuleWithProviders {
    workers.forEach((wkr) => {
      try {
        WorkerUtils.getAnnotation(wkr, WorkerAnnotations.IsWorker);
      } catch {
        throw new Error(
          'WorkerModule: one or more of the provided workers has not been decorated with the @WebWorker decorator'
        );
      }
    });

    return {
      ngModule: WorkerModule,
      providers: [{ provide: WorkerManager, useValue: new WorkerTestingManager(workers) }],
    };
  }
}
