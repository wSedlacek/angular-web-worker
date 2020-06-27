import {
  Accessible,
  Callable,
  OnWorkerInit,
  ShallowTransfer,
  Subscribable,
  WebWorker,
} from 'angular-web-worker';
import {
  WorkerAccessibleBody,
  WorkerAnnotations,
  WorkerCallableBody,
  WorkerEvents,
  WorkerObservableMessageTypes,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerSubscribableBody,
} from 'angular-web-worker/common';
import { Subject, Subscription } from 'rxjs';

import { WorkerController } from './worker.controller';

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

@WebWorker()
class TestClass implements OnWorkerInit {
  @Accessible() public setTestProp?: number;
  @Accessible() public getTestProp = 'testvalue';
  @Accessible({ shallowTransfer: true }) public transferableTestProp?: TestUser;
  @Subscribable() public subscriptionTest: Subject<any> = new Subject<string>();
  @Subscribable() public undefinedSubscriptionTest?: Subject<any>;

  constructor() {}

  @Override()
  public onWorkerInit(): void {}

  @Callable()
  public argsTestFn(_name: string, _age: number): void {}

  @Callable()
  public syncReturnTestFn(): string {
    return 'sync';
  }

  @Callable()
  public async asyncReturnTestFn(): Promise<string> {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve('async');
      }, 100);
    });
  }

  @Callable()
  public shallowTransferTestFn(baseAge: number, @ShallowTransfer() user: TestUser): number {
    user.birthday();

    return baseAge + user.age;
  }

  @Callable()
  public errorTestFn(): void {
    throw new Error('error');
  }
}
// tslint:enable: max-classes-per-file

const MOCK_EVENT = 'mock-event';
const messageBus = {
  onmessage: jest.fn(),
  postMessage: jest.fn(),
};

