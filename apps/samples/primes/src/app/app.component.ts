import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WorkerManager } from 'angular-web-worker/client';
import { map } from 'rxjs/operators';

import { AppWorker } from './app.worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private readonly workerManager: WorkerManager, private readonly fb: FormBuilder) {}
  private readonly client = this.workerManager.createClient(AppWorker);

  public readonly isConnected$ = this.client.isConnected$;
  public readonly prime$ = this.client.observe((w) => w.output$);
  public readonly n = this.fb.control('');

  @Override()
  public ngOnInit(): void {
    this.n.valueChanges.pipe(map(Number)).subscribe(this.client.createEmitter((n) => n.input$));
  }
}
