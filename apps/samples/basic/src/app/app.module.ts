import { NgModule } from '@angular/core';

import { BrowserModule } from '@angular/platform-browser';
import { WorkerModule } from 'angular-web-worker/client';

import { AppComponent } from './app.component';
import { AppWorker } from './app.worker';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    WorkerModule.forWorkers([
      { worker: AppWorker, initFn: () => new Worker('./app.worker.ts', { type: 'module' }) },
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
