import {
  AccessibleMetaData,
  Instantiable,
  ShallowTransferParamMetaData,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvent,
  WorkerEvents,
  WorkerMessageBus,
  WorkerObservableMessage,
  WorkerObservableMessageTypes,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerUtils,
} from 'angular-web-worker/common';
import { errorFactory, replaceErrors, responseFactory } from 'angular-web-worker/utils';
import { Observable, Subscription } from 'rxjs';

import { OnWorkerDestroy, OnWorkerInit } from '../lifecycle-hooks';

/**
 * Handles communication to and from a `WorkerClient` and triggers work with the worker class.
 */
export class WorkerController<T> {
  /**
   * Instance of the worker class
   */
  private readonly worker: T;

  /**
   * Dictionary of subscriptions to RxJS subjects within the worker
   */
  private readonly subscriptions = new Map<string, Subscription>();

  /**
   * Creates a new `WorkerController`
   * @param workerClass the worker class,
   * @param postMessageFn the worker postMessage function passed into constructor allowing this to be mocked when running within the app (not the worker script)
   * @param onMessageFn the worker onmessage event function passed into constructor allowing this to be mocked when running within the app (not the worker script)
   */
  constructor(
    private readonly workerClass: Instantiable<T>,
    private readonly messageBus: WorkerMessageBus
  ) {
    const workerFactory = WorkerUtils.getAnnotation<(config: WorkerConfig) => T>(
      workerClass,
      WorkerAnnotations.Factory
    );
    this.worker = workerFactory({
      isClient: false,
    });
    this.registerEvents();
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
    this.messageBus.onmessage = (ev: WorkerEvent<WorkerRequestEvent<WorkerEvents>>) => {
      switch (ev.data.type) {
        case WorkerEvents.Callable:
          this.handleCallable(ev.data as WorkerRequestEvent<WorkerEvents.Callable>);
          break;

        case WorkerEvents.Accessible:
          this.handleAccessible(ev.data as WorkerRequestEvent<WorkerEvents.Accessible>);
          break;

        case WorkerEvents.Unsubscribable:
          this.handleUnsubscribe(ev.data as WorkerRequestEvent<WorkerEvents.Unsubscribable>);
          break;

        case WorkerEvents.Observable:
          this.handleSubscription(ev.data as WorkerRequestEvent<WorkerEvents.Observable>);
          break;

        case WorkerEvents.Subjectable:
          this.handleSubjectable(ev.data as WorkerRequestEvent<WorkerEvents.Subjectable>);
          break;

        case WorkerEvents.Init:
          this.handleLifeCycle(ev.data as WorkerRequestEvent<WorkerEvents.Init>);
          break;

        case WorkerEvents.Destroy:
          this.handleLifeCycle(ev.data as WorkerRequestEvent<WorkerEvents.Destroy>);
          break;

        default:
          break;
      }
    };
  }

  /**
   * Handles `WorkerEvents.Init` requests from a client by calling the `onWorkerInit` hook if implemented and only responding once the hook has been completed, regardless of whether it is
   * async or not
   * @param request request recieved from the `WorkerClient`
   */
  public handleLifeCycle(
    request: WorkerRequestEvent<WorkerEvents.Init | WorkerEvents.Destroy>
  ): void {
    const hook: keyof OnWorkerInit | keyof OnWorkerDestroy =
      request.type === WorkerEvents.Init ? 'onWorkerInit' : 'onWorkerDestroy';
    if (this.worker[hook]) {
      try {
        const result = this.worker[hook]();
        if (result instanceof Promise) {
          result
            .then(() => {
              this.postMessage(responseFactory(request.type, request));
            })
            .catch((err: any) => {
              this.postMessage(errorFactory(request.type, request, err));
            });
        } else {
          this.postMessage(responseFactory(request.type, request));
        }
      } catch (e) {
        this.postMessage(errorFactory(request.type, request));
      }
    } else {
      this.postMessage(responseFactory(request.type, request));
    }
  }

  /**
   * Handles `WorkerEvents.Callable` requests from a client by calling the targeted method and responding with the method's return value
   * @param request request recieved from the `WorkerClient`
   */
  public async handleCallable(request: WorkerRequestEvent<WorkerEvents.Callable>): Promise<void> {
    let response: WorkerResponseEvent<any>;
    try {
      request.body.arguments = this.applyShallowTransferToCallableArgs(
        request,
        request.body.arguments
      );
      const result = await this.worker[request.propertyName](...request.body.arguments);

      response = responseFactory(WorkerEvents.Callable, request, result);
    } catch (e) {
      response = errorFactory(WorkerEvents.Callable, request, e);
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
      const metaData = WorkerUtils.getAnnotation<AccessibleMetaData[]>(
        this.workerClass,
        'accessibles',
        []
      ).find((x) => x.name === request.propertyName);

      if (request.body.isGet) {
        response = responseFactory(
          WorkerEvents.Accessible,
          request,
          this.worker[request.propertyName]
        );
      } else {
        this.worker[request.propertyName] = request.body.value;
        if (metaData?.shallowTransfer && this.worker[request.propertyName]) {
          this.worker[request.propertyName].__proto__ = metaData.type.prototype;
        }
        response = responseFactory(WorkerEvents.Accessible, request, null);
      }
    } catch (e) {
      response = errorFactory(WorkerEvents.Accessible, request, e);
    }

    this.postMessage(response);
  }

