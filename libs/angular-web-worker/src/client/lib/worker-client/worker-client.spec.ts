import { bootstrapWorker, WorkerController } from 'angular-web-worker';
import { Instantiable } from 'angular-web-worker/common';
import { MockWorker } from 'angular-web-worker/internal-utils';
import { FakeWorker } from 'angular-web-worker/testing';

import { WorkerClient } from './worker-client';

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
    await client.connectionCompleted;
  });

  it('should should connect on construction', () => {
    expect(client.isConnected).toBe(true);
  });

  it('should run `onWorkerInit` after connection', async () => {
    const onWorkerInit = jest.spyOn(controller.workerInstance, 'onWorkerInit');
    client = newClient(worker, MockWorker);
    await client.connectionCompleted;
    expect(onWorkerInit).toHaveBeenCalled();
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

    it('should reject when attempting to access undecorated properties', async () => {
      const promise = client.get((w) => w.undecoratedProperty);
      await expect(promise).rejects.toBeTruthy();
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

    it('should reject when attempting to set undecorated properties', async () => {
      const promise = client.set((w) => w.undecoratedProperty, 'update');
      await expect(promise).rejects.toBeTruthy();
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

    it('should reject when attempting to call undecorated methods', async () => {
      const promise = client.call((w) => w.undecoratedFunction());
      await expect(promise).rejects.toBeTruthy();
    });
  });

  // TODO: .subscribe(), .unsubscribe(), .observe(), .destroy()
  // TODO: new method .next()
});
