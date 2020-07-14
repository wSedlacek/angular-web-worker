import {
  AccessibleMetaData,
  CallableMetaData,
  FunctionsOnly,
  NonObservablesOnly,
  ObservablesOnly,
  SecretResult,
  SubjectsOnly,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvent,
  WorkerEvents,
  WorkerObservableMessage,
  WorkerObservableMessageTypes,
  WorkerObservableType,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerUtils,
} from 'angular-web-worker/common';
import {
  createHookedSubject,
  generateKey,
  getWorkerProperty,
  isSecret,
  isValidResponse,
  requestFactory,
} from 'angular-web-worker/utils';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, find, first, timeout } from 'rxjs/operators';

import { WorkerClientObservableRef, WorkerClientRequestOpts, WorkerDefinition } from '../@types';
import { ClientWebWorker } from '../client-web-worker/client-web-worker';

/**
 * Provides functionality for an Angular app to access the properties, call the methods and subscribe to the events in a web worker by managing
 * the communication between the app and the worker. Also provides the option to execute the worker code within the app should the browser not support web workers,
 * although intensive work may then block the UI.
 */
export class WorkerClient<T> {
  /**
   * Reference to the browser's worker class for posting messages and terminating the worker
   */
  protected readonly workerRef: Worker | ClientWebWorker<T>;

  /**
   * The client instance of the worker class
   */
  protected readonly worker: T;

  /**
   * A secret key that must be returned when decorated properties and/or methods are called from the client instance of the worker class
   */
  protected readonly workerSecret: string;

  /**
   * Array of secret keys containing the `workerSecret` and `WorkerRequestEvent.requestSecret`s ensuring that there are never two of the same keys at any point in time
   */
  protected readonly secrets = new Set<string>();

  /**
   * An event subject that is triggered each time a response is recieved from a `WorkerController`. This is subscribed to immediately before any request is made in the `sendRequest()` method.
   * This allows the `Worker.onmessage` listener to be mapped back to an async function call from where the request originated
   */
  protected readonly responseEvent$ = new Subject<WorkerResponseEvent<WorkerEvents>>();

  /**
   * A dictionary of observable references that listen for events triggered by the worker after they have been subscribed or observed through the use of either the `subscribe()` or `observe` methods
   */
  protected readonly observables = new Map<string, WorkerClientObservableRef>();

  /**
   * Whether the worker is active after it is created with the `connect()` method and before it has been terminated by the `destroy()` method
   */
  protected readonly _isConnected$ = new BehaviorSubject(false);

  /**
   * Creates a new `WorkerClient`
   * @param definition the worker definition originating from the arguments of the `WorkerModule.forWorkers()` method
   * @param runInApp whether the execution of the worker will occur in the app or within the worker script
   * @param runInApp whether the client is used for unit testing which determines if serialization should be mocked
   *
   * Creates a new worker script in the browser, or within the app, and triggers the `OnWorkerInit` hook, if implemented.
   * If the hook is implemented the promise will only be resolved once `onWorkerInit` method has completed regardless of whether
   * it is async or not
   */
  constructor(
    private readonly definition: WorkerDefinition,
    private readonly runInApp: boolean = false,
    private readonly isTestClient: boolean = false
  ) {
    this.workerSecret = this.generateSecretKey();
    const workerFactory = WorkerUtils.getAnnotation<(config: WorkerConfig) => T>(
      this.definition.target,
      WorkerAnnotations.Factory
    );

    this.worker = workerFactory({ isClient: true, clientSecret: this.workerSecret });
    this.workerRef = this.runInApp
      ? new ClientWebWorker(this.definition.target, this.isTestClient)
      : this.definition.useWorkerFactory();

    this.registerEvents();
    this.sendRequest(WorkerEvents.Init, {
      isConnectionRequest: true,
      resolve: () => {
        this._isConnected$.next(true);
      },
      secretError: 'Could not initialize worker',
    });
  }

  /**
   * Terminates the worker and unsubscribes from any subscriptions created from the `subscribe()` method
   */
  public async destroy(): Promise<void> {
    if (this.isConnected) {
      const unsubscriptions = Array.from(this.observables.keys()).map(async (propertyName) =>
        this.unsubscribe(propertyName)
      );

      await Promise.all(unsubscriptions);
      await this.sendRequest(WorkerEvents.Destroy, { secretError: 'Could not destroy worker' });

      this.workerRef.terminate();
      this.secrets.clear();
      this.observables.clear();
      this._isConnected$.next(false);
    }
  }

