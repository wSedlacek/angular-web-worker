import { WebWorkerType } from 'angular-web-worker/common';

/**
 * A definition of a worker that is required to create new worker instances
 */
export interface WorkerDefinition {
  /**
   * the worker class which has been decorated with `@WebWorker()`
   */
  worker: WebWorkerType<any>;
  /**
   * A function that creates a worker. This is required for the webpack `worker-plugin` to bundle the worker separately and is used by a `WorkerClient`
   * to create a new worker
   *
   * **IMPORTANT**
   *
   * The syntax is crucial for the webpack plugin. The path must be a string and the {type: 'module'} argument must be given
   * @example
   * () => new Worker('./app.worker.ts', {type: 'module'})
   */
  initFn: () => Worker;
}
