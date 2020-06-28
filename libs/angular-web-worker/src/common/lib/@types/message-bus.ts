/**
 * Interface for message bus provided into a `WorkerController` allowing the communication mechanism to be interchanged between in-app, and native worker
 * communication mechanisms
 */
export interface WorkerMessageBus {
  /**
   * Messages transferred from a client to a controller
   */
  postMessage(resp: any): void;
  /**
   * Messages recieved by a controller from a client
   */
  onmessage(ev: MessageEvent): void;
}