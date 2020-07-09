/// <reference lib="webworker" />

import { Instantiable, WorkerMessageBus } from 'angular-web-worker/common';
import { WorkerController } from './worker/worker.controller';

declare var self: DedicatedWorkerGlobalScope;

/**
 * Bootstraps the worker class when a new worker script is created in the browser. The class must be decorated with `@WebWorker()`
 * @param target worker class to bootstrap
 */
export const bootstrapWorker = <T>(target: Instantiable<T>, worker: WorkerMessageBus = self) => {
  const messageBus: WorkerMessageBus = {
    onmessage: null,
    postMessage: (data) => worker.postMessage(data),
  };

  const controller = new WorkerController<T>(target, messageBus);

  worker.onmessage = (ev: MessageEvent) => {
    messageBus.onmessage?.(ev);
  };

  return controller;
};
