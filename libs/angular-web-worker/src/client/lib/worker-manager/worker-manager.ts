import { Instantiable, WorkerAnnotations, WorkerUtils } from 'angular-web-worker/common';

import { Inject, Injectable, Optional } from '@angular/core';
import { WorkerClientOptions, WorkerDefinition } from '../@types';
import { WORKER_DEFINITIONS } from '../tokens/worker.token';
import { WorkerClient } from '../worker-client/worker-client';

/**
 * Injectable angular service with a primary responsibility of acting as `WorkerClient` factory through its `createClient()` method.
 *
 * **Module**
 *
 * The `WorkerModule` must be imported to provide the service, passing in worker definitions in the `WorkerModule.forWorkers()` function so that the factory method
 * has necessary details to create new clients
 *
 * @example
 * // module ---
 * imports: [
 *  WorkerModule.forWorkers([
 *    {worker: AppWorker, initFn: () => new Worker('./app.worker.ts', {type: 'module'})},
 *  ])
 * ]
 *
 * // usage ---
 * export class AppComponent implements OnInit {
 *
 *   constructor(private workerManager: WorkerManager) {}
 *
 *   ngOnInit() {
 *      const client: WorkerClient<AppWorker> = this.workerManager.createClient(AppWorker);
 *   }
 *
 * }
 */
@Injectable({ providedIn: 'root' })
export class WorkerManager {
  /**
   * List of workers with details to created new worker instances. Passed into `WorkerModule.forWorkers()`
   */
  private readonly workerDefinitions: WorkerDefinition[];

  /**
   * Creates a new `WorkerManager` and called from `WorkerModule.forWorkers()` where the angular provider is created
   * @param workerDefinitions List of workers with details to create new worker instances. Passed into `WorkerModule.forWorkers()`
   */
  constructor(@Optional() @Inject(WORKER_DEFINITIONS) workerDefinitions?: WorkerDefinition[]) {
    workerDefinitions?.forEach((definition) => {
      try {
        WorkerUtils.getAnnotation(definition.target, WorkerAnnotations.IsWorker);
      } catch {
        throw new Error(
          'WorkerModule: one or more of the provided workers has not been decorated with the @WebWorker decorator'
        );
      }
    });

    this.workerDefinitions = workerDefinitions ?? [];
  }

  /**
   * Factory function that creates a new `WorkerClient`. The worker definitions must first be registered when importing the `WorkerModule.forWorkers()` module, otherwise
   * it will throw an error
   * @param workerType the worker class
   * @param options the `WorkerClientOptions` for altering the behavior of the created client
   * @example
   * // module ---
   * imports: [
   *  WorkerModule.forRoot([
   *    {
   *      target: AppWorker,
   *      useWorkerFactory: () => new Worker('./app.worker.ts', {type: 'module'})
   *    },
   *  ])
   * ]
   *
   * // usage ---
   * export class AppComponent {
   *   constructor(private readonly workerManager: WorkerManager) {}
   *   private readonly client = this.workerManager.createClient(AppWorker)
   * }
   */
  public createClient<T>(
    workerType: Instantiable<T>,
    options: Partial<WorkerClientOptions> = {}
  ): WorkerClient<T> {
    const definition = this.workerDefinitions.find((p) => p.target === workerType);
    if (!definition) {
      throw new Error(
        'WorkerManager: All web workers must be registered in the forRoot function of the WorkerModule'
      );
    }

    return new WorkerClient<T>(definition, { runInApp: !this.isBrowserCompatible, ...options });
  }

  /**
   * Whether the browser supports web workers
   */
  get isBrowserCompatible(): boolean {
    return typeof Worker !== 'undefined';
  }
}
