import {
  Accessible,
  Callable,
  OnWorkerDestroy,
  OnWorkerInit,
  ShallowTransfer,
  Subjectable,
  Subscribable,
  WebWorker,
} from 'angular-web-worker';
import { Subject } from 'rxjs';

import { MockUser } from './mock-user';

@WebWorker()
export class MockWorker implements OnWorkerInit, OnWorkerDestroy {
  @Accessible()
  public property1 = 'property1';

  @Accessible()
  public property2 = new MockUser({ name: 'user1', age: 20 });

  @Accessible({ shallowTransfer: true })
  public property3 = new MockUser({ name: 'user2', age: 25 });

  @Subscribable()
  public event: Subject<string> = new Subject<string>();

  public undecoratedProperty = 'undecoratedProperty';

  @Accessible()
  public setTestProp?: number;

  @Accessible()
  public getTestProp = 'testvalue';

  @Accessible({ shallowTransfer: true })
  public transferableTestProp?: MockUser;

  @Accessible()
  public promise = Promise.resolve('promise');

  @Subscribable()
  public subscriptionTest: Subject<any> = new Subject<string>();

  @Subjectable()
  public subject = new Subject<string>();

  public undecoratedSubject = new Subject<string>();

  public async onWorkerInit(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 10);
    });
  }

  public async onWorkerDestroy(): Promise<void> {
    return this.onWorkerInit();
  }

  @Callable()
  public function1(name: string, age: number): MockUser {
    return new MockUser({ name, age });
  }

  @Callable({ shallowTransfer: true })
  public function2(name: string, age: number): MockUser {
    return new MockUser({ name, age });
  }

  public undecoratedFunction(): void {}

  @Callable()
  public argsTestFn(_name: string, _age: number): void {}

  @Callable()
  public syncReturnTestFn(): string {
    return 'sync';
  }

  @Callable()
  public async asyncReturnTestFn(): Promise<string> {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve('async');
      }, 100);
    });
  }

  @Callable()
  public shallowTransferTestFn(baseAge: number, @ShallowTransfer() user: MockUser): number {
    user.birthday();

    return baseAge + user.age;
  }

  @Callable()
  public errorTestFn(): void {
    throw new Error('error');
  }
}
