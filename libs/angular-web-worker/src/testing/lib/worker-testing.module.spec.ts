import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WebWorker } from 'angular-web-worker';
import { WorkerManager } from 'angular-web-worker/client';
import { WorkerTestingManager } from 'angular-web-worker/testing';

import { WorkerTestingModule } from './worker-testing.module';

// tslint:disable: max-classes-per-file
@WebWorker()
class TestClass {}

class UndecoratedTestClass {}
// tslint:enable: max-classes-per-file

describe('WorkerTestingModule: [angular-web-worker/testing]', () => {
  beforeEach(() => {
    TestBed.resetTestEnvironment();
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  it('should return a module with a WorkerManager provider with a WorkerTestingManager', () => {
    TestBed.configureTestingModule({
      imports: [WorkerTestingModule.forRoot([TestClass])],
    });
    const service = TestBed.inject(WorkerManager);
    expect(service instanceof WorkerTestingManager).toEqual(true);
  });

  it('should throw an error when undecorated worker definitions are provided', () => {
    TestBed.configureTestingModule({
      imports: [WorkerTestingModule.forRoot([TestClass, UndecoratedTestClass])],
    });

    expect(() => TestBed.inject(WorkerManager)).toThrowError();
  });
});