  /**
   * Whether the worker is active after it is created after initialization and before it has been terminated by the `destroy()` method
   */
  public get isConnected(): boolean {
    return this._isConnected$.getValue();
  }

  /**
   * Emitted whenever `isConnected` changes
   * @see isConnected
   */
  public get isConnected$(): Observable<boolean> {
    return this._isConnected$.asObservable();
  }

  /**
   * Waits for connection to client for up to 1 second. If a connection could not be
   * established then a timeout error will be thrown
   */
  public get connectionCompleted(): Promise<boolean> {
    return this._isConnected$
      .pipe(
        first((connection) => connection),
        timeout(500),
        catchError(() => of(false))
      )
      .toPromise();
  }

  /**
   * Returns the value of a worker property that has been decorated with `@Accessible()`. Undecorated properties will cause the promise to be rejected
   * @Serialized
   * @param workerProperty A lambda expression that returns the targeted property of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are not RxJS subjects
   * @example const name = await client.get(w => w.name);
   */
  public get<PropertyType>(
    workerProperty: (workerProperties: NonObservablesOnly<T>) => PropertyType
  ): PropertyType extends Promise<any> ? PropertyType : Promise<PropertyType> {
    return this.sendRequest(WorkerEvents.Accessible, {
      workerProperty,
      additionalConditions: [
        {
          if: (secret) => !!secret?.body.get,
          reject: (secret) =>
            new Error(
              `WorkerClient: will not apply the get method to the "${secret?.propertyName}" property because the get accessor has been explicity set to false`
            ),
        },
      ],
      secretError:
        'WorkerClient: only properties decorated with @Accessible() can be used in the get method',
      body: () => {
        return { isGet: true };
      },
      resolve: (resp) => {
        const metaData = WorkerUtils.getAnnotation<AccessibleMetaData[]>(
          this.definition.target,
          WorkerAnnotations.Accessibles
        ).find((x) => x.name === resp?.propertyName);

        if (metaData?.shallowTransfer && metaData.type.prototype && resp?.result) {
          resp.result.__proto__ = metaData.type.prototype;
        }

        return resp?.result;
      },
    });
  }

  /**
   * Sets value of a worker property that has been decorated with `@Accessible()`. Undecorated properties will cause the promise to be rejected
   * @Serialized
   * @param workerProperty A lambda expression that returns the targeted property of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are not RxJS subjects
   * @param value the value which the property should be set to
   * @example await client.set(w => w.name, 'peter');
   */
  public set<PropertyType>(
    workerProperty: (workerProperties: NonObservablesOnly<T>) => PropertyType,
    value: PropertyType
  ): Promise<void> {
    return this.sendRequest(WorkerEvents.Accessible, {
      workerProperty,
      additionalConditions: [
        {
          if: (secret) => !!secret?.body.set,
          reject: (secret) =>
            new Error(
              `WorkerClient: will not apply the set method to the "${String(
                secret?.propertyName
              )}" property because the set accessor has been explicity set to false`
            ),
        },
      ],
      secretError:
        'WorkerClient: only properties decorated with @Accessible() can be used in the set method',
      body: () => {
        return { value, isGet: false };
      },
    }) as Promise<void>;
  }

  /**
   * Calls a method in the worker and returns its value. The called method can be either synchronous or asynchronous
   * but must be decorated with `@Callable()` else the promise will be rejected
   * @Serialized Applies to both the function arguments and the returned value
   * @param workerProperty A lambda expression that calls the worker method. The worker argument in the expression only has the methods owned by the worker class (not the properties)
   * @example const functionResult = await client.call(w => w.doSomeWork('someArgument', 2123));
   */
  public call<ReturnType>(
    workerProperty: (workerFunctions: FunctionsOnly<T>) => ReturnType
  ): ReturnType extends Promise<any> ? ReturnType : Promise<ReturnType> {
    return this.sendRequest(WorkerEvents.Callable, {
      workerProperty,
      secretError:
        'WorkerClient: only methods decorated with @Callable() can be used in the call method',
      body: (secret) => ({ arguments: secret?.body.args ?? [] }),
      resolve: (resp) => {
        const metaData = WorkerUtils.getAnnotation<CallableMetaData[]>(
          this.definition.target,
          WorkerAnnotations.Callables,
          []
        ).find((x) => x.name === resp?.propertyName);

        if (metaData?.shallowTransfer) {
          if (metaData.returnType === Promise) {
            throw new Error(
              'WorkerClient: shallowTransfer will not be true in the @Callable() decorator when the decorated method returns a promise'
            );
          }
          if (resp?.result) {
            resp.result.__proto__ = metaData.returnType.prototype;
          }
        }

        return resp?.result;
      },
    });
  }

