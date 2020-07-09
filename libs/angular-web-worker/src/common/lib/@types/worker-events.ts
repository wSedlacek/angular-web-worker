/**
 * Numeric enum of worker event types that are sent between a `WorkerClient` and a `WorkerController`
 */
export enum WorkerEvents {
  /**
   * Event type for calling worker methods decorated with `@Callable()`. Triggered in the `WorkerClient.call()` method
   */
  Callable = 1,

  /**
   * Event type for accessing worker properties decorated with `@Accessible()`. Triggered in the `WorkerClient.get()` and `WorkerClient.set()` methods
   */
  Accessible = 2,

  /**
   * Event type for creating and/or removing subscriptions or observables from RxJS subjects within a worker that are decorated with `@Subscribable()`.
   * Triggered in the `WorkerClient.subscribe()`, `WorkerClient.observe()` and `WorkerClient.unsubscribe()`
   */
  Observable = 3,

  /**
   * Event type for observables that are triggered within the worker and delivered to a `WorkerClient` which occurs after a client has subscribed to, or observed a worker subject.
   * This differs from the other events types as it is one-way communication and therefore is not triggered by a request but rather observables in the worker
   */
  ObservableMessage = 4,

  /**
   * Event type for sending a new value to a subject inside the worker
   */
  Next = 5,

  /**
   * Event type when the worker script is created in the browser which triggers the `onWorkerInit` life-cycle hook if implemented
   */
  Init = 6,

  /**
   * Event type when the worker script is created in the browser which triggers the `onWorkerDestroy` life-cycle hook if implemented
   */
  Destroy = 7,
}

export type WorkerTransmitEvents =
  | WorkerEvents.Callable
  | WorkerEvents.Accessible
  | WorkerEvents.Observable
  | WorkerEvents.ObservableMessage
  | WorkerEvents.Next;

export type PropertyName = string | number | symbol;

/**
 * A typed event interface for generically describing the data of the native `MessageEvent` which is sent with `Worker.postMessage`
 * @Serialized
 */
export interface WorkerEvent<T> extends MessageEvent {
  data: T;
}

/**
 * Event that is sent from a `WorkerClient` to a `WorkerController` containing details to trigger work in the web worker
 * @Serialized
 */
export interface WorkerRequestEvent<EventType> {
  /**
   * The type worker request which also determines structure of the request's `body` property
   * @see WorkerEvents
   */
  type: EventType;
  /**
   * Name of the worker property/method that triggered the request
   */
  propertyName: string | null;
  /**
   * Secret key that is generated by a `WorkerClient` for each request and returned back in the response by a `WorkerController`
   * after the worker has completed the desired task. Allows the worker's response to mapped back to the request.
   */
  requestSecret: string;
  /**
   * Detail of the request that is specific to the request type. The structure is conditional on the request's generic `EventType`
   * type argument as well as the request's `type` property
   */
  body:
    | (EventType extends WorkerEvents.Callable
        ? WorkerCallableBody
        : EventType extends WorkerEvents.Accessible
        ? WorkerAccessibleBody
        : EventType extends WorkerEvents.Observable
        ? WorkerSubscribableBody
        : null)
    | null;
}

/**
 * The body of a `WorkerRequestEvent<EventType>` when the type is `WorkerEvents.Accessible`
 * @Serialized
 */
export interface WorkerAccessibleBody {
  /**
   * Determines whether the request is intended to get or set the value of a worker's property
   */
  isGet: boolean;
  /**
   * When `isGet` is false, it is serializable the value to which the worker's property will be set
   */
  value?: any;
}

/**
 * The body of a `WorkerRequestEvent<EventType>` when the type is `WorkerEvents.Callable`
 * @Serialized
 */
export interface WorkerCallableBody {
  /**
   * Array of function arguments to be applied to the when the worker's method is called
   */
  arguments: any[];
}

/**
 * The body of a `WorkerRequestEvent<EventType>` when the type is `WorkerEvents.Observable`.
 * @Serialized
 */
export interface WorkerSubscribableBody {
  /**
   * Whether the request is intended to unsubscribe or subscribe to an observable
   */
  isUnsubscribe: boolean;
  /**
   * A unique key generated by a `WorkerClient` allowing messages triggered by subscriptions in a `WorkerController` (subscribing to observables in the worker)
   * to be mapped to trigger observable events in the client and any consequent subscriptions
   */
  subscriptionKey: string;
}

