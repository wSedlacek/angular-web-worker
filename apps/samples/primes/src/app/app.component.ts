import { Component, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WorkerManager } from 'angular-web-worker/client';
import { map } from 'rxjs/operators';

import { AppWorker } from './app.worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  constructor(private readonly fb: FormBuilder, private readonly workerManager: WorkerManager) {}

  public readonly n = this.fb.control('');

  private readonly client = this.workerManager.createClient(AppWorker);
  public readonly isConnected$ = this.client.isConnected$;
  public readonly prime$ = this.client.observe((w) => w.output$);

  private readonly primeSub = this.n.valueChanges
    .pipe(map(Number))
    .subscribe(this.client.createEmitter((w) => w.input$));

  @Override()
  public ngOnDestroy(): void {
    this.primeSub.unsubscribe();
  }
}
