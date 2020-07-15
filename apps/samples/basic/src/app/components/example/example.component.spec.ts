import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

import { WorkerTestingModule } from 'angular-web-worker/testing';

import { AppWorker } from '../../app.worker';
import { ExampleComponent } from './example.component';

describe('ExampleComponent', () => {
  let spectator: Spectator<ExampleComponent>;
  const createComponent = createComponentFactory({
    component: ExampleComponent,
    imports: [WorkerTestingModule.forRoot([AppWorker])],
  });

  beforeEach(() => (spectator = createComponent()));

  it('should create the app', () => {
    expect(spectator.fixture.componentInstance).toBeTruthy();
  });
});
