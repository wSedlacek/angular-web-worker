import 'tslint-override/angular-register';

import { bootstrapWorker, Subjectable, Subscribable, WebWorker } from 'angular-web-worker';
import { merge, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

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
          map((n) => this.nthPrime(n)),
          catchError((err: Error) => of(err.message))
        )
      )
    ),
    shareReplay()
  );

  private nthPrime(n: number): number {
    let count = 0;

    if (n < count) throw new Error('N must be positive');
    for (const prime of this.getNextPrime()) {
      if (count === n) return prime;
      count += 1;
    }

    throw new Error('Somehow we have run out of numbers... sorry about that');
  }

  public *getNextPrime(): Generator<number> {
    let nextNumber = 2;
    while (true) {
      if (this.isPrime(nextNumber)) yield nextNumber;
      nextNumber += 1;
    }
  }

  public isPrime(num: number): boolean {
    for (let i = 2, s = Math.sqrt(num); i <= s; i += 1) {
      if (num % i === 0) return false;
    }

    return num > 1;
  }
}

bootstrapWorker(AppWorker);
