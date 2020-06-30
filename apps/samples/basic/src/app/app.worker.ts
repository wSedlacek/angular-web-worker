import {
  Accessible,
  bootstrapWorker,
  Callable,
  OnWorkerInit,
  Subscribable,
  WebWorker,
} from 'angular-web-worker';
import { interval } from 'rxjs';

import '../register-override';

@WebWorker()
export class AppWorker implements OnWorkerInit {
  constructor() {}

  @Accessible()
  public example = 'Work';

  @Subscribable()
  public events$ = interval(1000);

  @Override()
  public onWorkerInit(): void {}

  @Callable()
  public async doSomeWork(value1: string, value2: number): Promise<string> {
    return `${value1}-${value2 * 2}`;
  }
}

bootstrapWorker(AppWorker);
