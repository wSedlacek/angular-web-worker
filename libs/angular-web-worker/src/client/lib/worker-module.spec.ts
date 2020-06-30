import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WebWorker } from 'angular-web-worker';
import { WorkerManager } from 'angular-web-worker/client';
import { FakeWorker } from 'angular-web-worker/testing';

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

  it('should return a module with a WorkerManager provider ', () => {
    TestBed.configureTestingModule({
      imports: [
        WorkerModule.forRoot([{ target: TestClass, useWorkerFactory: () => new FakeWorker() }]),
      ],
    });
    const service = TestBed.inject(WorkerManager);
    expect(service).toBeTruthy();
  });

  it('should throw an error when undecorated worker definitions are provided', () => {
    TestBed.configureTestingModule({
      imports: [
        { target: TestClass, useWorkerFactory: () => new FakeWorker() },
        { target: UndecoratedTestClass, useWorkerFactory: () => new FakeWorker() },
      ],
    });

    expect(() => TestBed.inject(WorkerManager)).toThrowError();
  });
});