/**
 * Event that is sent from a `WorkerController` to a `WorkerClient` in response to a particular request from the client.
 * **NOTE:** Errors are also communicated through this response event as the native `Worker.onerror` does not bubble up to be
 * caught in the async functions of the `WorkerClient`.
 * @Serialized
 */
export interface WorkerResponseEvent<T> {
  /**
   * The type worker event. Unlike the `WorkerRequestEvent` this does not affect the structure of the response result
   * @see WorkerEvents
   */
  type: WorkerEvents;

  /**
   * Name of the worker property/method that originally triggered the event
   */
  propertyName?: string | null;

  /**
   * Secret key that is generated by a `WorkerClient` for each request and returned back in the response by a `WorkerController`
   * after the worker has completed the desired task. Allows the worker's response to mapped back to the request.
   */
  requestSecret: string | null;

  /**
   * Whether the response arose from an error that was caught in the worker
   */
  isError: boolean;

  /**
   * The result of the response when not triggered from an error.
   * @Serialized Functions will not be copied and circular references will cause errors
   */
  result?: T | null;

  /**
   * The error message if the response was triggered by an error
   */
  error?: any;
}

/**
 * Describes the `WorkerResponseEvent.result` when any observables in the worker trigger messages that must be sent to a client. **Note:** this
 * differs from other event responses as it is one-way communication and therefore is not triggered by a request but rather observables in the worker.
 * @Serialized
 */
export interface WorkerObservableMessage {
  /**
   * The type of observable message sent to the client which aligns to RxJS observables being `next`, `onerror` and `complete`
   * @see WorkerObservableMessageTypes
   */
  type: number;
  /**
   * A unique key recieved from the client when the client initially subscribed to the observable.
   * Allows the message to be mapped to the trigger the correct event when received by the client
   */
  key?: string;
  /**
   * Value communicated by the observable when the event type is `WorkerObservableMessageTypes.Next`
   * @Serialized Functions will not be copied and circular references will cause errors
   */
  value?: any;
  /**
   * Error communicated by the observable when the event type is `WorkerObservableMessageTypes.Error`
   * @Serialized Functions will not be copied and circular references will cause errors
   */
  error?: any;
}

/**
 * The event type when a `WorkerResponseEvent` response is sent to a client after being triggered by an observable in the worker
 */
export enum WorkerObservableMessageTypes {
  Next = 1,
  Error = 2,
  Complete = 3,
}

/**
 * A secret that is returned when a `WorkerClient` calls any methods or properties of the client instance of a worker. Allows the client to know if that method or worker has been decorated
 * and also contains details that are necessary to make a `postMessage` request to the `WorkerController`
 */
export interface SecretResult<SecretType> {
  /**
   * The type of worker secret result which also determines structure of the secret's `body` property
   * @see WorkerEvents
   */
  type: SecretType;
  /**
   * A secret key that generated by a  `WorkerClient` and is attached the client instance of a worker which needs to be returned when a decorated property or method is called by a `WorkerClient`
   */
  clientSecret?: string;
  /**
   * The name of the property or method that has been called
   */
  propertyName: string;
  /**
   * Detail of the secret that is specific to the secret type. The structure is conditional on the secrets generic `SecretType` type argument as well as the secret's `type` property
   * @see WorkerEvents
   */
  body: SecretType extends WorkerEvents.Callable
    ? SecretCallableBody
    : SecretType extends WorkerEvents.Accessible
    ? SecretAccessibleBody
    : null;
}

/**
 * The body of a `SecretResult<SecretType>` when the type is `WorkerEvents.Callable`
 */
export interface SecretCallableBody {
  /**
   * The function arguments that where used to call the workers method, which are then sent in a `WorkerRequestEvent` to call the same method in the worker
   */
  args: any[];
}

/**
 * The body of a `SecretResult<SecretType>` when the type is `WorkerEvents.Accessible`
 */
export interface SecretAccessibleBody {
  /**
   * Whether the client can perform a get operation on the decorated property. Set as an optional parameter in the `@Accessible()` decorator
   * @defaultvalue true
   */
  get: boolean;
  /**
   * Whether the client can perform a set operation on the decorated property. Set as an optional parameter in the `@Accessible()` decorator
   * @defaultvalue true
   */
  set: boolean;
}
