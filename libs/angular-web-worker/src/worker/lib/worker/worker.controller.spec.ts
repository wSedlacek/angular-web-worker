import {
  WorkerAccessibleBody,
  WorkerAnnotations,
  WorkerCallableBody,
  WorkerEvents,
  WorkerRequestEvent,
  WorkerResponseEvent,
  WorkerSubscribableBody,
} from 'angular-web-worker/common';
import { MockUser, MockWorker } from 'angular-web-worker/internal-utils';
import { Subject } from 'rxjs';

import { WorkerController } from './worker.controller';

describe('WorkerController: [angular-web-worker]', () => {
  const MOCK_EVENT = 'mock-event';
  const messageBus = {
    onmessage: jest.fn(),
    postMessage: jest.fn(),
  };

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

  let controller: WorkerController<MockWorker>;

  beforeEach(() => {
    controller = new WorkerController(MockWorker, messageBus);
  });

  afterEach(() => {
    controller.removeAllSubscriptions();
  });

  it('should call the worker factory annotation to create a new worker instance with a non-client config', () => {
    const spy = jest.spyOn(MockWorker[WorkerAnnotations.Annotation], WorkerAnnotations.Factory);
    controller = new WorkerController(MockWorker, messageBus);
    expect(spy).toHaveBeenCalledWith({ isClient: false });
  });

  it('should call the onWorkerInit method when a init client request is recieved through onmessage', () => {
    const spy = jest.spyOn(controller.workerInstance, 'onWorkerInit');
    messageBus.onmessage(
      new MessageEvent(MOCK_EVENT, {
        data: createRequest(WorkerEvents.Init),
      })
    );

    expect(spy).toHaveBeenCalled();
  });

  it('should call the onWorkerDestroy method when a destroy client request is recieved through onmessage', () => {
    const spy = jest.spyOn(controller.workerInstance, 'onWorkerDestroy');
    messageBus.onmessage(
      new MessageEvent(MOCK_EVENT, {
        data: createRequest(WorkerEvents.Destroy),
      })
    );

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
      const user = new MockUser({ name: 'joe', age: 20 });
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

    it('should unsubscribe from all subscriptions', () => {
      const subject1 = new Subject<any>();
      const subject2 = new Subject<any>();
      controller['subscriptions'].set('1', subject1.subscribe());
      controller['subscriptions'].set('2', subject1.subscribe());
      controller['subscriptions'].set('3', subject2.subscribe());
      controller.removeAllSubscriptions();
      expect(subject1.observers.length).toEqual(0);
      expect(subject2.observers.length).toEqual(0);
      expect(controller['subscriptions'].get('1')).toBeFalsy();
      expect(controller['subscriptions'].get('2')).toBeFalsy();
      expect(controller['subscriptions'].get('3')).toBeFalsy();
    });
  });
});