  /**
   * Emits a `value` into the `workerProperty` subject. The subject must be decorated with `@Subjectable`
   * or an error will be thrown.
   * @Serialized
   * @param workerProperty a lambda expression to select the subject which the value will be emitted in
   * @param value the next value to emit in the subject
   * @example await client.next(w => w.subject, 'new-value')
   */
  public next<R>(
    workerProperty: (workerSubjects: SubjectsOnly<T>) => Subject<R>,
    value: R
  ): Promise<void> {
    return this.sendRequest(WorkerEvents.Subjectable, {
      workerProperty,
      secretError:
        'WorkerClient: only methods decorated with @Subjectable() can be used in the next method',
      body: () => ({ value }),
    }) as Promise<void>;
  }

  /**
   * Creates and returns a RxJS observable that is in sync with a RxJS subject within a worker. The worker subject must be decorated with `@Subscribable()` otherwise the
   * promise will be rejected. Supports all four RxJS subjects being, `Subject`,  `BehaviorSubject`, `ReplaySubject` and `AsyncSubject`.
   *
   * **UNSUBSCRIBING**
   *
   * While under normal circumstances you don't need to unsubscribe from an RxJS observable, when an observable is created from a worker subject a subscription is also created in the worker.
   * To release the resources in the worker the `WorkerClient.unsubscribe(observable)` method should be used. The `WorkerClient.destroy()` method will
   * dispose of all observables correctly.
   *
   * @Serialized
   * @param workerProperty A lambda expression that returns the targeted RxJS subject of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are RxJS subjects
   *
   * @example
   * this.observable$ = await client.observe(w => w.someEventSubject);
   *
   * // unsubscribing --------
   * await client.destroy();
   */
  public observe<ObservableType>(
    workerProperty: (workerObservables: ObservablesOnly<T>) => WorkerObservableType<ObservableType>
  ): Observable<ObservableType> {
    const { propertyName } = getWorkerProperty(this.worker, workerProperty);
    const currentObservable: Observable<ObservableType> | undefined = this.observables.get(
      propertyName
    )?.observable;

    return (
      currentObservable ??
      (() => {
        const subject = createHookedSubject<ObservableType>(() => {
          let active = false;

          return {
            subscribe: () => {
              if (!active) {
                this.sendRequest(WorkerEvents.Observable, {
                  workerProperty,
                  secretError:
                    'WorkerClient: only methods decorated with @Subscribable() can be used in the observe method',
                  body: (secret) => ({
                    isUnsubscribe: false,
                    subscriptionKey: secret?.propertyName ?? 'unknownProperty',
                  }),
                  beforeReject: (_resp, secret) =>
                    this.removeSubscription(secret?.propertyName ?? 'unknownProperty'),
                });
                active = true;
              }
            },
            unsubscribe: () => {
              if (subject.observers.length === 0 && active) {
                this.unsubscribe(propertyName);
                active = false;
              }
            },
          };
        });

        this.observables.set(propertyName, {
          subject,
          propertyName,
          observable: subject.asObservable(),
        });

        return subject.asObservable();
      })()
    );
  }

  /**
   * Unsubscribes from an RxJS subscription or observable that has been created from the `WorkerClient.subscribe()` or `WorkerClient.observe()` methods respectively.
   * This method is necessary to release resources within the worker. Calling `WorkerClient.destroy()` will also dispose of all observables/subscriptions
   * @param key Secret key used to generate the observable
   * @param propertyName The name of the subscribable property on the workerRef
   */
  private unsubscribe(propertyName: string): Promise<void> {
    this.removeSubscription(propertyName);

    return this.sendRequest(WorkerEvents.Unsubscribable, {
      workerProperty: propertyName,
      secretError: '',
      body: () => ({ subscriptionKey: propertyName }),
    });
  }

