import { WorkerController } from './worker/worker.controller';
import { WebWorkerType, WorkerMessageBus } from 'angular-web-worker/common';

/**
 * Bootstraps the worker class when a new worker script is created in the browser. The class must be decorated with `@WebWorker()`
 * @param worker worker class to bootstrap
 */
export function bootstrapWorker<T>(worker: WebWorkerType<T>) {
  const messageBus: WorkerMessageBus = {
    onmessage: (ev: MessageEvent) => {},
    postMessage: (msg: Response) => {
      (postMessage as Function)(msg);
    },
  };
  const workerController = new WorkerController<T>(worker, messageBus);

  onmessage = (ev: MessageEvent) => {
    messageBus.onmessage(ev);
  };
}
