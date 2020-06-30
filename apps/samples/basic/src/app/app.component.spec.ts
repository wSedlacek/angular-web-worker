import { byText, createComponentFactory, Spectator } from '@ngneat/spectator/jest';

import { WorkerTestingModule } from 'angular-web-worker/testing';

import { fakeAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppWorker } from './app.worker';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  const createComponent = createComponentFactory({
    component: AppComponent,
    imports: [WorkerTestingModule.forRoot([AppWorker])],
  });

  beforeEach(() => (spectator = createComponent()));

  it('should create the app', () => {
    expect(spectator.fixture.componentInstance).toBeTruthy();
  });

  it('should update the result after clicking', fakeAsync(() => {
    const button = spectator.query(byText('Run'));
    if (button !== null) spectator.click(button);
    spectator.tick();
    expect(spectator.component.result).toBe('Work');
  }));

  it('should update the result after pushing', fakeAsync(() => {
    throw new Error('Not Implemented');
  }));
});
