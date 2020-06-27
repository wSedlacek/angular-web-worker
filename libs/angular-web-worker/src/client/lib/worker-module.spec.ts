import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WebWorker } from 'angular-web-worker';
import { WorkerManager } from 'angular-web-worker/client';

import { WorkerModule } from './worker.module';

// tslint:disable: max-classes-per-file
@WebWorker()
class TestClass {}

class UndecoratedTestClass {}
// tslint:enable: max-classes-per-file

describe('WorkerModule: [angular-web-worker/client]', () => {
  beforeEach(() => {
    TestBed.resetTestEnvironment();
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  it('Should return a module with a WorkerManager provider ', () => {
    TestBed.configureTestingModule({
      imports: [WorkerModule.forWorkers([{ worker: TestClass, initFn: null }])],
    });
    const service = TestBed.inject(WorkerManager);
    expect(service).toEqual(new WorkerManager([{ worker: TestClass, initFn: null }]));
  });

  it('Should throw an error when undecorated worker definitions are provided', () => {
    expect(() =>
      WorkerModule.forWorkers([
        { worker: TestClass, initFn: null },
        { worker: UndecoratedTestClass, initFn: () => null },
      ])
    ).toThrowError();
  });
});