  /**
   * Handles `WorkerEvents.Subjectable` requests from a client by emitting values to the subject
   * @param request request recieved from the `WorkerClient`
   */
  public async handleSubjectable(
    request: WorkerRequestEvent<WorkerEvents.Subjectable>
  ): Promise<void> {
    let response: WorkerResponseEvent<any>;
    try {
      const result = await this.worker[request.propertyName].next(request.body.value);

      response = responseFactory(WorkerEvents.Subjectable, request, result);
    } catch (e) {
      response = errorFactory(WorkerEvents.Subjectable, request, e);
    }

    this.postMessage(response);
  }

  /**
   * Handles `WorkerEvents.Subscribable` requests from a client by creating a new subscription to the targeted observable which will send messages to the client each time
   * an event is triggered by the observable. The function may also unsubscribe from a subscription depending on the details of the request
   * @param request request recieved from the `WorkerClient`
   */
  public handleSubscription(request: WorkerRequestEvent<WorkerEvents.Observable>): void {
    if (request.body !== null) {
      let response: WorkerResponseEvent<WorkerEvents.Observable | string>;
      try {
        this.createSubscription(request);
        response = responseFactory(WorkerEvents.Observable, request, request.body.subscriptionKey);
      } catch (e) {
        this.removeSubscription(request.body.subscriptionKey);
        response = errorFactory(WorkerEvents.Observable, request, e);
      }

      this.postMessage(response);
    }
  }

  /**
   * Handles `WorkerEvents.Unsubscribable` requests from a client by removing the subscription from the subject
   * @param request request recieved from the `WorkerClient`
   */
  public handleUnsubscribe(request: WorkerRequestEvent<WorkerEvents.Unsubscribable>): void {
    if (request.body !== null) {
      let response: WorkerResponseEvent<WorkerEvents.Unsubscribable | string>;
      try {
        if (request.body.subscriptionKey) this.removeSubscription(request.body.subscriptionKey);
        response = responseFactory(WorkerEvents.Unsubscribable, request, null);
      } catch (e) {
        response = errorFactory(WorkerEvents.Unsubscribable, request, e);
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
    const observable = this.worker[request.propertyName];
    if (!(observable instanceof Observable)) {
      throw new Error(`Property ${request.propertyName} is not a Observable`);
    }

    this.removeSubscription(request.body.subscriptionKey);
    this.subscriptions.set(
      request.body.subscriptionKey,
      observable.subscribe(
        (val) => {
          this.postSubscriptionMessage({
            type: WorkerEvents.ObservableMessage,
            propertyName: request.propertyName,
            isError: false,
            requestSecret: null,
            result: {
              key: request.body?.subscriptionKey,
              type: WorkerObservableMessageTypes.Next,
              value: val,
            },
          });
        },
        (err) => {
          this.postSubscriptionMessage({
            type: WorkerEvents.ObservableMessage,
            propertyName: request.propertyName,
            isError: true,
            requestSecret: null,
            result: {
              key: request.body?.subscriptionKey,
              type: WorkerObservableMessageTypes.Error,
              error: JSON.parse(JSON.stringify(err, replaceErrors)),
            },
          });
        },
        () => {
          this.postSubscriptionMessage({
            type: WorkerEvents.ObservableMessage,
            propertyName: request.propertyName,
            isError: false,
            requestSecret: null,
            result: {
              key: request.body?.subscriptionKey,
              type: WorkerObservableMessageTypes.Complete,
            },
          });
        }
      )
    );
  }

  /**
   * Removes a subscription from the `subscriptions` dictionary, unsubscribing before it is deleted
   * @param subscriptionKey key in dictionary
   */
  public removeSubscription(subscriptionKey: string): void {
    this.subscriptions.get(subscriptionKey)?.unsubscribe();
    this.subscriptions.delete(subscriptionKey);
  }

  /**
   * Unsubscribes from all subscriptions
   */
  public removeAllSubscriptions(): void {
    for (const key of this.subscriptions.keys()) this.removeSubscription(key);
  }

  /**
   * A wrapper function around the `postMessage()` method allowing serialization errors to be caught and sent to the client as a `WorkerResponseEvent`.
   * Only used when the response is triggered by a request, which is not the case when the event type is `WorkerEvents.ObservableMessage`.
   * @param response response to send to the client
   */
  public postMessage<EventType extends WorkerEvents>(
    response: WorkerResponseEvent<EventType | string>
  ): void {
    try {
      this.messageBus.postMessage(response);
    } catch {
      this.messageBus.postMessage({
        type: response.type,
        isError: true,
        requestSecret: response.requestSecret,
        propertyName: response.propertyName,
        error: JSON.parse(
          JSON.stringify(
            new Error('Unable to serialize response from worker to client'),
            replaceErrors
          )
        ),
        result: null,
      });
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
      this.messageBus.postMessage({
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
              replaceErrors
            )
          ),
        },
      });
    }
  }
}
