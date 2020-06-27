import { Accessible, Callable, OnWorkerInit, Subscribable, WebWorker } from 'angular-web-worker';
import {
  ClientWebWorker,
  WorkerClientObservablesDict,
  WorkerClientRequestOpts,
} from 'angular-web-worker/client';
import {
  SecretResult,
  WorkerAnnotations,
  WorkerEvent,
  WorkerEvents,
  WorkerObservableMessageTypes,
  WorkerRequestEvent,
  WorkerResponseEvent,
} from 'angular-web-worker/common';
import { Observable, Subject } from 'rxjs';

import { WorkerClient } from './worker-client';

// tslint:disable: max-classes-per-file
class TestUser {
  public name: string;
  public age: number;

  constructor(user: Pick<TestUser, 'age' | 'name'>) {
    this.age = user.age;
    this.name = user.name;
  }

  public birthday(): void {
    this.age += 1;
  }
}

const PrivateClientUtils = {
  observables: <T>(client: WorkerClient<T>): WorkerClientObservablesDict => {
    return client['observables'];
  },

  isSecret: <SecretType extends number, T>(
    client: WorkerClient<T>,
    result: any,
    type: SecretType
  ): SecretResult<SecretType> | null =>
    client['isSecret'].apply(client, [result, type]) as SecretResult<SecretType> | null,

  worker: <T>(client: WorkerClient<T>) => client['workerRef'],

  workerClass: <T>(client: WorkerClient<T>): T | null => client['worker'],

  executableWorker: <T>(client: WorkerClient<T>): T => client['executableWorker'],

  secrets: <T>(client: WorkerClient<T>) => client['secrets'],

  responseEvent: <T>(client: WorkerClient<T>) => client['responseEvent'],

  clientSecret: <T>(client: WorkerClient<T>) => client['workerSecret'],

  setClientSecret: <T>(client: WorkerClient<T>, secret: string): void => {
    client['workerSecret'] = secret;
  },

  sendRequest: async <EventType extends number>(
    client: WorkerClient<TestClass>,
    type: EventType,
    opts: WorkerClientRequestOpts<TestClass, EventType, any>
  ): Promise<any> => (client['sendRequest'] as Function).apply(client, [type, opts]),

  fakeConnection: async <T>(client: WorkerClient<T>): Promise<void> => {
    client.connect();
    await sleep(10);
    client['_isConnected'] = true;
  },
};

@WebWorker()
class TestClass implements OnWorkerInit {
  public undecoratedProperty?: string;
  @Accessible() public property1?: string;
  @Accessible() public property2?: TestUser;
  @Accessible({ shallowTransfer: true }) public property3?: TestUser;
  @Subscribable() public event: Subject<string> = new Subject<string>();

  constructor() {}

  @Override()
  public async onWorkerInit(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  @Callable()
  public function1(name: string, age: number): TestUser {
    return new TestUser({ name, age });
  }

  @Callable({ shallowTransfer: true })
  public function2(name: string, age: number): TestUser {
    return new TestUser({ name, age });
  }
}

class FakeWorker implements Worker {
  @Override()
  public onmessage(_ev: MessageEvent): void {}

  @Override()
  public onmessageerror(this: Worker, _ev: MessageEvent): void {}

  @Override()
  public onerror(_err: any): void {}

  @Override()
  public postMessage(_resp: any): void {}

  @Override()
  public addEventListener(): void {}

  @Override()
  public removeEventListener(): void {}

  @Override()
  public dispatchEvent(_evt: Event): boolean {
    return true;
  }

  @Override()
  public terminate(): void {}
}

// tslint:enable: max-classes-per-file

// tslint:disable-next-line: no-big-function
describe('WorkerClient: [angular-web-worker/client]', () => {
  const merge = <T>(defaultOptions: T, newOptions: Partial<T>) => ({
    ...defaultOptions,
    ...newOptions,
  });

  const serialize = <T>(obj: T): T => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      throw new Error('Unable to serialize object');
    }
  };

  const response = <T>(mergeVal?: Partial<WorkerResponseEvent<T>>): WorkerResponseEvent<T> => {
    return merge(
      {
        propertyName: 'property1',
        requestSecret: 'requestsecret',
        type: WorkerEvents.Accessible,
        isError: false,
        result: null,
      },
      mergeVal ? mergeVal : {}
    );
  };

  let client: WorkerClient<TestClass>;
  beforeEach(() => {
    client = new WorkerClient({ worker: TestClass, initFn: () => new FakeWorker() }, true, true);
  });

