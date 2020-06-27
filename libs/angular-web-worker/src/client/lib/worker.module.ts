import { ModuleWithProviders, NgModule } from '@angular/core';
import { WorkerAnnotations, WorkerUtils } from 'angular-web-worker/common';

import { WorkerDefinition } from './@types';
import { WorkerManager } from './worker-manager/worker-manager';

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
  public static forWorkers(workerDefinitions: WorkerDefinition[]): ModuleWithProviders {
    workerDefinitions.forEach((definition) => {
      try {
        WorkerUtils.getAnnotation(definition.worker, WorkerAnnotations.IsWorker);
      } catch {
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
