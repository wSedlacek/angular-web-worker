import {
  AccessibleMetaData,
  CallableMetaData,
  FunctionsOnly,
  NonObservablesOnly,
  ObservablesOnly,
  SecretResult,
  WorkerAnnotations,
  WorkerEvent,
  WorkerEvents,
  WorkerObservableMessage,
  WorkerObservableMessageTypes,
  WorkerObservableType,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerUtils,
} from 'angular-web-worker/common';
import { Observable, Subject, Subscription } from 'rxjs';

import { WorkerClientObservablesDict, WorkerClientRequestOpts, WorkerDefinition } from '../@types';
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
  private workerRef: Worker | ClientWebWorker<T> | null = null;
  /**
   * The client instance of the worker class
   */
  private worker: T | null = null;
  /**
   * A secret key that must be returned when decorated properties and/or methods are called from the client instance of the worker class
   */
  private workerSecret?: string;
  /**
   * Array of secret keys containing the `workerSecret` and `WorkerRequestEvent.requestSecret`s ensuring that there are never two of the same keys at any point in time
   */
  private secrets: string[] = [];
  /**
   * An event subject that is triggered each time a response is recieved from a `WorkerController`. This is subscribed to immediately before any request is made in the `sendRequest()` method.
   * This allows the `Worker.onmessage` listener to be mapped back to an async function call from where the request originated
   */
  private responseEvent?: Subject<WorkerResponseEvent<WorkerEvents.Callable>>;
  /**
   * A dictionary of observable references that listen for events triggered by the worker after they have been subscribed or observed through the use of either the `subscribe()` or `observe` methods
   */
  private observables: WorkerClientObservablesDict = {};
  /**
   * Whether the worker is active after it is created with the `connect()` method and before it has been terminated by the `destroy()` method
   */
  private _isConnected = false;

  /**
   * Creates a new `WorkerClient`
   * @param definition the worker definition originating from the arguments of the `WorkerModule.forWorkers()` method
   * @param runInApp whether the execution of the worker will occur in the app or within the worker script
   * @param runInApp whether the client is used for unit testing which determines if serialization should be mocked
   */
  constructor(
    private readonly definition: WorkerDefinition,
    private readonly runInApp: boolean = false,
    private readonly isTestClient: boolean = false
  ) {}

  /**
   * Creates a new worker script in the browser, or within the app, and triggers the `OnWorkerInit` hook, if implemented. If the hook is implemented the promise will only be resolved once `onWorkerInit` method
   * has completed regardless of whether it is async or not
   *
   * This method must called before any worker methods and/or properties can be called/accessed
   */
  public async connect(): Promise<void> {
    if (!this._isConnected) {
      this.secrets = [];
      this.workerSecret = this.generateSecretKey();
      this.worker = WorkerUtils.getAnnotation<Function>(
        this.definition.worker,
        WorkerAnnotations.Factory
      )?.({
        isClient: true,
        clientSecret: this.workerSecret,
      });

      this.workerRef = !this.runInApp
        ? this.definition.initFn?.() ?? null
        : new ClientWebWorker(this.definition.worker, this.isTestClient);

      this.registerEvents();

      return this.castPromise(
        this.sendRequest(WorkerEvents.Init, {
          body: () => null,
          isConnect: true,
          resolve: () => {
            this._isConnected = true;

            return;
          },
          secretError: 'Could not initialize worker',
        })
      );
    }
  }

  /**
   * Terminates the worker and unsubscribes from any subscriptions created from the `subscribe()` method
   */
  public destroy(): void {
    if (this.isConnected) {
      for (const key of Object.keys(this.observables)) {
        this.removeSubscription(key);
      }
      this.workerRef?.terminate();
      this.secrets = [];
      this.observables = {};
      this.worker = null;
      this._isConnected = false;
    }
  }

  /**
   * Whether the worker is active after it is created with the `connect()` method and before it has been terminated by the `destroy()` method
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Returns the value of a worker property that has been decorated with `@Accessible()`. Undecorated properties will cause the promise to be rejected
   * @Serialized
   * @example
   * // async await syntax ---
   * const name: string = await client.get(w => w.name);
   *
   * // promise syntax ---
   * client.get(w => w.name).then((name) => {
   *   console.log(name);
   * }).catch((err) => {
   *   console.log(err);
   * });
   * @param property A lambda expression that returns the targeted property of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are not RxJS subjects
   */
  public async get<PropertyType>(
    property: (workerProperties: NonObservablesOnly<T>) => PropertyType
  ): Promise<PropertyType extends Promise<any> ? PropertyType : Promise<PropertyType>> {
    return this.sendRequest(WorkerEvents.Accessible, {
      workerProperty: property,
      additionalConditions: [
        {
          if: (secret) => !!secret?.body.get,
          reject: (secret) =>
            new Error(
              `WorkerClient: will not apply the get method to the "${String(
                secret?.propertyName
              )}" property because the get accessor has been explicity set to false`
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
          this.definition.worker,
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
   * @example
   * // async await syntax ---
   * await client.set(w => w.name, 'peter');
   *
   * // promise syntax ---
   * client.set(w => w.name, 'peter').then(() => {
   *   console.log('property has been set');
   * }).catch((err) => {
   *   console.log(err);
   * });
   * @param property A lambda expression that returns the targeted property of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are not RxJS subjects
   * @param value the value which the property should be set to
   */
  public async set<PropertyType>(
    property: (workerProperties: NonObservablesOnly<T>) => PropertyType,
    value: PropertyType
  ): Promise<void> {
    return this.castPromise(
      this.sendRequest(WorkerEvents.Accessible, {
        workerProperty: property,
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
      })
    );
  }

  /**
   * Calls a method in the worker and returns its value. The called method can be either synchronous or asynchronous
   * but must be decorated with `@Callable()` else the promise will be rejected
   * @Serialized Applies to both the function arguments and the returned value
   * @example
   * // async await syntax ---
   * const functionResult: SomeResultType = await client.call(w => w.doSomeWork('someArgument', 2123));
   *
   * // promise syntax ---
   * client.call(w => w.doSomeWork('someArgument', 2123)).then((result) => {
   *    console.log(result);
   * }).catch((err) => {
   *    console.log(err);
   * });
   * @param property A lambda expression that calls the worker method. The worker argument in the expression only has the methods owned by the worker class (not the properties)
   */
  public call<ReturnType>(
    callFn: (workerFunctions: FunctionsOnly<T>) => ReturnType
  ): ReturnType extends Promise<any> ? ReturnType : Promise<ReturnType> {
    return this.sendRequest(WorkerEvents.Callable, {
      workerProperty: callFn,
      secretError:
        'WorkerClient: only methods decorated with @Callable() can be used in the call method',
      body: (secret) => {
        return { arguments: secret?.body.args ?? [] };
      },
      resolve: (resp) => {
        const metaData = WorkerUtils.getAnnotation<CallableMetaData[]>(
          this.definition.worker,
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
   * Subscribes to a worker's RxJS subject, which has been decorated with `@Subscribable()`, and then returns this subscription.
   *  Supports all four RxJS subjects being `Subject`,  `BehaviorSubject`, `ReplaySubject` and `AsyncSubject`.
   *
   * **UNSUBSCRIBING**
   *
   * While the returned subscription can be destroyed with `Subscription.unsubscribe()` this is only destroys the client subscription. A subscription is also created in the worker.
   * To release the resources in both the client and the worker the `WorkerClient.unsubscribe(subscription)` method should be used. The `WorkerClient.destroy()` method will
   * dispose of all subscriptions correctly.
   *
   * @Serialized This applies to messages posted through `Subject.next()`
   * @example
   * // async await syntax ---
   * this.workerSubscription = await client.subscribe(w => w.someEventSubject);
   *
   * // promise syntax ---
   * client.subscribe(w => w.someEventSubject).then((subscription) => {
   *    this.workerSubscription = subscription;
   * }).catch((err) => {
   *    console.log(err);
   * });
   *
   * // unsubscribing --------
   * await client.unsubscribe(this.workerSubscription)
   * @param observable A lambda expression that returns the targeted RxJS subject of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are RxJS subjects
   * @param next Callback function that is triggered when the subject's `next()` method is called within the worker
   * @param error Callback function that is triggered when the subject throws and error
   * @param complete Callback function that is triggered when the subject's `complete()` method is called within the worker
   */
  public async subscribe<ObservableType>(
    observable: (workerObservables: ObservablesOnly<T>) => WorkerObservableType<ObservableType>,
    next: (value: ObservableType) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Promise<Subscription> {
    return this.castPromise<Subscription>(
      this.sendRequest(WorkerEvents.Observable, {
        workerProperty: observable,
        secretError:
          'WorkerClient: only methods decorated with @Callable() can be used in the call method',
        beforeRequest: (secret) =>
          this.createSubscription(secret.propertyName, next, error, complete),
        body: (_secret, key) => {
          return { isUnsubscribe: false, subscriptionKey: key };
        },
        resolve: (_resp, _secret, key) => this.observables[key].subscription,
        beforeReject: (_resp, _secret, key) => this.removeSubscription(key),
      })
    );
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
   * @example
   * // async await syntax ---
   * this.observable$ = await client.observe(w => w.someEventSubject);
   *
   * // promise syntax ---
   * client.observe(w => w.someEventSubject).then((observable) => {
   *   this.observable$ = observable;
   * }).catch((err) => {
   *    console.log(err);
   * });
   *
   * // unsubscribing --------
   * await client.unsubscribe(this.observable$)
   * @param observable A lambda expression that returns the targeted RxJS subject of the worker. The worker argument in the expression only has the properties owned by the worker class (no methods)
   * and only those properties that are RxJS subjects
   */
  public async observe<ObservableType>(
    observable: (workerObservables: ObservablesOnly<T>) => WorkerObservableType<ObservableType>
  ): Promise<Observable<ObservableType>> {
    return this.castPromise<Observable<ObservableType>>(
      this.sendRequest(WorkerEvents.Observable, {
        workerProperty: observable,
        secretError:
          'WorkerClient: only methods decorated with @Callable() can be used in the call method',
        beforeRequest: (secret) => this.createObservable(secret.propertyName),
        body: (_secret, key) => ({ isUnsubscribe: false, subscriptionKey: key }),
        resolve: (_resp, _secret, key) => this.observables[key].observable,
        beforeReject: (_resp, _secret, key) => this.removeSubscription(key),
      })
    );
  }

  /**
   * Unsubscribes from an RxJS subscription or observable that has been created from the `WorkerClient.subscribe()` or `WorkerClient.observe()` methods respectively.
   *  This method is necessary to release resources within the worker. Calling `WorkerClient.destroy()` will also dispose of all observables/subscriptions
   * @param subscriptionOrObservable The observable or subscription that must be disposed of
   */
  public async unsubscribe(
    subscriptionOrObservable: Subscription | Observable<any>
  ): Promise<void> {
    const key = this.findObservableKey(subscriptionOrObservable);
    if (key !== null) {
      const propertyName: string = this.observables[key].propertyName;
      this.removeSubscription(key);

      return this.castPromise(
        this.sendRequest(WorkerEvents.Observable, {
          workerProperty: propertyName,
          secretError: '',
          body: () => ({ isUnsubscribe: true, subscriptionKey: key }),
        })
      );
    }

    return new Promise((resolve) => resolve());
  }

  /**
   * A generic utility function for sending requests to, and handling the responses from a `WorkerController` used when the `runInApp` property is set to `false`
   * @param type the type of worker event
   * @param opts Configurable options that defines how the request is sent and how the response is handled
   */
  private sendRequest<EventType extends number, ReturnType>(
    type: EventType,
    opts: WorkerClientRequestOpts<T, EventType, ReturnType>
  ): ReturnType extends Promise<any> ? ReturnType : Promise<ReturnType> {
    const promise = new Promise((resolve, reject) => {
      if (this.worker !== null && (this._isConnected || opts.isConnect)) {
        try {
          const noProperty = opts.workerProperty === undefined;
          const secretResult = noProperty
            ? null
            : this.isSecret(
                typeof opts.workerProperty === 'string'
                  ? this.worker?.[opts.workerProperty]
                  : opts.workerProperty?.(this.worker),
                type
              );
          if (secretResult !== null || noProperty) {
            // additional checks ---
            if (opts.additionalConditions) {
              for (const opt of opts.additionalConditions) {
                if (!opt.if?.(secretResult)) {
                  reject(opt.reject(secretResult));

                  return;
                }
              }
            }

            // additional functionality ---
            let additionalContext: any;
            if (opts.beforeRequest && secretResult !== null) {
              additionalContext = opts.beforeRequest(secretResult);
            }

            // response ----
            const requestSecret = this.generateSecretKey();
            const responseSubscription = this.responseEvent?.subscribe((resp) => {
              try {
                let isValidResponse =
                  resp.type === (type as number) && resp.requestSecret === requestSecret;
                isValidResponse = noProperty
                  ? isValidResponse
                  : isValidResponse && secretResult?.propertyName === resp.propertyName;

                if (isValidResponse) {
                  if (!resp.isError) {
                    // resolve ----
                    this.removeSecretKey(requestSecret);
                    if (opts.resolve) {
                      resolve(opts.resolve(resp, secretResult, additionalContext));
                    } else {
                      resolve();
                    }
                    responseSubscription?.unsubscribe();
                  } else {
                    // reject -----
                    this.removeSecretKey(requestSecret);
                    if (opts.beforeReject && secretResult !== null) {
                      opts.beforeReject(resp, secretResult, additionalContext);
                    }
                    responseSubscription?.unsubscribe();
                    if (resp.error) reject(JSON.parse(resp.error));
                    else reject();
                  }
                }
              } catch (e) {
                reject(e);
              }
            });

            // send request -----
            const req: WorkerRequestEvent<EventType> = {
              type,
              requestSecret,
              propertyName: noProperty || secretResult === null ? null : secretResult?.propertyName,
              body: opts.body ? opts.body(secretResult, additionalContext) : null,
            };
            this.postMessage(req);
          } else {
            reject(new Error(opts.secretError));
          }
        } catch (e) {
          reject(e);
        }
      } else {
        reject(
          new Error(
            'WorkerClient: the WorkerClient.connect() method must be called before a worker can be accessed'
          )
        );
      }
    });

    return promise as any;
  }

  /**
   * A wrapper function around the `Worker.postMessage()` method to catch any serialization errors should they occur
   * @param request the request to be sent to the worker
   */
  private postMessage<EventType extends number>(request: WorkerRequestEvent<EventType>): void {
    try {
      this.workerRef?.postMessage(request);
    } catch (e) {
      throw new Error('Unable to serialize the request from the client to the worker');
    }
  }

  /**
   * A utility function to cast promises
   * @param promise promise to cast
   */
  private readonly castPromise = async <PromiseType>(
    promise: Promise<any>
  ): Promise<PromiseType> => {
    return promise;
  };

  /**
   * Creates client subscription reference with a subscription and an RxJS subject, adds it to the `observables` dictionary with unique key and then returns the key. Called from the `subscribe()` method.
   * @param propertyName the property name of the worker's RxJS subject that was subscribed to
   * @param next Callback function that is triggered when the subject's `next()` method is called
   * @param error Callback function that is triggered when the subject throws and error
   * @param complete Callback function that is triggered when the subject's `complete()` method is called
   */
  private createSubscription(
    propertyName: string,
    next?: (value: any) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): string {
    const key = this.generateSubscriptionKey(propertyName);
    const subject = new Subject<any>();
    const subscription = subject.subscribe(next, error, complete);
    this.observables[key] = {
      subject,
      subscription,
      propertyName,
      observable: null,
    };

    return key;
  }

  /**
   * Creates client observable reference with a RxJS observable and subject, adds it to the `observables` dictionary with unique key and then returns the key. Called from the `observe()` method.
   * @param propertyName the property name of the worker's RxJS subject that was subscribed to
   */
  private createObservable(propertyName: string): string {
    const key = this.generateSubscriptionKey(propertyName);
    const subject = new Subject<any>();
    this.observables[key] = {
      subject,
      propertyName,
      subscription: null,
      observable: subject.asObservable(),
    };

    return key;
  }

  /**
   * Iterates through the `observables` dictionary to find the associated key for a particular subscription or observable. Returns null if no match is found
   * @param value Subscription or observable for which the dictionary key must be found
   */
  private findObservableKey(value: Subscription | Observable<any>): string | null {
    for (const key of Object.keys(this.observables)) {
      if (value instanceof Subscription && this.observables[key].subscription === value) {
        return key;
      }

      if (value instanceof Observable && this.observables[key].observable === value) {
        return key;
      }
    }

    return null;
  }

  /**
   * Remove a subscription or observable reference from `observables` dictionary. Removed subscriptions are unsubscribed before destroyed
   * @param subscriptionKey unique key in the `observables` dictionary
   */
  private removeSubscription(subscriptionKey: string): void {
    this.observables[subscriptionKey]?.subscription?.unsubscribe();
    delete this.observables[subscriptionKey];
  }

  /**
   * Generates a random key
   * @param propertyName appended as the prefix to the key
   * @param length length of the randomly generated characters
   */
  private readonly generateKey = (propertyName: string, length: number) => {
    return `${propertyName.toUpperCase()}_${Array(length)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('')}`;
  };

  /**
   * Creates a unique key for a subscription/observable reference for use in the `observables` dictionary. This key allows messages from the worker to be correctly mapped and handled in the client
   * @param propertyName property name of the worker's RxJS subject which is subscribed to. This is attached as a prefix to the unique key
   */
  private generateSubscriptionKey(propertyName: string): string {
    let key = this.generateKey(propertyName, 6);
    while (this.observables[key] !== undefined) {
      key = this.generateKey(propertyName, 6);
    }

    return key;
  }

  /**
   * Creates a unique key for worker requests ensuring no two keys are available at any time through the `secrets` array. Allows requests to be mapped to responses from
   * the worker
   * @param propertyName property name of the worker's property/method that is being called. This is attached as a prefix to the unique key
   */
  private generateSecretKey(propertyName: string = 'client'): string {
    let key = this.generateKey(propertyName, 16);
    while (this.secrets.indexOf(key) !== -1) {
      key = this.generateKey(propertyName, 16);
    }
    this.secrets.push(key);

    return key;
  }

  /**
   * Removes a key from the `secrets` array if it exists
   * @param secret unique key to be removed
   */
  private removeSecretKey(secret: string): void {
    if (this.secrets.indexOf(secret) !== -1) {
      this.secrets.splice(this.secrets.indexOf(secret), 1);
    }
  }

  /**
   * Checks if a valid `SecretResult` is returned when a decorated property and/or method of the client instance of the worker class is called.
   *  Returns the secret when valid otherwise returns null
   * @param secretResult the returned value from calling the property or method of a client instance of a worker
   * @param type the worker event type that originated the request
   */
  private isSecret<SecretType extends number>(
    secretResult: any,
    type: SecretType
  ): SecretResult<SecretType> | null {
    if (
      secretResult &&
      secretResult['clientSecret'] &&
      secretResult['propertyName'] &&
      secretResult['type'] &&
      secretResult['clientSecret'] === this.workerSecret &&
      secretResult['type'] === type
    ) {
      return secretResult as SecretResult<SecretType>;
    }

    return null;
  }

  /**
   * Creates the event listeners to listen for, and handle, messages recieved through `Worker.onmessage`
   */
  private registerEvents(): void {
    this.responseEvent = new Subject<WorkerResponseEvent<WorkerEvents.Callable>>();
    this.observables = {};

    if (this.workerRef === null || this.workerRef === undefined) {
      throw new Error('Worker Ref is not defined');
    }

    this.workerRef.onmessage = (
      ev: WorkerEvent<WorkerResponseEvent<WorkerObservableMessage | WorkerEvents.Callable>>
    ) => {
      const body = ev.data.result as WorkerObservableMessage | null;
      if (ev.data.type === WorkerEvents.ObservableMessage && body?.key) {
        if (this.observables[body.key] !== undefined) {
          switch (body.type) {
            case WorkerObservableMessageTypes.Next:
              this.observables[body.key].subject.next(body.value);
              break;
            case WorkerObservableMessageTypes.Error:
              this.observables[body.key].subject.error(body.error);
              break;
            case WorkerObservableMessageTypes.Complete:
              this.observables[body.key].subject.complete();
              break;
            default:
              break;
          }
        }
      } else {
        this.responseEvent?.next(ev.data as WorkerResponseEvent<WorkerEvents.Callable>);
      }
    };
  }
}
