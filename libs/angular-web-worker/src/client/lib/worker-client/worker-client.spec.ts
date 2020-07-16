import { Observable } from 'rxjs';

import { bootstrapWorker, WorkerController } from 'angular-web-worker';
import { Instantiable } from 'angular-web-worker/common';
import { MockWorker } from 'angular-web-worker/mocks';
import { FakeWorker } from 'angular-web-worker/testing';

import { WorkerClient } from './worker-client';

const tick = async (time?: number) => new Promise((resolve) => setTimeout(resolve, time));

describe('WorkerClient: [angular-web-worker/client]', () => {
  let worker: FakeWorker;
  let client: WorkerClient<MockWorker>;
  let controller: WorkerController<MockWorker>;

  const newClient = (workerRef: Worker, target: Instantiable<Object>) =>
    new WorkerClient<MockWorker>({ target, useWorkerFactory: () => workerRef });

  beforeEach(async () => {
    worker = new FakeWorker();
    controller = bootstrapWorker(MockWorker, worker.messageBus);
    client = newClient(worker, MockWorker);
    await client.connectionCompleted$.toPromise();
  });

  afterEach(async () => {
    await client.destroy();
  });

  it('should should connect on construction', () => {
    expect(client.isConnected).toBe(true);
  });

  it('should run `onWorkerInit` on construction', async () => {
    const onWorkerInit = jest.spyOn(controller.workerInstance, 'onWorkerInit');
    client = newClient(worker, MockWorker);
    await client.connectionCompleted$.toPromise();
    expect(onWorkerInit).toHaveBeenCalled();
  });

  it('should run `onWorkerDestroy` on destruction', async () => {
    const onWorkerDestroy = jest.spyOn(controller.workerInstance, 'onWorkerDestroy');
    await client.destroy();
    expect(onWorkerDestroy).toHaveBeenCalled();
  });

  describe('.get()', () => {
    it('should return a promise', () => {
      const promise = client.get((w) => w.property1);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should resolve the values of accessible properties', async () => {
      const property1 = await client.get((w) => w.property1);
      const property2 = await client.get((w) => w.property2);
      const property3 = await client.get((w) => w.property3);

      expect(property1).toBe(controller.workerInstance.property1);
      expect(property2).toBe(controller.workerInstance.property2);
      expect(property3).toBe(controller.workerInstance.property3);
    });

    it('should resolve promises', async () => {
      const promise = await client.get((w) => w.promise);
      expect(promise).toBe('promise');
    });

    it('should throw when attempting to access undecorated properties', () => {
      expect(() => client.get((w) => w.undecoratedProperty)).toThrow();
    });
  });

  describe('.set()', () => {
    it('should return a promise', () => {
      const promise = client.set((w) => w.property1, 'update');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should update worker properties', async () => {
      await client.set((w) => w.property1, 'update');
      expect(controller.workerInstance.property1).toBe('update');
    });

    it('should reject when attempting to set undecorated properties', () => {
      expect(() => client.set((w) => w.undecoratedProperty, 'update')).toThrow();
    });
  });

  describe('.call()', () => {
    it('should return a promise', () => {
      const promise = client.call((w) => w.function1('Joe', 21));
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should call the method on the worker', async () => {
      const function1 = jest.spyOn(controller.workerInstance, 'function1');
      const function2 = jest.spyOn(controller.workerInstance, 'function2');

      await client.call((w) => w.function1('Joe', 21));
      await client.call((w) => w.function2('John', 26));

      expect(function1).toHaveBeenCalledTimes(1);
      expect(function2).toHaveBeenCalledTimes(1);
    });

    it('should return the result of the call', async () => {
      const user1 = await client.call((w) => w.function1('Joe', 21));
      expect(user1).toMatchObject({ name: 'Joe', age: 21 });

      const user2 = await client.call((w) => w.function2('John', 26));
      expect(user2).toMatchObject({ name: 'John', age: 26 });
    });

    it('should resolve promise return values', async () => {
      const result = await client.call((w) => w.asyncReturnTestFn());
      expect(result).toBe('async');
    });

    it('should throw when attempting to call undecorated methods', () => {
      expect(() => client.call((w) => w.undecoratedFunction())).toThrow();
    });
  });

  describe('.observe()', () => {
    it('should return an observable', () => {
      const result = client.observe((w) => w.event);
      expect(result).toBeInstanceOf(Observable);
    });

    it('should be subscribed to the worker', async (done) => {
      const observer = client.observe((w) => w.event);

      observer.subscribe((value) => {
        expect(value).toBe('value');
        done();
      });

      await tick();
      controller.workerInstance.event.next('value');
    });

    it('should throw when attempting to subscribe to undecorated workers', () => {
      expect(() => client.observe((w) => w.undecoratedSubject).subscribe()).toThrow();
    });

    it('should manage active subscriptions to the worker', async () => {
      expect(controller.workerInstance.event.observers).toHaveLength(0);
      const observer = client.observe((w) => w.event);

      const subscription1 = observer.subscribe();
      const subscription2 = observer.subscribe();
      await tick();

      expect(controller.workerInstance.event.observers).toHaveLength(1);

      subscription1.unsubscribe();
      await tick();

      expect(controller.workerInstance.event.observers).toHaveLength(1);

      subscription2.unsubscribe();
      await tick();

      expect(controller.workerInstance.event.observers).toHaveLength(0);
    });
  });

  describe('.destroy()', () => {
    it('should close all observables', async () => {
      const subscription = client.observe((w) => w.event).subscribe();
      await client.destroy();
      expect(subscription.closed).toBeTruthy();
    });

    it('should refuse additional request', async () => {
      await client.destroy();
      await expect(client.get((w) => w.property1)).rejects.toBeTruthy();
    });
  });

  describe('.createEmitter()', () => {
    it('should return a promise', () => {
      const result = client.createEmitter((w) => w.subject).next('value');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should pass values to the worker subject', async () => {
      const next = jest.spyOn(controller.workerInstance.subject, 'next');
      await client.createEmitter((w) => w.subject).next('value');
      expect(next).toHaveBeenCalledWith('value');
    });

    it('should reject when attempting to next undecorated methods', () => {
      expect(() => client.createEmitter((w) => w.undecoratedSubject).next('value')).toThrow();
    });
  });
});
