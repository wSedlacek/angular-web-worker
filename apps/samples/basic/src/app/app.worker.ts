import { bootstrapWorker, Callable, OnWorkerInit, WebWorker } from 'angular-web-worker';
import { Override } from '../register';

@WebWorker()
export class AppWorker implements OnWorkerInit {
  constructor() {}

  @Override()
  public onWorkerInit(): void {}

  @Callable()
  public async doSomeWork(value1: string, value2: number): Promise<string> {
    return `${value1}-${value2 * 2}`;
  }
}

bootstrapWorker(AppWorker);
