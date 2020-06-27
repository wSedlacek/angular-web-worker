import {
  AccessibleMetaData,
  ShallowTransferParamMetaData,
  WebWorkerType,
  WorkerAnnotations,
  WorkerEvent,
  WorkerEvents,
  WorkerMessageBus,
  WorkerObservableMessage,
  WorkerObservableMessageTypes,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerUtils,
} from 'angular-web-worker/common';
import { Subject, Subscription } from 'rxjs';

/**
 * Handles communication to and from a `WorkerClient` and triggers work with the worker class.
 */
export class WorkerController<T> {
  /**
   * Instance of the worker class
   */
  private readonly worker: any;
  /**
   * Dictionary of subscriptions to RxJS subjects within the worker
   */
  private readonly subscriptions: { [id: string]: Subscription } = {};

  /**
   * Creates a new `WorkerController`
   * @param workerClass the worker class,
   * @param postMessageFn the worker postMessage function passed into constructor allowing this to be mocked when running within the app (not the worker script)
   * @param onMessageFn the worker onmessage event function passed into constructor allowing this to be mocked when running within the app (not the worker script)
   */
  constructor(
    private readonly workerClass: WebWorkerType<any>,
    private readonly messageBus: WorkerMessageBus
  ) {
    try {
      this.worker = WorkerUtils.getAnnotation<Function>(
        workerClass,
        WorkerAnnotations.Factory
      )?.({
        isClient: false,
      });
      this.subscriptions = {};
      this.registerEvents();
    } catch (e) {}
  }

  /**
   * Returns instance of worker class
   */
  get workerInstance(): T {
    return this.worker;
  }

  /**
   * Creates the event listeners to correctly handle and respond to messages recieved from a `WorkerClient`
   */
  private registerEvents(): void {
    this.messageBus.onmessage = (ev: WorkerEvent<WorkerRequestEvent<any>>) => {
      switch (ev.data.type) {
        case WorkerEvents.Callable:
          this.handleCallable(ev.data);
          break;
        case WorkerEvents.Accessible:
          this.handleAccessible(ev.data);
          break;
        case WorkerEvents.Observable:
          this.handleSubscription(ev.data);
          break;
        case WorkerEvents.Init:
          this.handleInit(ev.data);
          break;
        default:
          break;
      }
    };
  }

  /**
   * A utility function to create a new `WorkerResponseEvent` from the details provided by the `WorkerRequestEvent`, as well as the result to be returned
   * @param type The type of worker event
   * @param request The request that the response relates to
   * @param result data to return with the response
   */
  private readonly response = <EventType extends number>(
    type: EventType,
    request: WorkerRequestEvent<EventType>,
    result: any
  ): WorkerResponseEvent<EventType> => {
    return {
      type,
      result,
      isError: false,
      requestSecret: request.requestSecret,
      propertyName: request.propertyName,
    };
  };

  /**
   * A utility function to create a new error in the form of a `WorkerResponseEvent` from the details provided by the `WorkerRequestEvent`, as well as the error to be returned
   * @param type The type of worker event
   * @param request The request that the error relates to
   * @param result the error to be returned
   */
  private error<EventType extends number>(
    type: number,
    request: WorkerRequestEvent<EventType>,
    error: any
  ): WorkerResponseEvent<EventType> {
    return {
      type,
      isError: true,
      requestSecret: request.requestSecret,
      propertyName: request.propertyName,
      error: JSON.stringify(error, this.replaceErrors),
      result: null,
    };
  }

  /**
   * A utility function as the replacer for the `JSON.stringify()` function to make the native browser `Error` class serializable to JSON
   */
  private readonly replaceErrors = (_key: string, value: any) => {
    if (value instanceof Error) {
      const error = {};

      Object.getOwnPropertyNames(value).forEach((property) => {
        error[property] = value[property];
      });

      return error;
    }

    return value;
  };

  /**
   * Handles `WorkerEvents.Init` requests from a client by calling the `onWorkerInit` hook if implemented and only responding once the hook has been completed, regardless of whether it is
   * async or not
   * @param request request recieved from the `WorkerClient`
   */
  public handleInit(request: WorkerRequestEvent<WorkerEvents.Init>): void {
    if (this.worker['onWorkerInit']) {
      try {
        const result = this.worker['onWorkerInit']();
        let isPromise = false;
        if (result) {
          isPromise = result.__proto__.constructor === Promise;
        }
        if (isPromise) {
          result
            .then(() => {
              this.postMessage(this.response(WorkerEvents.Init, request, null));
            })
            .catch((err: any) => {
              this.postMessage(this.error(WorkerEvents.Init, request, err));
            });
        } else {
          this.postMessage(this.response(WorkerEvents.Init, request, null));
        }
      } catch (e) {
        this.postMessage(this.error(WorkerEvents.Init, request, null));
      }
    } else {
      this.postMessage(this.response(WorkerEvents.Init, request, null));
    }
  }