  describe('connect()', () => {
    it('should create a secret client key and add it to the secrets array', async () => {
      // run in worker
      client.connect();
      await sleep(10);
      expect(PrivateClientUtils.clientSecret(client)).toBeTruthy();
      expect(PrivateClientUtils.secrets(client)).toContain(PrivateClientUtils.clientSecret(client));
    });

    it(`should call the worker factory annotation to create a new worker instance with a client config`, async () => {
      // run in worker
      const spy = jest.spyOn(TestClass[WorkerAnnotations.Annotation], WorkerAnnotations.Factory);
      client.connect();
      await sleep(10);
      expect(spy).toHaveBeenCalledWith({
        isClient: true,
        clientSecret: PrivateClientUtils.clientSecret(client),
      });
      expect(PrivateClientUtils.workerClass(client)).toBeTruthy();
    });

    describe('-> Run in worker', () => {
      it(`should create a new instance of the native Worker class`, async () => {
        const clientRunInWorker = new WorkerClient({
          worker: TestClass,
          initFn: () => new FakeWorker(),
        });
        clientRunInWorker.connect();
        await sleep(10);
        expect(PrivateClientUtils.worker(clientRunInWorker) instanceof FakeWorker).toEqual(true);
      });
    });

    describe('-> Run in app', () => {
      it(`should create a new instance of the ClientWebWorker class`, async () => {
        client.connect();
        await sleep(10);
        expect(PrivateClientUtils.worker(client) instanceof ClientWebWorker).toEqual(true);
      });
    });

    it(`should send an init request to the worker which sets the connected flag to true if resolved`, async () => {
      const spy = jest.spyOn(client as any, 'sendRequest');
      client.connect();
      await sleep(10);

      expect(spy).toHaveBeenCalledWith(
        WorkerEvents.Init,
        expect.objectContaining({ isConnect: true })
      );
      (spy.mock.calls[0][1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Init,
        any
      >).resolve?.();
      expect(client.isConnected).toEqual(true);
    });
  });

  describe('Event Listeners', () => {
    let worker: ClientWebWorker<TestClass>;
    beforeEach(async () => {
      await client.connect();
      worker = PrivateClientUtils.worker(client) as ClientWebWorker<TestClass>;
      PrivateClientUtils.observables(client)['key'] = {
        subject: new Subject<any>(),
        subscription: null,
        observable: null,
        propertyName: 'event',
      };
    });

    const event = <T>(evt: T): WorkerEvent<WorkerResponseEvent<any>> =>
      new MessageEvent('TestEvent', {
        data: evt,
      });

    it('should trigger the response event when the message is not of the ObservableMessage type', () => {
      const evt = {
        type: WorkerEvents.Accessible,
        result: 'somevalue',
      };
      if (!client['responseEvent']) throw new Error('Response Event is undefined');
      const spy = spyOn(client['responseEvent'], 'next');
      worker.onmessage(event(evt));
      expect(spy).toHaveBeenCalledWith(evt as any);
    });

    it('should trigger the observable subject when a next event is received through an ObservableMessage event', () => {
      const evt = {
        type: WorkerEvents.ObservableMessage,
        result: {
          key: 'key',
          type: WorkerObservableMessageTypes.Next,
          value: 'some-value',
        },
      };
      const spy = spyOn(PrivateClientUtils.observables(client)['key'].subject, 'next');
      worker.onmessage(event(evt));
      expect(spy).toHaveBeenCalledWith('some-value');
    });

    it('should trigger the observable subject when a complete event is received through an ObservableMessage event', () => {
      const evt = {
        type: WorkerEvents.ObservableMessage,
        result: {
          key: 'key',
          type: WorkerObservableMessageTypes.Complete,
        },
      };
      const spy = spyOn(PrivateClientUtils.observables(client)['key'].subject, 'complete');
      worker.onmessage(event(evt));
      expect(spy).toHaveBeenCalled();
    });

    it('should trigger the observable subject when an error event is received through an ObservableMessage event', () => {
      const evt = {
        type: WorkerEvents.ObservableMessage,
        result: {
          key: 'key',
          type: WorkerObservableMessageTypes.Error,
          error: 'error-msg',
        },
      };
      const spy = spyOn(PrivateClientUtils.observables(client)['key'].subject, 'error');
      worker.onmessage(event(evt));
      expect(spy).toHaveBeenCalledWith('error-msg');
    });
  });

  describe('isSecret()', () => {
    it('should return null if the secret result is invalid', () => {
      expect(PrivateClientUtils.isSecret(client, 'asd', WorkerEvents.Accessible)).toEqual(null);
    });

    it('should return null if the clientSecret does not match', () => {
      PrivateClientUtils.setClientSecret(client, 'secret');
      const secret: SecretResult<WorkerEvents.Accessible> = {
        clientSecret: 'not-secret',
        type: WorkerEvents.Accessible,
        propertyName: 'property',
        body: { get: true, set: true },
      };
      expect(PrivateClientUtils.isSecret(client, secret, WorkerEvents.Accessible)).toEqual(null);
    });

    it('should return null if the secret type does not match', () => {
      const secret: SecretResult<WorkerEvents.Callable> = {
        clientSecret: 'somesecret',
        type: WorkerEvents.Callable,
        propertyName: 'property',
        body: { args: [] },
      };
      expect(PrivateClientUtils.isSecret(client, secret, WorkerEvents.Accessible)).toEqual(null);
    });

    it('should return the secret when valid', () => {
      PrivateClientUtils.setClientSecret(client, 'secret');
      const secret: SecretResult<WorkerEvents.Accessible> = {
        clientSecret: 'secret',
        type: WorkerEvents.Accessible,
        propertyName: 'property',
        body: { get: true, set: true },
      };
      expect(PrivateClientUtils.isSecret(client, secret, WorkerEvents.Accessible)).toEqual(secret);
    });
  });

  describe('sendRequest()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Accessible>>
    ): SecretResult<WorkerEvents.Accessible> => {
      return merge(
        {
          type: WorkerEvents.Accessible,
          propertyName: 'property1',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: {
            get: true,
            set: true,
          },
        },
        mergeVal ? mergeVal : {}
      );
    };

    const requestOpts = (
      mergeVal?: Partial<WorkerClientRequestOpts<TestClass, any, any>>
    ): WorkerClientRequestOpts<TestClass, any, any> =>
      merge(
        {
          secretError: '',
          isConnect: false,
          workerProperty: (w: TestClass) => w.property1,
          body: () => {
            return { isGet: true };
          },
        } as any,
        mergeVal ? mergeVal : {}
      );

    const request = (
      mergeVal?: Partial<WorkerRequestEvent<WorkerEvents.Accessible>>
    ): WorkerRequestEvent<WorkerEvents.Accessible> =>
      merge(
        {
          propertyName: 'property1',
          requestSecret: 'requestsecret',
          type: WorkerEvents.Accessible,
          body: { isGet: true },
        },
        mergeVal ? mergeVal : {}
      );

    let clientRunInWorker: WorkerClient<TestClass>;
    beforeEach(async () => {
      await client.connect();
      clientRunInWorker = new WorkerClient({ worker: TestClass, initFn: () => new FakeWorker() });
      await PrivateClientUtils.fakeConnection(clientRunInWorker);
    });

    it('should throw an error if the client is not connected and the isConnect option is false', async () => {
      try {
        client['_isConnected'] = false;
        await PrivateClientUtils.sendRequest(
          client,
          WorkerEvents.Init,
          requestOpts({ isConnect: false })
        );
      } catch (e) {
        expect(e).toEqual(
          new Error(
            'WorkerClient: the WorkerClient.connect() method must be called before a worker can be accessed'
          )
        );
      }
    });

    it('should not check the secret if no property name has been provided', async () => {
      const spy = spyOn(client as any, 'isSecret');
      PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts({ workerProperty: undefined })
      ).catch(() => {});
      await sleep(10);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should check the secret for a property/method if the property is provided as a string', async () => {
      const spy = spyOn(client as any, 'isSecret');
      PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts({ workerProperty: 'property1' })
      );
      await sleep(10);
      expect(spy).toHaveBeenCalledWith(secretResult(client), WorkerEvents.Accessible);
    });

    it('should check the secret for a property/method if the property is provided as a lambda expression', async () => {
      const spy = spyOn<any>(client, 'isSecret').and.callThrough();
      PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, requestOpts());
      await sleep(10);
      expect(spy).toHaveBeenCalledWith(secretResult(client), WorkerEvents.Accessible);
    });

    it('should be rejected with the secret error if an undecorated property/method is provided', async () => {
      const promise = PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts({ secretError: 'secret error', workerProperty: (w) => w.undecoratedProperty })
      );
      await expect(promise).rejects.toEqual(new Error('secret error'));
    });

    it('should run additional conditions, passing in the secret result', async () => {
      const additionalCondition = {
        if: (_result: SecretResult<any>) => true,
        reject: (_result: SecretResult<any>) => 'rejected condition 1',
      };
      const spy = jest.spyOn(additionalCondition, 'if');
      PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts({ additionalConditions: [additionalCondition] })
      );
      await sleep(10);
      expect(spy).toHaveBeenCalledWith(secretResult(client));
    });

    it('should be rejected if an additional condition fails', async () => {
      const additionalCondition = {
        if: (_result: SecretResult<any>) => false,
        reject: (_result: SecretResult<any>) => 'rejected condition 2',
      };
      const spy = jest.spyOn(additionalCondition, 'reject');
      const promise = PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts({ additionalConditions: [additionalCondition] })
      );
      await expect(promise).rejects.toEqual('rejected condition 2');
      expect(spy).toHaveBeenCalledWith(secretResult(client));
    });

    it('should call the beforeRequest option, if provided, with the secret', () => {
      const requestOptions = requestOpts({
        beforeRequest: (_secret) => 10,
      });
      const spy = jest.spyOn(requestOptions, 'beforeRequest');
      PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, requestOptions);
      expect(spy).toHaveBeenCalledWith(secretResult(client));
    });

    it(`should subscribe to the response event to receive messages sent back from the worker`, async () => {
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(1);
      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, requestOpts());
      await sleep(10);
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(2);
    });

    it('should add a request secret to the secrets array', () => {
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(2);
      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, requestOpts());
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(3);
    });

    it('should post a message to the worker', () => {
      jest.spyOn(client as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const spy = jest.spyOn(client as any, 'postMessage');
      PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, requestOpts());
      expect(spy).toHaveBeenCalledWith(request());
    });

    it('should post a message to the worker with the value returned by the body function', async () => {
      jest.spyOn(client as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        body: (_secret) => ({ isGet: false }),
      });

      await client.connect();
      const bodySpy = jest.spyOn(opts, 'body');
      const postMessageSpy = jest.spyOn(client as any, 'postMessage');

      PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, opts);
      expect(bodySpy).toHaveBeenLastCalledWith(secretResult(client), undefined);
      expect(postMessageSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ body: { isGet: false } })
      );
    });

    it('should pass the value returned by the beforeRequest option, if provided, to the body function', () => {
      jest.spyOn(client as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        body: (_secret) => ({ isGet: false }),
        beforeRequest: () => 100,
      });
      const bodySpy = jest.spyOn(opts, 'body');

      PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, opts);
      expect(bodySpy).toHaveBeenCalledWith(secretResult(client), 100);
    });

    it('should map the correct worker response to resolve the promise', async () => {
      jest.spyOn(client as any, 'generateSecretKey').mockReturnValue('requestsecret');
      await PrivateClientUtils.sendRequest(client, WorkerEvents.Accessible, requestOpts());
      PrivateClientUtils.worker(client)?.onmessage?.(
        new MessageEvent('response', { data: response() })
      );
    }, 1000);

    it('should unsubscribe from the worker response event after resolved', async () => {
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(1);
      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, requestOpts());
      await sleep(10);
      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response() })
      );
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(1);
    }, 1000);

    it('should remove the request secret from the secrets array when resolved', () => {
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(2);
      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, requestOpts());
      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', {
          data: response({ requestSecret: PrivateClientUtils.secrets(clientRunInWorker)[2] }),
        })
      );
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(2);
    });

    it('should call the resolve option and return its value when the promise is resolved', async () => {
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        resolve: (_resp, _secret) => 200,
      });
      const spy = jest.spyOn(opts, 'resolve');
      const promise = PrivateClientUtils.sendRequest(
        clientRunInWorker,
        WorkerEvents.Accessible,
        opts
      );
      await sleep(10);
      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response() })
      );
      await expect(promise).resolves.toEqual(200);
      expect(spy).toHaveBeenCalledWith(response(), secretResult(clientRunInWorker), undefined);
    }, 1000);

    it('should pass the value returned by the beforeRequest option, if provided, to the resolve function', async () => {
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        resolve: (_resp, _secret) => 200,
        beforeRequest: (_secret) => 500,
      });
      const spy = jest.spyOn(opts, 'resolve');
      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, opts);
      await sleep(10);

      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response() })
      );
      expect(spy).toHaveBeenCalledWith(response(), secretResult(clientRunInWorker), 500);
    }, 1000);

    it('should be rejected if the worker returns an error response', async () => {
      jest.spyOn(client as any, 'generateSecretKey').mockReturnValue('requestsecret');

      const promise = PrivateClientUtils.sendRequest(
        client,
        WorkerEvents.Accessible,
        requestOpts()
      );
      await sleep(10);

      PrivateClientUtils.worker(client)?.onmessage?.(
        new MessageEvent('response', { data: response({ isError: true }) })
      );

      await expect(promise).rejects.toHaveBeenCalled();
    }, 1000);

    it('should remove the request secret from the secrets array when rejected', async () => {
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(2);
      PrivateClientUtils.sendRequest(
        clientRunInWorker,
        WorkerEvents.Accessible,
        requestOpts()
      ).catch((err) => {});
      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', {
          data: response({
            requestSecret: PrivateClientUtils.secrets(clientRunInWorker)[2],
            isError: true,
          }),
        })
      );
      await sleep(10);
      expect(PrivateClientUtils.secrets(clientRunInWorker).length).toEqual(2);
    });

    it('should unsubscribe from the worker response event if the worker responds with an error response', async () => {
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(1);
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      PrivateClientUtils.sendRequest(
        clientRunInWorker,
        WorkerEvents.Accessible,
        requestOpts()
      ).catch(() => {});
      await sleep(10);
      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response({ isError: true }) })
      );
      expect(PrivateClientUtils.responseEvent(clientRunInWorker)?.observers.length).toEqual(1);
    }, 1000);

    it('should call the beforeReject option if the worker returns an error response', async () => {
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        beforeReject: (_resp, _secret, _context) => ({ isGet: false }),
        beforeRequest: () => 100,
      });
      const spy = spyOn(opts, 'beforeReject');

      PrivateClientUtils.sendRequest(
        clientRunInWorker,
        WorkerEvents.Accessible,
        opts
      ).catch(() => {});
      await sleep(10);

      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response({ isError: true }) })
      );
      expect(spy).toHaveBeenCalledWith(
        response({ isError: true }),
        secretResult(clientRunInWorker),
        100
      );
    }, 1000);

    it('should not map an incorrect worker response', async () => {
      jest.spyOn(clientRunInWorker as any, 'generateSecretKey').mockReturnValue('requestsecret');
      const opts = requestOpts({
        resolve: (_secret) => ({ isGet: false }),
      });
      const spy = jest.spyOn(opts, 'resolve');

      PrivateClientUtils.sendRequest(clientRunInWorker, WorkerEvents.Accessible, opts);
      await sleep(10);

      PrivateClientUtils.worker(clientRunInWorker)?.onmessage?.(
        new MessageEvent('response', { data: response({ type: WorkerEvents.Callable }) })
      );
      expect(spy).not.toHaveBeenCalled();
    }, 1000);
  });

  describe('get()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Accessible>>
    ): SecretResult<WorkerEvents.Accessible> => {
      return merge(
        {
          type: WorkerEvents.Accessible,
          propertyName: 'property1',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: {
            get: true,
            set: true,
          },
        },
        mergeVal ? mergeVal : {}
      );
    };

    let opts: WorkerClientRequestOpts<TestClass, WorkerEvents.Accessible, any>;
    let spy: jest.SpyInstance;
    beforeEach(async () => {
      await client.connect();
      spy = jest.spyOn(client as any, 'sendRequest');
      client.get((w) => w.property1);
      opts = spy.mock.calls[0][1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Accessible,
        any
      >;
    });

    it('should pass the worker property lambda to the request', () => {
      expect((opts.workerProperty as Function)(PrivateClientUtils.workerClass(client))).toEqual(
        PrivateClientUtils.workerClass(client)?.property1
      );
    });

    it('should check that the metadata allows for the get operation to be applied', () => {
      expect(
        opts.additionalConditions?.[0].if(secretResult(client, { body: { get: false, set: true } }))
      ).toEqual(false);
      expect(
        opts.additionalConditions?.[0].if(secretResult(client, { body: { get: true, set: true } }))
      ).toEqual(true);
    });

    it('should send the correct request body to the worker', () => {
      expect(opts.body?.(secretResult(client, { body: { get: false, set: true } }))).toEqual({
        isGet: true,
      });
    });

    it('should resolve with the response result', () => {
      expect(
        opts.resolve?.(
          response({ result: 'propertyvalue' }),
          secretResult(client, { body: { get: false, set: true } })
        )
      ).toEqual('propertyvalue');
    });

    it('should not transfer the prototype of the resolved result if the shallowTransfer option is false or unset', () => {
      client.get((w) => w.property2);
      const argOpts = spy.mock.calls[0][1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Accessible,
        any
      >;
      const user = new TestUser({ name: 'joe soap', age: 20 });
      expect(
        argOpts.resolve?.(
          response({ result: serialize(user), propertyName: 'property2' }),
          secretResult(client, { body: { get: false, set: true } })
        ).birthday
      ).toBeFalsy();
    });

    it('should transfer the prototype of the resolved result if the shallowTransfer option is true', () => {
      client.get((w) => w.property3);
      const argOpts = spy.mock.calls[0][1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Accessible,
        any
      >;
      const user = new TestUser({ name: 'joe soap', age: 20 });
      expect(
        argOpts.resolve?.(
          response({ result: serialize(user), propertyName: 'property3' }),
          secretResult(client, { body: { get: false, set: true } })
        ).birthday
      ).toBeTruthy();
    });
  });

  describe('set()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Accessible>>
    ): SecretResult<WorkerEvents.Accessible> =>
      merge(
        {
          type: WorkerEvents.Accessible,
          propertyName: 'property1',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: {
            get: true,
            set: true,
          },
        },
        mergeVal ? mergeVal : {}
      );

    let opts: WorkerClientRequestOpts<TestClass, WorkerEvents.Accessible, any>;
    beforeEach(async () => {
      await client.connect();
      const spy = spyOn<any>(client, 'sendRequest');
      client.set((w) => w.property1, 'value');
      opts = spy.calls.mostRecent().args[1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Accessible,
        any
      >;
    });

    it('should pass the worker property lambda to the request', () => {
      expect((opts.workerProperty as Function)(PrivateClientUtils.workerClass(client))).toEqual(
        PrivateClientUtils.workerClass(client)?.property1
      );
    });

    it('should check that the metadata allows for the set operation to be applied', () => {
      expect(
        opts.additionalConditions?.[0].if(
          secretResult(client, { body: { get: false, set: false } })
        )
      ).toEqual(false);
      expect(
        opts.additionalConditions?.[0].if(secretResult(client, { body: { get: false, set: true } }))
      ).toEqual(true);
    });

    it('should send the correct request body to the worker', () => {
      expect(opts.body?.(secretResult(client, { body: { get: false, set: true } }))).toEqual({
        isGet: false,
        value: 'value',
      });
    });
  });

  describe('call()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Callable>>
    ): SecretResult<WorkerEvents.Callable> => {
      return merge(
        {
          type: WorkerEvents.Callable,
          propertyName: 'function1',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: {
            args: ['joe soap', 20],
          },
        },
        mergeVal ? mergeVal : {}
      );
    };

    let opts: WorkerClientRequestOpts<TestClass, WorkerEvents.Callable, any>;
    let spy: jest.SpyInstance;
    beforeEach(async () => {
      await client.connect();
      spy = jest.spyOn(client as any, 'sendRequest');
      client.call((w) => w.function1('joe soap', 20));
      opts = spy.mock.calls[0][1];
    });

    it('should call the worker method in the lambda expression', () => {
      if (typeof opts.workerProperty !== 'function') {
        throw new Error('opts.workerProperty is not a function');
      }

      const worker = PrivateClientUtils.workerClass(client);
      if (worker === null) throw new Error('Worker is undefined');

      const result = opts.workerProperty(worker);
      expect(result).toEqual(PrivateClientUtils.workerClass(client)?.function1('joe soap', 20));
    });

    it('should pass the function arguments as the body', () => {
      expect(opts.body?.(secretResult(client, { body: { args: ['name', 20] } }))).toEqual({
        arguments: ['name', 20],
      });
    });

    it('should resolve with the response result', () => {
      expect(
        opts.resolve?.(
          response({ result: 'result', propertyName: 'function1' }),
          secretResult(client)
        )
      ).toEqual('result');
    });

    it('should not transfer the prototype of the resolved result if the shallowTransfer option is false or unset', () => {
      const user = new TestUser({ name: 'joe soap', age: 20 });
      expect(
        opts.resolve?.(
          response({ result: serialize(user), propertyName: 'function1' }),
          secretResult(client)
        ).birthday
      ).toBeFalsy();
    });

    it('should transfer the prototype of the resolved result if the shallowTransfer option is true', () => {
      client.call((w) => w.function2('name', 20));
      opts = spy.mock.calls[0][1];
      const user = new TestUser({ name: 'joe soap', age: 20 });
      expect(
        opts.resolve?.(
          response({ result: serialize(user), propertyName: 'function2' }),
          secretResult(client)
        ).birthday
      ).toBeTruthy();
    });
  });

  describe('subscribe()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Observable>>
    ): SecretResult<WorkerEvents.Observable> => {
      return merge(
        {
          type: WorkerEvents.Observable,
          propertyName: 'event',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: null,
        },
        mergeVal ? mergeVal : {}
      );
    };

    let opts: WorkerClientRequestOpts<TestClass, WorkerEvents.Observable, any>;
    beforeEach(async () => {
      await client.connect();
      const spy = spyOn<any>(client, 'sendRequest').and.callThrough();
      client.subscribe(
        (w) => w.event,
        (str) => {}
      );
      opts = spy.calls.mostRecent().args[1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Observable,
        any
      >;
    });

    it('should pass the worker subject in the lambda expression', () => {
      expect((opts.workerProperty as Function)(PrivateClientUtils.workerClass(client))).toEqual(
        PrivateClientUtils.workerClass?.(client)?.event
      );
    });

    it('should pass the correct data in the request body', () => {
      expect(opts.body?.(secretResult(client), 'secret-key')).toEqual({
        subscriptionKey: 'secret-key',
        isUnsubscribe: false,
      });
      expect((opts.workerProperty as Function)(PrivateClientUtils.workerClass(client))).toEqual(
        PrivateClientUtils.workerClass(client)?.event
      );
    });

    it('should create a subscription before the request is sent', () => {
      const spy = jest.spyOn(client as any, 'createSubscription');
      const key = opts.beforeRequest?.(secretResult(client));
      expect(spy).toHaveBeenCalled();
      expect(spy).toReturnWith(key);
    });

    it('should remove the subscription if rejected', () => {
      const spy = jest.spyOn(client as any, 'removeSubscription');
      opts.beforeReject?.(
        response({ propertyName: 'event' }),
        secretResult(client),
        'subscription-key'
      );
      expect(spy).toHaveBeenCalledWith('subscription-key');
    });

    it('should resolve with the newly created subscription', () => {
      const subject = new Subject<any>();
      PrivateClientUtils.observables(client)['subscription-key'] = {
        subject,
        propertyName: 'event',
        subscription: subject.subscribe(),
        observable: null,
      };
      expect(
        opts.resolve?.(
          response({ propertyName: 'event' }),
          secretResult(client),
          'subscription-key'
        )
      ).toEqual(subject.subscribe());
    });

    describe('createSubscription()', () => {
      const subscriptionMethods = {
        next: (_val: string) => {},
        error: (_err: any) => {},
        complete: () => {},
      };

      beforeEach(async () => {
        await client.connect();
      });

      it('should create a new key and add a new subject and a subscription to the observables dictionary with this key', () => {
        const key = client['createSubscription']('event');
        expect(PrivateClientUtils.observables(client)[key].subject).toBeTruthy();
        expect(PrivateClientUtils.observables(client)[key].subscription).toBeTruthy();
        expect(PrivateClientUtils.observables(client)[key].subject.observers.length).toEqual(1);
      });

      it('The subscription should subscribe the subject and act on the next event', () => {
        const spy = spyOn(subscriptionMethods, 'next');
        const key = client['createSubscription']('event', subscriptionMethods.next);
        PrivateClientUtils.observables(client)[key].subject.next();
        expect(spy).toHaveBeenCalled();
      });

      it('The subscription should subscribe the subject and act on the error event', () => {
        const spy = spyOn(subscriptionMethods, 'error');
        const key = client['createSubscription'](
          'event',
          subscriptionMethods.next,
          subscriptionMethods.error,
          subscriptionMethods.complete
        );
        PrivateClientUtils.observables(client)[key].subject.error(null);
        expect(spy).toHaveBeenCalledWith(null);
      });

      it('The subscription should subscribe the subject and act on the complete event', () => {
        const spy = spyOn(subscriptionMethods, 'complete');
        const key = client['createSubscription'](
          'event',
          subscriptionMethods.next,
          subscriptionMethods.error,
          subscriptionMethods.complete
        );
        PrivateClientUtils.observables(client)[key].subject.complete();
        expect(spy).toHaveBeenCalledWith();
      });
    });
  });

  describe('observe()', () => {
    const secretResult = (
      workerClient: WorkerClient<TestClass>,
      mergeVal?: Partial<SecretResult<WorkerEvents.Observable>>
    ): SecretResult<WorkerEvents.Observable> => {
      return merge(
        {
          type: WorkerEvents.Observable,
          propertyName: 'event',
          clientSecret: PrivateClientUtils.clientSecret(workerClient),
          body: null,
        },
        mergeVal ? mergeVal : {}
      );
    };

    let opts: WorkerClientRequestOpts<TestClass, WorkerEvents.Observable, any>;
    beforeEach(async () => {
      await client.connect();
      const spy = jest.spyOn(client as any, 'sendRequest');
      client.observe((w) => w.event);
      opts = spy.mock.calls[0][1] as WorkerClientRequestOpts<
        TestClass,
        WorkerEvents.Observable,
        any
      >;
    });

    it('should pass the worker subject in the lambda expression', () => {
      if (typeof opts.workerProperty !== 'function') {
        throw new Error('workerProperty is not a function');
      }

      const worker = PrivateClientUtils.workerClass(client);
      if (worker === null) throw new Error('Could not fetch Worker');
      const result = opts.workerProperty(worker);
      expect(result).toEqual(PrivateClientUtils.workerClass(client)?.event);
    });

    it('should pass the correct data in the request body', () => {
      expect(opts.body?.(secretResult(client), 'secret-key')).toEqual({
        subscriptionKey: 'secret-key',
        isUnsubscribe: false,
      });
      expect((opts.workerProperty as Function)(PrivateClientUtils.workerClass(client))).toEqual(
        PrivateClientUtils.workerClass(client)?.event
      );
    });

    it('should create an observable before the request is sent', () => {
      const spy = jest.spyOn(client as any, 'createObservable');
      const key = opts.beforeRequest?.(secretResult(client));
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveReturnedWith(key);
    });

    it('should remove the subscription if rejected', () => {
      const spy = jest.spyOn(client as any, 'removeSubscription');
      opts.beforeReject?.(
        response({ propertyName: 'event' }),
        secretResult(client),
        'subscription-key'
      );
      expect(spy).toHaveBeenCalledWith('subscription-key');
    });

    it('should resolve with the newly created observable', () => {
      const subject = new Subject<any>();
      PrivateClientUtils.observables(client)['subscription-key'] = {
        subject,
        propertyName: 'event',
        subscription: null,
        observable: subject.asObservable(),
      };
      expect(
        opts.resolve?.(
          response({ propertyName: 'event' }),
          secretResult(client),
          'subscription-key'
        )
      ).toEqual(subject.asObservable());
    });

    describe('createObservable()', () => {
      it('should create a new key and add a new subject and an observable to the observables dictionary with this key', async () => {
        await client.connect();
        const key = client['createObservable']('event');
        expect(PrivateClientUtils.observables(client)[key].subject).toBeTruthy();
        expect(PrivateClientUtils.observables(client)[key].observable).toBeTruthy();
      });
    });
  });

  describe('unsubscribe()', () => {
    const addObservable = (
      workerClient: WorkerClient<TestClass>,
      key: string,
      propertyName: string,
      subscription: boolean
    ) => {
      const subject = new Subject<any>();
      PrivateClientUtils.observables(workerClient)[key] = {
        propertyName,
        subject,
        subscription: subscription ? subject.subscribe() : null,
        observable: !subscription ? subject.asObservable() : null,
      };
    };

    beforeEach(async () => {
      await client.connect();
      addObservable(client, 'subscription', 'event1', true);
      addObservable(client, 'observable', 'event2', false);
      addObservable(client, 'subscription2', 'event3', true);
    });

    it('should find the property name associated with a subscription and send this in the request', () => {
      const spy = jest.spyOn(client as any, 'sendRequest').mockImplementation(() => {});
      const subscription = PrivateClientUtils.observables(client)['subscription2'].subscription;
      if (subscription !== null) client.unsubscribe(subscription);
      expect(spy).toHaveBeenLastCalledWith(
        WorkerEvents.Observable,
        expect.objectContaining({ workerProperty: 'event3' })
      );
    });

    it('should find the property name associated with an observable and send this in the request', () => {
      const spy = jest.spyOn(client as any, 'sendRequest').mockImplementation(() => {});
      const observable = PrivateClientUtils.observables(client)['observable'].observable;
      if (observable !== null) client.unsubscribe(observable);
      expect(spy).toHaveBeenLastCalledWith(
        WorkerEvents.Observable,
        expect.objectContaining({ workerProperty: 'event2' })
      );
    });

    it('should do nothing if the subscription/observable does not exist in the dictionary', () => {
      const spy = spyOn(client as any, 'removeSubscription');
      jest.spyOn(client as any, 'sendRequest');
      const observable = new Observable<any>();
      client.unsubscribe(observable);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should remove the subscription', () => {
      jest.spyOn(client as any, 'sendRequest').mockImplementation(() => {});
      const spy = jest.spyOn(client as any, 'removeSubscription');
      const subscription = PrivateClientUtils.observables(client)['subscription'].subscription;
      if (subscription !== null) client.unsubscribe(subscription);
      expect(spy).toHaveBeenCalledWith('subscription');
      expect(PrivateClientUtils.observables(client)['subscription']).toBeFalsy();
    });
  });
});

const sleep = async (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};
