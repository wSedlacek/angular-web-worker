import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WorkerManager } from 'angular-web-worker/client';
import { MockWorker, UndecoratedWorker } from 'angular-web-worker/mocks';
import { WorkerTestingManager } from 'angular-web-worker/testing';

import { WorkerTestingModule } from './worker-testing.module';

describe('WorkerTestingModule: [angular-web-worker/testing]', () => {
  beforeEach(() => {
    TestBed.resetTestEnvironment();
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  it('should return a module with a WorkerManager provider with a WorkerTestingManager', () => {
    TestBed.configureTestingModule({
      imports: [WorkerTestingModule.forRoot([MockWorker])],
    });
    const service = TestBed.inject(WorkerManager);
    expect(service instanceof WorkerTestingManager).toEqual(true);
  });

  it('should throw an error when undecorated worker definitions are provided', () => {
    TestBed.configureTestingModule({
      imports: [WorkerTestingModule.forRoot([MockWorker, UndecoratedWorker])],
    });

    expect(() => TestBed.inject(WorkerManager)).toThrowError();
  });
});
