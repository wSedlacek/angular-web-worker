import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

import { WorkerTestingModule } from 'angular-web-worker/testing';

import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { AppWorker } from './app.worker';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  const createComponent = createComponentFactory({
    component: AppComponent,
    imports: [WorkerTestingModule.forRoot([AppWorker]), ReactiveFormsModule],
  });

  beforeEach(() => (spectator = createComponent()));

  it('should create the app', () => {
    expect(spectator.fixture.componentInstance).toBeTruthy();
  });
});
