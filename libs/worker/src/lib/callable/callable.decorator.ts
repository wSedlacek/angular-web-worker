import {
  CallableMetaData,
  SecretResult,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvents,
  WorkerUtils,
} from 'angular-web-worker/common';
import 'reflect-metadata';

/**
 * Configurable options for the `@Callable()` decorator, defining how the decorated method is called from a `WorkerClient`.
 */
export interface CallableOpts {
  /**
   * Whether the prototype of the value returned by the decorated method is transferred after it has been serialized and deserialized when brought back to the `WorkerClient`
   * @defaultvalue false
   * @Experimental has limitations
   */
  shallowTransfer: boolean;
}

/**
 * Allows the decorated worker method to be called, and its value returned, from the `WorkerClient.call()` method.
 * Can be used on both asynchronous and synchronous methods.
 * @Serialized Functions will not be copied and circular referencing structures will cause errors. This applies to both the function arguments and the value returned by the function
 * @param options Configurable options defining how the decorated method is called from a `WorkerClient`
 */
export const Callable = (options?: CallableOpts) => <T extends Object, M extends keyof T & string>(
  target: T,
  propertyKey: T[M] extends (...args: any) => any ? M : never,
  descriptor: TypedPropertyDescriptor<(...args: any[]) => any>
) => {
  const opts = { shallowTransfer: false };
  if (options) {
    opts.shallowTransfer = !!options.shallowTransfer;
  }

  const annotation: CallableMetaData = {
    name: propertyKey,
    shallowTransfer: opts.shallowTransfer,
    returnType: Reflect.getMetadata('design:returntype', target, propertyKey),
  };

  WorkerUtils.pushAnnotation(target.constructor, WorkerAnnotations.Callables, annotation);

  const originalMethod = descriptor.value;
  if (!originalMethod) throw new Error('@Callable(): could not bind to undefined method');

  descriptor.value = function (
    ...args: unknown[]
  ):
    | ReturnType<T[M] extends (...args: unknown[]) => unknown ? T[M] : () => unknown>
    | SecretResult<WorkerEvents.Callable> {
    // tslint:disable: no-invalid-this
    const config: WorkerConfig = this[WorkerAnnotations.Config];

    if (config?.isClient) {
      return {
        clientSecret: this[WorkerAnnotations.Config].clientSecret,
        type: WorkerEvents.Callable,
        propertyName: propertyKey,
        body: { args },
      };
    }

    return originalMethod.call(this, ...args);
    // tslint:enable: no-invalid-this
  };
};
