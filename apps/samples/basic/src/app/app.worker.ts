import {
  Accessible,
  bootstrapWorker,
  Callable,
  OnWorkerInit,
  Subjectable,
  Subscribable,
  WebWorker,
} from 'angular-web-worker';
import { interval, Subject } from 'rxjs';

import { map, shareReplay } from 'rxjs/operators';
import '../register-override';

@WebWorker()
export class AppWorker implements OnWorkerInit {
  constructor() {}

  @Accessible()
  public example = 'Work';

  @Subscribable()
  public events$ = interval(1000).pipe(shareReplay());

  @Subjectable()
  public input$ = new Subject<string>();

  @Subscribable()
  public output$ = this.input$.pipe(map((val) => `Output: ${val}`));

  @Override()
  public onWorkerInit(): void {}

  @Callable()
  public async doSomeWork(value1: string, value2: number): Promise<string> {
    return `${value1}-${value2 * 2}`;
  }
}

bootstrapWorker(AppWorker);
