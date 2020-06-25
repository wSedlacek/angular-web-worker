import { WebWorkerType, WorkerMessageBus } from 'angular-web-worker/common';
import { WorkerController } from './worker/worker.controller';

/**
 * Bootstraps the worker class when a new worker script is created in the browser. The class must be decorated with `@WebWorker()`
 * @param worker worker class to bootstrap
 */
export const bootstrapWorker = <T>(worker: WebWorkerType<T>) => {
  const messageBus: WorkerMessageBus = {
    onmessage: (_ev: MessageEvent) => {},
    postMessage: (msg: Response) => {
      (postMessage as Function)(msg);
    },
  };

  const controller = new WorkerController<T>(worker, messageBus);

  onmessage = (ev: MessageEvent) => {
    messageBus.onmessage(ev);
  };

  return controller;
};