  /**
   * A generic utility function for sending requests to, and handling the responses from a `WorkerController` used when the `runInApp` property is set to `false`
   * @param type the type of worker event
   * @param opts Configurable options that defines how the request is sent and how the response is handled
   */
  private sendRequest<EventType extends WorkerEvents, ReturnType>(
    type: EventType,
    opts: WorkerClientRequestOpts<T, EventType, ReturnType>
  ): ReturnType extends Promise<any> ? ReturnType : Promise<ReturnType | undefined>;
  private sendRequest<ReturnType>(
    type: WorkerEvents,
    opts: WorkerClientRequestOpts<T, WorkerEvents, ReturnType>
  ): Promise<ReturnType> {
    const noProperty = opts.workerProperty === undefined;
    const workerProperty = getWorkerProperty(this.worker, opts.workerProperty);
    const secretResult = noProperty ? null : isSecret(this.workerSecret, workerProperty, type);
    const requestSecret = this.generateSecretKey();

    this.validateRequest(opts, secretResult);

    return new Promise<ReturnType>(async (resolve, reject) => {
      if (!opts.isConnectionRequest && !(await this.connectionCompleted)) {
        reject(
          'WorkerClient: Could not connect to the worker... Has it already been destroyed it?'
        );

        return;
      }

      this.responseEvent$.pipe(find(isValidResponse(requestSecret))).subscribe((resp) => {
        this.secrets.delete(requestSecret);

        if (resp?.isError) {
          opts.beforeReject?.(resp, secretResult);
          reject(resp.error ? JSON.parse(resp.error) : undefined);
        } else {
          resolve(opts.resolve?.(resp, secretResult));
        }
      });

      this.postMessage(
        requestFactory({
          type,
          requestSecret,
          noProperty,
          secretResult,
          body: opts.body,
        })
      );
    });
  }

  /**
   * Validates the request ensuring meta data exist for a given property and that any conditions are met
   * @param opts Configurable options that defines how the request is sent and how the response is handled
   * @param secretResult The secret metadata stored on the worker for a given property
   */
  public validateRequest<R>(
    opts: WorkerClientRequestOpts<T, WorkerEvents, R>,
    secretResult: SecretResult<WorkerEvents> | null
  ): void {
    if (opts.workerProperty !== undefined && secretResult === null) {
      throw new Error(opts.secretError);
    }

    opts.additionalConditions?.forEach((opt) => {
      if (!opt.if(secretResult)) throw new Error(opt.reject(secretResult));
    });
  }

  /**
   * A wrapper function around the `Worker.postMessage()` method to catch any serialization errors should they occur
   * @param request the request to be sent to the worker
   */
  private postMessage<EventType extends WorkerEvents>(
    request: WorkerRequestEvent<EventType>
  ): void {
    try {
      this.workerRef.postMessage(request);
    } catch (e) {
      throw new Error('Unable to serialize the request from the client to the worker');
    }
  }

  /**
   * Remove a subscription or observable reference from `observables` dictionary. Removed subscriptions are unsubscribed before destroyed
   * @param key unique key in the `observables` dictionary
   */
  private removeSubscription(key: string): void {
    this.observables.get(key)?.subject.complete();
    this.observables.delete(key);
  }

  /**
   * Creates a unique key for worker requests ensuring no two keys are available at any time through the `secrets` array. Allows requests to be mapped to responses from
   * the worker
   * @param propertyName property name of the worker's property/method that is being called. This is attached as a prefix to the unique key
   */
  private generateSecretKey(propertyName: string = 'client'): string {
    let key: string;

    do {
      key = generateKey(propertyName, 16);
    } while (this.secrets.has(key));
    this.secrets.add(key);

    return key;
  }

  /**
   * Creates the event listeners to listen for, and handle, messages recieved through `Worker.onmessage`
   */
  private registerEvents(): void {
    this.workerRef.onmessage = (
      ev: WorkerEvent<WorkerResponseEvent<WorkerObservableMessage | WorkerEvents.Callable>>
    ) => {
      const body = ev.data.result as WorkerObservableMessage | null;
      if (ev.data.type === WorkerEvents.ObservableMessage && body?.key) {
        const observable = this.observables.get(body.key);
        if (observable) {
          switch (body.type) {
            case WorkerObservableMessageTypes.Next:
              observable.subject.next(body.value);
              break;
            case WorkerObservableMessageTypes.Error:
              observable.subject.error(body.error);
              break;
            case WorkerObservableMessageTypes.Complete:
              observable.subject.complete();
              break;
            default:
              break;
          }
        }
      } else {
        this.responseEvent$.next(ev.data as WorkerResponseEvent<WorkerEvents>);
      }
    };
  }
}