// tslint:disable-next-line: no-big-function
describe('WorkerController: [angular-web-worker]', () => {
  const createRequest = <T extends number>(
    type: T,
    propertyName?: string,
    body?: any
  ): WorkerRequestEvent<T> => {
    return {
      type,
      body: body ? JSON.parse(JSON.stringify(body)) : null,
      propertyName: propertyName ?? null,
      requestSecret: 'secret',
    };
  };

  const createResponse = (
    request: WorkerRequestEvent<any>,
    result?: any
  ): WorkerResponseEvent<any> => {
    return {
      result,
      type: request.type,
      isError: false,
      propertyName: request.propertyName,
      requestSecret: 'secret',
    };
  };

  const privateWorker = <T>(workerController: WorkerController<T>): TestClass => {
    return workerController['worker'];
  };

  const privateSubscriptionsDict = <T>(
    workerController: WorkerController<T>
  ): { [id: string]: Subscription } => {
    return workerController['subscriptions'];
  };

  let controller: WorkerController<TestClass>;

  beforeEach(() => {
    controller = new WorkerController(TestClass, messageBus);
  });

  it('should call the worker factory annotation to create a new worker instance with a non-client config', () => {
    const spy = jest.spyOn(TestClass[WorkerAnnotations.Annotation], WorkerAnnotations.Factory);
    controller = new WorkerController(TestClass, messageBus);
    expect(spy).toHaveBeenCalledWith({ isClient: false });
  });

  it('should call the handleInit method when a init client request is recieved through onmessage', () => {
    const spy = jest.spyOn(controller, 'handleInit');
    const initRequest = createRequest(WorkerEvents.Init);
    messageBus.onmessage(
      new MessageEvent(MOCK_EVENT, {
        data: initRequest,
      })
    );
    expect(spy).toHaveBeenCalledWith(initRequest);
  });

  it('should call the OnWorkerInit hook if implemented', () => {
    const spy = jest.spyOn(privateWorker(controller), 'onWorkerInit');
    controller.handleInit(createRequest(WorkerEvents.Init));
    expect(spy).toHaveBeenCalled();
  });

  describe('Callables', () => {
    it('should call the handleCallable method when a callable client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleCallable');
      const callableRequest = createRequest(WorkerEvents.Callable);
      messageBus.onmessage(
        new MessageEvent(MOCK_EVENT, {
          data: callableRequest,
        })
      );
      expect(spy).toHaveBeenCalledWith(callableRequest);
    });

    it('should call the correct worker method with the arguments from the request', async () => {
      const spy = jest.spyOn(privateWorker(controller), 'argsTestFn');
      const body: WorkerCallableBody = {
        arguments: ['Joe', 2],
      };
      await controller.handleCallable(createRequest(WorkerEvents.Callable, 'argsTestFn', body));
      expect(spy).toHaveBeenCalledWith('Joe', 2);
    });

    it('should trigger postMessage with the return value of a sync function', async () => {
      const spy = jest.spyOn(messageBus, 'postMessage');
      const body: WorkerCallableBody = {
        arguments: [],
      };
      const req = createRequest(WorkerEvents.Callable, 'syncReturnTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(createResponse(req, 'sync'));
    });

    it('should trigger postMessage with the return value of an async function', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerCallableBody = {
        arguments: [],
      };
      const req = createRequest(WorkerEvents.Callable, 'asyncReturnTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(createResponse(req, 'async'));
    });

    it('should transfer the object prototypes for args decorated with a @ShallowTransfer()', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const user = new TestUser({ name: 'joe', age: 20 });
      const body: WorkerCallableBody = {
        arguments: [20, user],
      };
      const req = createRequest(WorkerEvents.Callable, 'shallowTransferTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(createResponse(req, 41));
    });

    it('should catch errors and return as a WorkerResponseEvent through postMessage', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerCallableBody = {
        arguments: [],
      };
      const req = createRequest(WorkerEvents.Callable, 'errorTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ isError: true }));
    });
  });

  describe('Accessibles', () => {
    it('should call the handleAccessible method when a accessible client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleAccessible');
      const accessibleRequest = createRequest(WorkerEvents.Accessible);
      messageBus.onmessage(
        new MessageEvent(MOCK_EVENT, {
          data: accessibleRequest,
        })
      );
      expect(spy).toHaveBeenCalledWith(accessibleRequest);
    });

    it('should set the value of the variable in the worker', () => {
      const body: WorkerAccessibleBody = {
        isGet: false,
        value: 12,
      };
      controller.handleAccessible(createRequest(WorkerEvents.Accessible, 'setTestProp', body));
      expect(privateWorker(controller).setTestProp).toEqual(12);
    });

    it('should set the value and transfer prototype of a value when the shallowTransfer option is true', () => {
      const body: WorkerAccessibleBody = {
        isGet: false,
        value: new TestUser({ name: 'name', age: 20 }),
      };
      controller.handleAccessible(
        createRequest(WorkerEvents.Accessible, 'transferableTestProp', body)
      );
      expect(privateWorker(controller).transferableTestProp?.birthday).toBeTruthy();
    });

    it('should get the value of the variable in the worker and return it through postMessage', () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerAccessibleBody = {
        isGet: true,
      };
      const req = createRequest(WorkerEvents.Accessible, 'getTestProp', body);
      controller.handleAccessible(req);
      expect(spy).toHaveBeenCalledWith(createResponse(req, 'testvalue'));
    });
  });

  describe('Observables', () => {
    it('should call the handleSubscription method when a observable client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleSubscription');
      const subscribableReq = createRequest(WorkerEvents.Observable);
      messageBus.onmessage(
        new MessageEvent(MOCK_EVENT, {
          data: subscribableReq,
        })
      );
      expect(spy).toHaveBeenCalledWith(subscribableReq);
    });

    it('should should add a subscription to the targeted event subject and add it to the dictionary', () => {
      jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: false,
        subscriptionKey: 'key123',
      };
      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'subscriptionTest', body)
      );
      expect(privateWorker(controller).subscriptionTest.observers.length).toEqual(1);
      expect(privateSubscriptionsDict(controller)['key123']).toBeTruthy();
    });

    it('should should unsubscribe from the targeted event subject', () => {
      privateSubscriptionsDict(controller)['key456'] = privateWorker(
        controller
      ).subscriptionTest.subscribe();
      jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: true,
        subscriptionKey: 'key456',
      };
      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'subscriptionTest', body)
      );
      expect(privateWorker(controller).subscriptionTest.observers.length).toEqual(0);
      expect(privateSubscriptionsDict(controller)['key456']).toBeFalsy();
    });

    it('should catch the error when subscribing from an undefined event subject and return the error in the form of a WorkerResponseEvent through postMessage', () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: false,
        subscriptionKey: 'key456',
      };
      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'undefinedSubscriptionTest', body)
      );
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ isError: true }));
    });

    it("should post an observable message when the subscribed subject's next method is triggered", () => {
      const postMessageSpy = jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: false,
        subscriptionKey: 'key123',
      };
      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'subscriptionTest', body)
      );
      expect(postMessageSpy).toHaveBeenCalled();

      const postSubscriptionSpy = jest.spyOn(controller, 'postSubscriptionMessage');
      privateWorker(controller).subscriptionTest.next('value');
      expect(postSubscriptionSpy).toHaveBeenCalledWith({
        type: WorkerEvents.ObservableMessage,
        propertyName: 'subscriptionTest',
        isError: false,
        requestSecret: null,
        result: {
          key: 'key123',
          type: WorkerObservableMessageTypes.Next,
          value: 'value',
        },
      });
    });

    it("should post an observable message when the subscribed subject's complete method is triggered", () => {
      const postMessageSpy = jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: false,
        subscriptionKey: 'key123',
      };

      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'subscriptionTest', body)
      );
      expect(postMessageSpy).toHaveBeenCalled();

      const postSubscriptionSpy = jest.spyOn(controller, 'postSubscriptionMessage');
      privateWorker(controller).subscriptionTest.complete();
      expect(postSubscriptionSpy).toHaveBeenCalledWith({
        type: WorkerEvents.ObservableMessage,
        propertyName: 'subscriptionTest',
        isError: false,
        requestSecret: null,
        result: {
          key: 'key123',
          type: WorkerObservableMessageTypes.Complete,
        },
      });
    });

    it("should post an observable message when the subscribed subject's error is fired", () => {
      const postMessageSpy = jest.spyOn(controller, 'postMessage');
      const body: WorkerSubscribableBody = {
        isUnsubscribe: false,
        subscriptionKey: 'key123',
      };
      controller.handleSubscription(
        createRequest(WorkerEvents.Observable, 'subscriptionTest', body)
      );
      expect(postMessageSpy).toHaveBeenCalled();

      const postSubscriptionSpy = jest.spyOn(controller, 'postSubscriptionMessage');
      privateWorker(controller).subscriptionTest.error(null);
      expect(postSubscriptionSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isError: true,
          result: expect.objectContaining({ type: WorkerObservableMessageTypes.Error }),
        })
      );
    });

    it('should unsubscribe from all subscriptions', () => {
      const subject1 = new Subject<any>();
      const subject2 = new Subject<any>();
      controller['subscriptions']['1'] = subject1.subscribe();
      controller['subscriptions']['2'] = subject1.subscribe();
      controller['subscriptions']['3'] = subject2.subscribe();
      controller.removeAllSubscriptions();
      expect(subject1.observers.length).toEqual(0);
      expect(subject2.observers.length).toEqual(0);
      expect(controller['subscriptions']['1']).toBeFalsy();
      expect(controller['subscriptions']['2']).toBeFalsy();
      expect(controller['subscriptions']['3']).toBeFalsy();
    });
  });
});
