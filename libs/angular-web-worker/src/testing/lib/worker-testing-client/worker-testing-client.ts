import { ClientWebWorker, WorkerClient, WorkerDefinition } from 'angular-web-worker/client';
import { WebWorkerType, WorkerAnnotations, WorkerUtils } from 'angular-web-worker/common';

/**
 * **Used for Testing**
 *
 * Testing implementation a `WorkerClient`, which does not run in a worker script but mocks the serialization that occurs when messages are transferred to
 * and from a worker. Also adds a public `workerInstance` to test and spy on the worker class
 *
 */
export class WorkerTestingClient<T> extends WorkerClient<T> {
  constructor(definition: WorkerDefinition) {
    super(definition, true, true);
  }

  /**
   * Exposed instance of the private worker instance to allow testing & spying
   */
  get workerInstance(): T | undefined {
    if (this.isConnected) {
      return (this['workerRef'] as ClientWebWorker<T>).workerInstance;
    }

    throw new Error('Cannot access worker instance until the connect method has been called');
  }
}

/**
 * Creates a new `TestWorkerClient`
 * @param workerClass worker class
 */
export const createTestClient = <T>(workerClass: WebWorkerType<T>): WorkerTestingClient<T> => {
  try {
    WorkerUtils.getAnnotation(workerClass, WorkerAnnotations.IsWorker);
  } catch {
    throw new Error('createTestClient: the provided class must be decorated with @WebWorker()');
  }

  return new WorkerTestingClient({ worker: workerClass, initFn: () => null });
};
