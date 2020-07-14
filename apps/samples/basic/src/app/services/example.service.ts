import { Injectable, OnDestroy } from '@angular/core';
import { WorkerManager } from 'angular-web-worker/client';
import { AppWorker } from '../app.worker';

@Injectable({ providedIn: 'root' })
export class ExampleService implements OnDestroy {
  constructor(private readonly workerManager: WorkerManager) {}
  private readonly client = this.workerManager.createClient(AppWorker);
  public readonly interval$ = this.client.observe((w) => w.events$);
  public readonly output$ = this.client.observe((w) => w.output$);

  @Override()
  public ngOnDestroy(): void {
    this.client.destroy();
  }

  public async getData(): Promise<string> {
    return this.client.get((w) => w.example);
  }

  public async doSomething(): Promise<string> {
    return this.client.call((w) => w.doSomeWork('example', Date.now()));
  }

  public pushValue(): void {
    this.client.next((w) => w.input$, `New value ${Date.now()}`);
  }
}
