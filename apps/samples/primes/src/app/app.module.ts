import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { WorkerModule } from 'angular-web-worker/client';

import { AppComponent } from './app.component';
import { AppWorker } from './app.worker';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    WorkerModule.forRoot([
      {
        target: AppWorker,
        useWorkerFactory: () => new Worker('./app.worker.ts', { type: 'module' }),
      },
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
