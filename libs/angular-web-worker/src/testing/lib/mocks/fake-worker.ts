import { MessageBus } from './message-bus';

export class FakeWorker implements Worker {
  public messageBus = new MessageBus(this);

  public onmessage(): void {}

  public onmessageerror(this: Worker, _ev: MessageEvent): void {}

  public onerror(_err: any): void {}

  public postMessage(data: any): void {
    this.messageBus.onmessage(new MessageEvent('FakeWorker', { data }));
  }

  public addEventListener(): void {}

  public removeEventListener(): void {}

  public dispatchEvent(_evt: Event): boolean {
    return true;
  }

  public terminate(): void {}
}
