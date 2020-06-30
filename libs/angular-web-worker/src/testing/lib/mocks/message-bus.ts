import { WorkerMessageBus } from 'angular-web-worker/common';

export class MessageBus implements WorkerMessageBus {
  constructor(private readonly host: WorkerMessageBus) {}

  public onmessage(_ev: MessageEvent): void {}

  public postMessage(data: any): void {
    this.host.onmessage?.(new MessageEvent('MessageBus', { data }));
  }
}
