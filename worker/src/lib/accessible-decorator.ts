import { WorkerUtils, AccessibleMetaData, WorkerAnnotations } from 'angular-web-worker/common';
import 'reflect-metadata';

/**
 * Configurable options for the `@Accessible()` decorator, defining how the decorated property can be interacted with from a `WorkerClient`.
 */
export interface AccessibleOpts {
  /**
   * Determines whether the decorated property can be retrieved by a `WorkerClient` with its `get()` method
   * @defaultvalue true
   */
  get?: boolean;
  /**
   * Determines whether the decorated property can be set by a `WorkerClient` with its `set()` method
   * @defaultvalue true
   */
  set?: boolean;
  /**
   * Whether the decorated property's prototype is transferred after it has been serialized and deserialized.
   * @defaultvalue false
   * @Experimental has limitations
   */
  shallowTransfer?: boolean;
}

/**
 * Allows the decorated worker property to be accessed from the `WorkerClient.get()` and `WorkerClient.set()` methods
 * @Serialized Functions will not be copied and circular referencing structures will cause errors
 * @param options configurable options defining how the decorated property can be interacted with from a `WorkerClient`
 */
export function Accessible(options?: AccessibleOpts) {
  const opts: AccessibleOpts = { get: true, set: true, shallowTransfer: false };
  if (options) {
    opts.get = options.get === false ? false : true;
    opts.set = options.set === false ? false : true;
    opts.shallowTransfer = options.shallowTransfer ? true : false;
  }

  return function (target: any, propertyKey: string) {
    WorkerUtils.pushAnnotation(target.constructor, WorkerAnnotations.Accessibles, <
      AccessibleMetaData
    >{
      name: propertyKey,
      type: Reflect.getMetadata('design:type', target, propertyKey),
      get: opts.get,
      set: opts.set,
      shallowTransfer: opts.shallowTransfer,
    });
  };
}
