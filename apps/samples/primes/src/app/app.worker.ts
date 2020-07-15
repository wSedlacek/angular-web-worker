import 'tslint-override/angular-register';

import { bootstrapWorker, Subjectable, Subscribable, WebWorker } from 'angular-web-worker';
import { merge, of, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@WebWorker()
export class AppWorker {
  @Subjectable()
  public input$ = new Subject<number>();

  @Subscribable()
  public output$ = this.input$.pipe(
    switchMap((input) =>
      merge(
        of('Calculating....'),
        of(input).pipe(
          map((n) => {
            console.log(n);
            let count = 0;
            let num = 2;
            while (count !== n) {
              count += 1;
              num = this.getNextPrime(num);
            }

            return num;
          })
        )
      )
    )
  );

  public getNextPrime(num: number): number {
    const n = num;
    for (let i = n + 1; i < n * n; i += 1) {
      if (this.isPrime(i)) return i;
    }

    return 0;
  }

  public isPrime(n: number): boolean {
    for (let i = 2; i < n; i += 1) if (n % i === 0) return false;

    return true;
  }
}

bootstrapWorker(AppWorker);
