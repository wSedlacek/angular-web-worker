import { WorkerController } from 'angular-web-worker';
import { WebWorkerType, WorkerMessageBus } from 'angular-web-worker/common';

/**
 * Used to mock the behavior of the native `Worker` class when a `WorkerClient` is set to run in the app and not in the worker script.
 * Controls the flow of messages to and from a `WorkerClient` and a `WorkerController`
 */
export class ClientWebWorker<T> implements Worker {
  /**
   * Handles execution of code in a worker
   */
  private controller: WorkerController<T>;

  /**
   * Interface for message bus provided into a `WorkerController` allowing the communication mechanism to be interchanged between in-app, and native worker
   * communication mechanisms
   */
  private readonly messageBus: WorkerMessageBus = {
    onmessage: () => {},
    postMessage: (resp: any) => {
      this.onmessage(
        new MessageEvent('ClientWebWorker', {
          data: this.isTestClient ? this.serialize(resp) : resp,
        })
      );
    },
  };

  /**
   * Creates a new instance of a `ClientWebWorker`
   * @param workerType the worker class
   * @param isTestClient whether the instance is used for testing which will then mock serialization
   */
  constructor(workerType: WebWorkerType<T>, private readonly isTestClient: boolean) {
    this.controller = new WorkerController(workerType, this.messageBus);
  }

  /**
   * Returns instance of worker class
   */
  get workerInstance(): T | undefined {
    return this.controller?.workerInstance;
  }

  /**
   * Message listener for a `WorkerClient`
   */
  @Override()
  public onmessage(ev: MessageEvent): void {}

  /**
   * Message Error listener for a `WorkerClient`
   */
  @Override()
  public onmessageerror(this: Worker, ev: MessageEvent): void {}

  /**
   * Sends messages triggered from a `WorkerClient` to a `WorkerController`
   */
  @Override()
  public postMessage(resp: any): void {
    this.messageBus.onmessage(
      new MessageEvent('ClientWebWorker', { data: this.isTestClient ? this.serialize(resp) : resp })
    );
  }

  /**
   * Unsubscribes from all subscriptions in the `WorkerController` and then destroys the controller
   */
  @Override()
  public terminate(): void {
    this.controller.removeAllSubscriptions();
    delete this.controller;
  }

  /**
   * Used for testing to mock the serialization that occurs when native the postMessage or onmessage are used to communicate with a worker script
   * @param obj object to be serialized
   */
  public serialize = <O extends Object = any>(obj: O): O => {
    return JSON.parse(JSON.stringify(obj));
  };

  /**
   * Ensures class conforms to the native `Worker` class
   * @NotImplemented
   */
  @Override()
  public onerror(err: any): void {}

  /**
   * Ensures class conforms to the native `Worker` class
   * @NotImplemented
   */
  @Override()
  public addEventListener(): void {}

  /**
   * Ensures class conforms to the native `Worker` class
   * @NotImplemented
   */
  @Override()
  public removeEventListener(): void {}

  /**
   * Ensures class conforms to the native `Worker` class
   * @NotImplemented
   */
  @Override()
  public dispatchEvent(evt: Event): boolean {
    return true;
  }
}
