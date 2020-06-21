import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WebWorker } from 'angular-web-worker';
import { WorkerManager } from 'angular-web-worker/client';
import { WorkerTestingManager } from 'angular-web-worker/testing';

import { WorkerTestingModule } from './worker-testing.module';

@WebWorker()
class TestClass {}

class UndecoratedTestClass {}

describe('WorkerTestingModule: [angular-web-worker/testing]', () => {
  beforeEach(async () => {
    TestBed.resetTestEnvironment();
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  it('Should return a module with a WorkerManager provider with a WorkerTestingManager', () => {
    TestBed.configureTestingModule({
      imports: [WorkerTestingModule.forWorkers([TestClass])],
    });
    const service = TestBed.get(WorkerManager);
    expect(service instanceof WorkerTestingManager).toEqual(true);
  });

  it('Should throw an error when undecorated worker definitions are provided', () => {
    expect(() => WorkerTestingModule.forWorkers([TestClass, UndecoratedTestClass])).toThrowError();
  });
});
