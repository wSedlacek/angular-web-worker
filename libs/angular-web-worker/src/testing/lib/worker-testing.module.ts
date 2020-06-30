import { ModuleWithProviders } from '@angular/core';
import { WorkerManager, WorkerModule } from 'angular-web-worker/client';
import { Instantiable } from 'angular-web-worker/common';

import { TESTING_WORKERS } from './tokens/workers.token';
import { WorkerTestingManager } from './worker-testing-manager/worker-testing-manager';

/**
 * **Used for Testing**
 *
 * Testing implementation a `WorkerModule`, which provides a `WorkerTestingManager` that creates testable worker client that dos not run in a worker script but mocks the serialization that occurs when messages are transferred to
 * and from a worker.
 */
export class WorkerTestingModule {
  public static forRoot(workers: Instantiable<Object>[]): ModuleWithProviders {
    return {
      ngModule: WorkerModule,
      providers: [
        { provide: WorkerManager, useClass: WorkerTestingManager },
        { provide: TESTING_WORKERS, useValue: workers },
      ],
    };
  }
}
