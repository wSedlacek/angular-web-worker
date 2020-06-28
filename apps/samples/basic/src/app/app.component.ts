import { Component, OnInit } from '@angular/core';

import { WorkerManager } from 'angular-web-worker/client';

import { AppWorker } from './app.worker';

@Component({
  selector: 'angular-web-worker-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private readonly workerManager: WorkerManager) {}

  private readonly client = this.workerManager.createClient(AppWorker);
  public result = '';

  @Override()
  public async ngOnInit(): Promise<void> {
    await this.client.connect();
  }

  public async callWorkerMethod(): Promise<void> {
    this.result = await this.client.call((w) => w.doSomeWork('value', Date.now()));
  }
}
