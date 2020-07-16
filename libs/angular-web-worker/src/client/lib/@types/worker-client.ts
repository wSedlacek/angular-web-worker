import { Observable, Subject } from 'rxjs';

import {
  SecretResult,
  WorkerAccessibleBody,
  WorkerCallableBody,
  WorkerEvents,
  WorkerResponseEvent,
  WorkerSubjectableBody,
  WorkerSubscribableBody,
} from 'angular-web-worker/common';

/**
 * Options available for the WorkerClient
 */
export interface WorkerClientOptions {
  /**
   * Wether to run the worker class in the main thread instead of a Worker class
   */
  runInApp: boolean;

  /**
   * Whether the instance is used for testing which will then mock serialization
   */
  isTestClient: boolean;
}

/**
 * A definition of a client observable that listens to events triggered by RxJS subjects in the worker and then triggers events in the browser
 * which depends on which `WorkerClient` method was used to create the listener
 */
export interface WorkerClientObservableRef {
  /**
   * The event that is triggered in the client when a observable message is recieved from the worker.
   * This will either execute a subscription or trigger an observable depending on whether the event listener was registered with the
   * `WorkerClient.subscribe()` or `WorkerClient.observe()` method.
   */
  subject: Subject<any>;

  /**
   *  An observable from the `WorkerClientObservableRef.subject` which is created and returned by the `WorkerClient.observe()` method.
   */
  observable?: Observable<any>;

  /**
   * The name of the worker's RxJS subject property that the client is listening to
   */
  propertyName: string;
}

/**
 * Configurable options that defines how a `WorkerClient` sends a request to, and handles the response from a `WorkerController` through the `WorkerClient.sendRequest()` method
 */
export interface WorkerClientRequestOpts<T, EventType extends number, ReturnType> {
  /**
   * Whether the request is triggered by the init event and therefore not requiring the client's connected property to be true
   */
  isConnectionRequest?: boolean;

  /**
   * The worker property to which the request relates. Can be provided as a string, or a lambda function which is used in the `WorkerClient`'s APIs
   */
  workerProperty?: ((worker: T) => ReturnType) | string;

  /**
   * The error message when the `WorkerClient.sendRequest()` method is rejected from the targeted worker property/method not returning the correct `SecretResult`
   * when called upon by the client
   */
  secretError: string;

  /**
   * Any conditions that need to be met, in addition to the correct `SecretResult`, before a request can be made to the worker
   */
  additionalConditions?: {
    if(secretResult?: SecretResult<EventType> | null): boolean;
    reject(secretResult?: SecretResult<EventType> | null): any;
  }[];

  /**
   * Must return the `WorkerRequestEvent.body` that will be sent to the worker.  The structure is determined by the `WorkerClientRequestOpts`'s
   * `EventType` type argument
   * @param secretResult the `SecretResult` that is returned when the client called upon the targeted worker property or method
   * @param propertyName the name of the property trying to be accessed
   * otherwise it will be undefined
   */
  body?(
    secretResult: SecretResult<EventType> | null
  ): EventType extends WorkerEvents.Callable
    ? WorkerCallableBody
    : EventType extends WorkerEvents.Accessible
    ? WorkerAccessibleBody
    : EventType extends WorkerEvents.Observable
    ? WorkerSubscribableBody
    : EventType extends WorkerEvents.Subjectable
    ? WorkerSubjectableBody
    : EventType extends WorkerEvents.Unsubscribable
    ? WorkerSubscribableBody
    : null;

  /**
   * Function that returns the value that is resolved by the `WorkerClient.sendRequest()` method. Only occurs if a successful request has been made to, and a response has been recieved from the worker
   * @param response the `WorkerResponseEvent` that was returned by the worker
   * @param secretResult the `SecretResult` that was returned when the client called upon the targeted worker property or method
   */
  resolve?(
    response?: WorkerResponseEvent<any>,
    secretResult?: SecretResult<EventType> | null
  ): ReturnType | undefined;

  /**
   * A placeholder to perform unique work in the more generic `WorkerClient.sendRequest()` method. This occurs immediately before the request is rejected due to an error
   * being caught
   * @param response the `WorkerResponseEvent` that was returned by the worker
   * @param secretResult the `SecretResult` that was returned when the client called upon the targeted worker property or method
   */
  beforeReject?(
    response?: WorkerResponseEvent<any>,
    secretResult?: SecretResult<EventType> | null
  ): void;
}

/**
 * An async function used to emit values into a Subjectable value in a worker.
 *
 * @example
 * const emitter = this.client.createEmitter((w) => w.input$);
 * await emitter.next("Some Value");
 */
export interface Emitter<T> {
  next(value: T): Promise<void>;
}
