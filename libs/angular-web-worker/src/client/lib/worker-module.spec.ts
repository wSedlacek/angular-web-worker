import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

import { WorkerManager } from 'angular-web-worker/client';
import { MockWorker, UndecoratedWorker } from 'angular-web-worker/mocks';
import { FakeWorker } from 'angular-web-worker/testing';

import { WorkerModule } from './worker.module';

describe('WorkerModule: [angular-web-worker/client]', () => {
  beforeEach(() => {
    TestBed.resetTestEnvironment();
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  it('should return a module with a WorkerManager provider ', () => {
    TestBed.configureTestingModule({
      imports: [
        WorkerModule.forRoot([{ target: MockWorker, useWorkerFactory: () => new FakeWorker() }]),
      ],
    });
    const service = TestBed.inject(WorkerManager);
    expect(service).toBeTruthy();
  });

  it('should throw an error when undecorated worker definitions are provided', () => {
    TestBed.configureTestingModule({
      imports: [
        { target: MockWorker, useWorkerFactory: () => new FakeWorker() },
        { target: UndecoratedWorker, useWorkerFactory: () => new FakeWorker() },
      ],
    });

    expect(() => TestBed.inject(WorkerManager)).toThrowError();
  });
});
