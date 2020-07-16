import { Component, OnInit } from '@angular/core';

import { ExampleService } from './services/example.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private readonly service: ExampleService) {}
  public readonly output$ = this.service.output$;
  public result = '';
  public showExample = false;

  @Override()
  public ngOnInit(): void {}

  public async getData(): Promise<void> {
    this.result = await this.service.data;
  }

  public async doSomething(): Promise<void> {
    this.result = await this.service.doSomeWork(Date.now());
  }

  public async pushValue(): Promise<void> {
    await this.service.emitter.next(`New value ${Date.now()}`);
  }

  public toggleExample(): void {
    this.showExample = !this.showExample;
  }
}
