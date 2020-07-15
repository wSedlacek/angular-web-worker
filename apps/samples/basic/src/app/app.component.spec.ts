import { byText, createComponentFactory, Spectator } from '@ngneat/spectator/jest';

import { WorkerTestingModule } from 'angular-web-worker/testing';

import { fakeAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppWorker } from './app.worker';
import { ExampleComponent } from './components/example/example.component';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  const createComponent = createComponentFactory({
    component: AppComponent,
    imports: [WorkerTestingModule.forRoot([AppWorker])],
    declarations: [ExampleComponent],
  });

  beforeEach(() => (spectator = createComponent()));

  it('should create the app', () => {
    expect(spectator.fixture.componentInstance).toBeTruthy();
  });

  it('should update the results after clicking the buttons', fakeAsync(() => {
    const getButton = spectator.query(byText('Get'));
    const pushButton = spectator.query(byText('Push'));
    if (getButton !== null) spectator.click(getButton);
    if (pushButton !== null) spectator.click(pushButton);

    spectator.tick();

    const getResult = spectator.query(byText('Get Result', { exact: false }));
    const pushResult = spectator.query(byText('Push Result', { exact: false }));
    expect(getResult?.textContent).toContain('Work');
    expect(pushResult?.textContent).toContain('New value');
  }));
});