  /**
   * Handles `WorkerEvents.Callable` requests from a client by calling the targeted method and responding with the method's return value
   * @param request request recieved from the `WorkerClient`
   */
  public async handleCallable(request: WorkerRequestEvent<WorkerEvents.Callable>): Promise<void> {
    let response: WorkerResponseEvent<any>;
    try {
      if (request.body === null) throw new Error('No body');
      request.body.arguments = this.applyShallowTransferToCallableArgs(
        request,
        request.body.arguments
      );
      if (request.propertyName === null) throw new Error('No property name');
      const result = await this.worker[request.propertyName](...request.body.arguments);

      response = this.response(WorkerEvents.Callable, request, result);
    } catch (e) {
      response = this.error(WorkerEvents.Callable, request, e);
    }

    this.postMessage(response);
  }

  /**
   * Transfers the prototype of any function arguments decorated with `@ShallowTransfer()` which have been serialized and recieved from a `WorkerEvents.Callable` request.
   *  This occurs before the arguments are used to call the worker function.
   * @param request request recieved from the `WorkerClient`
   * @param args array of function arguments
   */
  public applyShallowTransferToCallableArgs(
    request: WorkerRequestEvent<WorkerEvents.Callable>,
    args: any[]
  ): any[] {
    const metaData = WorkerUtils.getAnnotation<ShallowTransferParamMetaData[]>(
      this.workerClass,
      WorkerAnnotations.ShallowTransferArgs,
      []
    );

    if (metaData.length) {
      const shallowTransferMeta = metaData.filter((x) => x.name === request.propertyName);
      args.forEach((arg, i) => {
        const meta = shallowTransferMeta.find((x) => x.argIndex === i);
        if (meta && arg) arg.__proto__ = meta.type.prototype;
      });
    }

    return args;
  }

  /**
   * Handles `WorkerEvents.Accessible` requests from a client by either setting the target property of the worker or responding with the target property's value
   * @param request request recieved from the `WorkerClient`
   */
  public handleAccessible(request: WorkerRequestEvent<WorkerEvents.Accessible>): void {
    let response: WorkerResponseEvent<any>;
    try {
      if (request.propertyName === null) throw new Error('No property name');
      if (request.body === null) throw new Error('No body');

      const metaData = WorkerUtils.getAnnotation<AccessibleMetaData[]>(
        this.workerClass,
        'accessibles',
        []
      ).find((x) => x.name === request.propertyName);

      if (request.body.isGet) {
        response = this.response(
          WorkerEvents.Accessible,
          request,
          this.worker[request.propertyName]
        );
      } else {
        this.worker[request.propertyName] = request.body.value;
        if (metaData?.shallowTransfer && this.worker[request.propertyName]) {
          this.worker[request.propertyName].__proto__ = metaData.type.prototype;
        }
        response = this.response(WorkerEvents.Accessible, request, null);
      }
    } catch (e) {
      response = this.error(WorkerEvents.Accessible, request, e);
    }

    this.postMessage(response);
  }

  /**
   * Handles `WorkerEvents.Subscribable` requests from a client by creating a new subscription to the targeted observable which will send messages to the client each time
   * an event is triggered by the observable. The function may also unsubscribe from a subscription depending on the details of the request
   * @param request request recieved from the `WorkerClient`
   */
  public handleSubscription(request: WorkerRequestEvent<WorkerEvents.Observable>): void {
    let response: WorkerResponseEvent<WorkerEvents.Observable>;

    if (request.body !== null && !request.body.isUnsubscribe) {
      try {
        this.createSubscription(request);
        response = this.response(WorkerEvents.Observable, request, request.body.subscriptionKey);
      } catch (e) {
        this.removeSubscription(request.body.subscriptionKey);
        response = this.error(WorkerEvents.Observable, request, e);
      }

      this.postMessage(response);
    } else {
      try {
        if (request.body?.subscriptionKey) this.removeSubscription(request.body.subscriptionKey);
        response = this.response(WorkerEvents.Observable, request, null);
      } catch (e) {
        response = this.error(WorkerEvents.Observable, request, e);
      }

      this.postMessage(response);
    }
  }

