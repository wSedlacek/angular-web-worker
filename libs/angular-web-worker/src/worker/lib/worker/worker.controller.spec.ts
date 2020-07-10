import {
  WorkerAnnotations,
  WorkerCallableBody,
  WorkerEvents,
  WorkerSubscribableBody,
} from 'angular-web-worker/common';
import { MockUser, MockWorker } from 'angular-web-worker/mocks';
import { mockRequestFactory, responseFactory } from 'angular-web-worker/utils';
import { Subject } from 'rxjs';

import { WorkerController } from './worker.controller';

describe('WorkerController: [angular-web-worker]', () => {
  const MOCK_EVENT = 'mock-event';
  const messageBus = {
    onmessage: jest.fn(),
    postMessage: jest.fn(),
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
        data: mockRequestFactory(WorkerEvents.Init),
      })
    );

    expect(spy).toHaveBeenCalled();
  });

  it('should call the onWorkerDestroy method when a destroy client request is recieved through onmessage', () => {
    const spy = jest.spyOn(controller.workerInstance, 'onWorkerDestroy');
    messageBus.onmessage(
      new MessageEvent(MOCK_EVENT, {
        data: mockRequestFactory(WorkerEvents.Destroy),
      })
    );

    expect(spy).toHaveBeenCalled();
  });

  describe('Callables', () => {
    it('should call the handleCallable method when a callable client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleCallable');
      const callableRequest = mockRequestFactory(WorkerEvents.Callable);
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
      const req = mockRequestFactory(WorkerEvents.Callable, 'syncReturnTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(responseFactory(WorkerEvents.Callable, req, 'sync'));
    });

    it('should trigger postMessage with the return value of an async function', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerCallableBody = {
        arguments: [],
      };
      const req = mockRequestFactory(WorkerEvents.Callable, 'asyncReturnTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(responseFactory(WorkerEvents.Callable, req, 'async'));
    });

    it('should transfer the object prototypes for args decorated with a @ShallowTransfer()', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const user = new MockUser({ name: 'joe', age: 20 });
      const body: WorkerCallableBody = {
        arguments: [20, user],
      };
      const req = mockRequestFactory(WorkerEvents.Callable, 'shallowTransferTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenCalledWith(responseFactory(WorkerEvents.Callable, req, 41));
    });

    it('should catch errors and return as a WorkerResponseEvent through postMessage', async () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const body: WorkerCallableBody = {
        arguments: [],
      };
      const req = mockRequestFactory(WorkerEvents.Callable, 'errorTestFn', body);
      await controller.handleCallable(req);
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ isError: true }));
    });
  });

  describe('Accessibles', () => {
    it('should call the handleAccessible method when a accessible client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleAccessible');
      const accessibleRequest = mockRequestFactory(WorkerEvents.Accessible);
      messageBus.onmessage(
        new MessageEvent(MOCK_EVENT, {
          data: accessibleRequest,
        })
      );
      expect(spy).toHaveBeenCalledWith(accessibleRequest);
    });
    it('should get the value of the variable in the worker and return it through postMessage', () => {
      const spy = jest.spyOn(controller, 'postMessage');
      const req = mockRequestFactory(WorkerEvents.Accessible, 'getTestProp', { isGet: true });
      controller.handleAccessible(req);
      expect(spy).toHaveBeenCalledWith(responseFactory(WorkerEvents.Accessible, req, 'testvalue'));
    });
  });

  describe('Subjectables', () => {});

  describe('Observables', () => {
    it('should call the handleSubscription method when a observable client request is recieved through onmessage', () => {
      const spy = jest.spyOn(controller, 'handleSubscription');
      const subscribableReq = mockRequestFactory(WorkerEvents.Observable);
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
        subscriptionKey: 'key456',
      };
      controller.handleSubscription(
        mockRequestFactory(WorkerEvents.Observable, 'undefinedSubscriptionTest', body)
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
