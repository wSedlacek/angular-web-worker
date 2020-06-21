import { ModuleWithProviders, NgModule } from '@angular/core';
import { WorkerUtils, WorkerAnnotations } from 'angular-web-worker/common';
import { WorkerDefinition, WorkerManager } from 'angular-web-worker/client';

/**
 * Provides the `WorkerManager` service with the worker definitions passed into the static `forWorkers` method.
 * @example
 * imports: [
 *  WorkerModule.forWorkers([
 *    {worker: AppWorker, initFn: () => new Worker('./app.worker.ts', {type: 'module'})},
 *  ])
 * ]
 */
@NgModule()
export class WorkerModule {
  /**
   * Returns a module with a `WorkerManager` provider
   * @param workerDefinitions list of worker definitions which contain the worker class and an `initFn` function which is necessary for the
   * webpack `worker-plugin` to bundle the worker separately.
   * @example
   * imports: [
   *  WorkerModule.forWorkers([
   *    {worker: AppWorker, initFn: () => new Worker('./app.worker.ts', {type: 'module'})},
   *  ])
   * ]
   */
  static forWorkers(workerDefinitions: WorkerDefinition[]): ModuleWithProviders {
    workerDefinitions.forEach((definition) => {
      if (!WorkerUtils.getAnnotation(definition.worker, WorkerAnnotations.IsWorker)) {
        throw new Error(
          'WorkerModule: one or more of the provided workers has not been decorated with the @WebWorker decorator'
        );
      }
    });

    return {
      ngModule: WorkerModule,
      providers: [{ provide: WorkerManager, useValue: new WorkerManager(workerDefinitions) }],
    };
  }
}