  /**
   * Creates a new subscription to a worker observable and adds it to the `subscriptions` dictionary. The subscriptions will send messages to the client each time
   *  and event is triggered by the observable
   * @param request request recieved from the `WorkerClient`
   */
  public createSubscription(request: WorkerRequestEvent<WorkerEvents.Observable>): void {
    if (request.body === null) throw new Error('No body');
    if (request.propertyName === null) throw new Error('No property name');

    const subject = this.worker[request.propertyName];
    if (!(subject instanceof Subject)) throw new Error('Property is not a Subject');

    this.removeSubscription(request.body.subscriptionKey);
    this.subscriptions[request.body.subscriptionKey] = subject.subscribe(
      (val) => {
        const response: WorkerResponseEvent<WorkerObservableMessage> = {
          type: WorkerEvents.ObservableMessage,
          propertyName: request.propertyName,
          isError: false,
          requestSecret: null,
          result: {
            key: request.body?.subscriptionKey,
            type: WorkerObservableMessageTypes.Next,
            value: val,
          },
        };
        this.postSubscriptionMessage(response);
      },
      (err) => {
        const response: WorkerResponseEvent<WorkerObservableMessage> = {
          type: WorkerEvents.ObservableMessage,
          propertyName: request.propertyName,
          isError: true,
          requestSecret: null,
          result: {
            key: request.body?.subscriptionKey,
            type: WorkerObservableMessageTypes.Error,
            error: JSON.parse(JSON.stringify(err, this.replaceErrors)),
          },
        };
        this.postSubscriptionMessage(response);
      },
      () => {
        const response: WorkerResponseEvent<WorkerObservableMessage> = {
          type: WorkerEvents.ObservableMessage,
          propertyName: request.propertyName,
          isError: false,
          requestSecret: null,
          result: {
            key: request.body?.subscriptionKey,
            type: WorkerObservableMessageTypes.Complete,
          },
        };
        this.postSubscriptionMessage(response);
      }
    );
  }

  /**
   * Removes a subscription from the `subscriptions` dictionary, unsubscribing before it is deleted
   * @param subscriptionKey key in dictionary
   */
  public removeSubscription(subscriptionKey: string): void {
    if (subscriptionKey in this.subscriptions) {
      this.subscriptions[subscriptionKey].unsubscribe();
      delete this.subscriptions[subscriptionKey];
    }
  }

  /**
   * Unsubscribes from all subscriptions
   */
  public removeAllSubscriptions(): void {
    for (const [key, subscription] of Object.entries(this.subscriptions)) {
      subscription.unsubscribe();
      delete this.subscriptions[key];
    }
  }

  /**
   * A wrapper function around the `postMessage()` method allowing serialization errors to be caught and sent to the client as a `WorkerResponseEvent`.
   * Only used when the response is triggered by a request, which is not the case when the event type is `WorkerEvents.ObservableMessage`.
   * @param response response to send to the client
   */
  public postMessage<EventType extends number>(response: WorkerResponseEvent<EventType>): void {
    try {
      this.messageBus.postMessage(response);
    } catch (e) {
      const errorResponse: WorkerResponseEvent<EventType> = {
        type: response.type,
        isError: true,
        requestSecret: response.requestSecret,
        propertyName: response.propertyName,
        error: JSON.parse(
          JSON.stringify(
            new Error('Unable to serialize response from worker to client'),
            this.replaceErrors
          )
        ),
        result: null,
      };
      this.messageBus.postMessage(errorResponse);
    }
  }

  /**
   * A wrapper function around the `postMessage()` method allowing serialization errors to be caught and sent to the client as a `WorkerResponseEvent`.
   * Only used when the response type is `WorkerEvents.ObservableMessage` which requires a different implementation to the `WorkerController.postMessage` wrapper as it
   * is one-way communication which is not triggered by a request
   */
  public postSubscriptionMessage(response: WorkerResponseEvent<WorkerObservableMessage>): void {
    try {
      this.messageBus.postMessage(response);
    } catch (e) {
      const errorResponse: WorkerResponseEvent<WorkerObservableMessage> = {
        type: response.type,
        isError: true,
        requestSecret: response.requestSecret,
        propertyName: response.propertyName,
        result: {
          key: response.result?.key,
          type: WorkerObservableMessageTypes.Error,
          error: JSON.parse(
            JSON.stringify(
              new Error('Unable to serialize subscribable response from worker to client'),
              this.replaceErrors
            )
          ),
        },
      };
      this.messageBus.postMessage(errorResponse);
    }
  }
}
