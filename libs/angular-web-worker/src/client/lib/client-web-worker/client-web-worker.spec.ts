import { WorkerController } from 'angular-web-worker';
import { MockWorker } from 'angular-web-worker/mocks';

import { ClientWebWorker } from './client-web-worker';

describe('ClientWebWorker: [angular-web-worker/client]', () => {
  let worker: ClientWebWorker<MockWorker>;

  beforeEach(() => {
    worker = new ClientWebWorker(MockWorker, true);
  });

  it('should create a web worker controller instance', () => {
    expect(worker['controller'] instanceof WorkerController).toEqual(true);
  });

  it('should transfer messages from a controller to a client', () => {
    const spy = jest.spyOn(worker, 'onmessage');
    worker['messageBus'].postMessage({ bodyProperty: 'value' } as any);
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          bodyProperty: 'value',
        },
      })
    );
  });

  it('should transfer messages from a client to a controller', () => {
    const spy = jest.spyOn(worker['messageBus'], 'onmessage');
    worker.postMessage({ bodyProperty: 'value' } as any);
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          bodyProperty: 'value',
        },
      })
    );
  });

  describe('.postMessage()', () => {
    it('should serialize if configured for testing', () => {
      const spy = jest.spyOn(worker, 'serialize');
      spyOn(worker['messageBus'], 'onmessage');
      worker.postMessage({ bodyProperty: 'value' } as any);
      expect(spy).toHaveBeenCalled();
    });

    it('should not serialize if not configured for testing', () => {
      worker = new ClientWebWorker(MockWorker, false);
      const spy = jest.spyOn(worker, 'serialize');
      worker.postMessage({ bodyProperty: 'value' });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('.messageBus.postMessage()', () => {
    it('should serialize if configured for testing', () => {
      const spy = jest.spyOn(worker, 'serialize');
      worker['messageBus'].postMessage({ bodyProperty: 'value' } as any);
      expect(spy).toHaveBeenCalled();
    });

    it('should not serialize if not configured for testing', () => {
      worker = new ClientWebWorker(MockWorker, false);
      const spy = jest.spyOn(worker, 'serialize');
      worker['messageBus'].postMessage({ bodyProperty: 'value' } as any);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
