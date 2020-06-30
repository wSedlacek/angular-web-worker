import { Component, OnDestroy, OnInit } from '@angular/core';

import { WorkerManager } from 'angular-web-worker/client';

import { Observable } from 'rxjs';
import { AppWorker } from './app.worker';

@Component({
  selector: 'angular-web-worker-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private readonly workerManager: WorkerManager) {}
  private readonly client = this.workerManager.createClient(AppWorker);
  public interval?: Observable<number>;
  public result = '';

  @Override()
  public async ngOnInit(): Promise<void> {
    this.interval = await this.client.observe((w) => w.events$);
  }

  @Override()
  public ngOnDestroy(): void {
    this.client.destroy();
  }

  public async getData(): Promise<void> {
    this.result = await this.client.get((w) => w.example);
  }

  public async doSomething(): Promise<void> {
    this.result = await this.client.call((w) => w.doSomeWork('example', Date.now()));
  }

  public pushValue(): void {
    throw new Error('Not Implemented');
  }
}
