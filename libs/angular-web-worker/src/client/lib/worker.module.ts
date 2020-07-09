import { ModuleWithProviders, NgModule } from '@angular/core';

import { WorkerDefinition } from './@types';
import { WORKER_DEFINITIONS } from './tokens/worker.token';
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
   *  WorkerModule.forRoot([
   *    {worker: AppWorker, initFn: () => new Worker('./app.worker.ts', {type: 'module'})},
   *  ])
   * ]
   */
  public static forRoot(workerDefinitions: WorkerDefinition[]): ModuleWithProviders<WorkerModule> {
    return {
      ngModule: WorkerModule,
      providers: [{ provide: WORKER_DEFINITIONS, useValue: workerDefinitions }],
    };
  }

  public static forFeature(): ModuleWithProviders<WorkerModule> {
    return {
      ngModule: WorkerModule,
      providers: [{ provide: WORKER_DEFINITIONS, useExisting: WORKER_DEFINITIONS }],
    };
  }
}
