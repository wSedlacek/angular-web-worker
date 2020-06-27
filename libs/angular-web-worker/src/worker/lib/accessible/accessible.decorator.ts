import { AccessibleMetaData, WorkerAnnotations, WorkerUtils } from 'angular-web-worker/common';
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
export const Accessible = (options: AccessibleOpts = {}) => {
  const { get = true, set = true, shallowTransfer = false } = options;

  return <T extends Object>(target: T, propertyKey: string) => {
    const annotation: AccessibleMetaData = {
      get,
      set,
      shallowTransfer,
      name: propertyKey,
      type: Reflect.getMetadata('design:type', target, propertyKey),
    };

    WorkerUtils.pushAnnotation(target.constructor, WorkerAnnotations.Accessibles, annotation);
  };
};
