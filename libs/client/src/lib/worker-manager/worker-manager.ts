import { WorkerClient, WorkerDefinition } from 'angular-web-worker/client';
import { WebWorkerType } from 'angular-web-worker/common';

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
export class WorkerManager {
  /**
   * List of workers with details to created new worker instances. Passed into `WorkerModule.forWorkers()`
   */
  private readonly workerDefinitions: WorkerDefinition[];

  /**
   * Creates a new `WorkerManager` and called from `WorkerModule.forWorkers()` where the angular provider is created
   * @param workerDefinitions List of workers with details to create new worker instances. Passed into `WorkerModule.forWorkers()`
   */
  constructor(workerDefinitions?: WorkerDefinition[]) {
    this.workerDefinitions = workerDefinitions ?? [];
  }

  /**
   * Factory function that creates a new `WorkerClient`. The worker definitions must first be registered when importing the `WorkerModule.forWorkers()` module, otherwise
   * it will throw an error
   * @param workerType the worker class
   * @param runInApp whether the execution of the worker code is run in the application's "thread". Defaults to run in the worker script
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
   *      let client: WorkerClient<AppWorker> ;
   *      if(workerManager.isBrowserCompatible) {
   *          client = this.workerManager.createClient(AppWorker);
   *      } else {
   *          // only if worker execution does not have UI blocking code else implement other behavior
   *          client = this.workerManager.createClient(AppWorker, true);
   *      }
   *   }
   *
   * }
   */
  public createClient<T>(workerType: WebWorkerType<T>, runInApp: boolean = false): WorkerClient<T> {
    const definition = this.workerDefinitions.find((p) => p.worker === workerType);
    if (definition) return new WorkerClient<T>(definition, runInApp);

    throw new Error(
      'WorkerManager: all web workers must be registered in the forWorkers function of the WorkerModule'
    );
  }

  /**
   * Whether the browser supports web workers
   */
  get isBrowserCompatible(): boolean {
    return typeof Worker !== 'undefined';
  }
}
