// tslint:disable: invalid-void
// Invalid Void catches the `Promise<void> | void`, in future versions of TS we can use `awaited`

/**
 * Lifecycle hook that is called after the worker class is connected to from a client
 */
export interface OnWorkerInit {
  onWorkerInit(): Promise<void> | void;
}

/**
 * Lifecycle hook that is called before the work class is terminated
 */
export interface OnWorkerDestroy {
  onWorkerDestroy(): Promise<void> | void;
}
