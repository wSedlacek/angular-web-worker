import { ClientWebWorker } from './../src/public-api';
import { WebWorker, WorkerController } from '../../worker/src/public-api';
import { WorkerEvents } from 'angular-web-worker/common';

@WebWorker()
export class TestClass {}

describe('ClientWebWorker: [angular-web-worker/client]', () => {
  let worker: ClientWebWorker<TestClass>;
  beforeEach(() => {
    worker = new ClientWebWorker(TestClass, true);
  });

  it('Should create a web worker controller instance', () => {
    expect(worker['controller'] instanceof WorkerController).toEqual(true);
  });

  it('Should transfer messages from a controller to a client', () => {
    const spy = spyOn<any>(worker, 'onmessage');
    worker['messageBus'].postMessage({ bodyProperty: 'value' });
    expect((spy.calls.mostRecent().args[0] as MessageEvent).data).toEqual({
      bodyProperty: 'value',
    });
  });

  it('Should transfer messages from a client to a controller', () => {
    const spy = spyOn<any>(worker['messageBus'], 'onmessage');
    worker.postMessage({ bodyProperty: 'value' });
    expect((spy.calls.mostRecent().args[0] as MessageEvent).data).toEqual({
      bodyProperty: 'value',
    });
  });

  it('postMessage should serialize if configured for testing', () => {
    const spy = spyOn<any>(worker, 'serialize');
    spyOn(worker['messageBus'], 'onmessage');
    worker.postMessage({ bodyProperty: 'value' });
    expect(spy).toHaveBeenCalled();
  });

  it('postMessage should not serialize if not configured for testing', () => {
    worker = new ClientWebWorker(TestClass, false);
    const spy = spyOn<any>(worker, 'serialize');
    worker.postMessage({ bodyProperty: 'value' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('messageBus.postMessage should serialize if configured for testing', () => {
    const spy = spyOn<any>(worker, 'serialize');
    worker['messageBus'].postMessage({ bodyProperty: 'value' });
    expect(spy).toHaveBeenCalled();
  });

  it('messageBus.postMessage should not serialize if not configured for testing', () => {
    worker = new ClientWebWorker(TestClass, false);
    const spy = spyOn<any>(worker, 'serialize');
    worker['messageBus'].postMessage({ bodyProperty: 'value' });
    expect(spy).not.toHaveBeenCalled();
  });
});
