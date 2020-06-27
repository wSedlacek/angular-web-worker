import {
  ObservablesOnly,
  SubscribableMetaData,
  WorkerAnnotations,
  WorkerUtils,
} from 'angular-web-worker/common';
import 'reflect-metadata';

/**
 * Allows the decorated worker property to be subscribed to, or observed through the `WorkerClient.subscribe()` and `WorkerClient.observe()` methods.
 *
 * Can only be used on multicasted RxJS observables being a `Subject`,  `BehaviorSubject`, `ReplaySubject` or `AsyncSubject`.
 * @Serialized When data is transferred through `Subject.next()`, functions will not be copied and circular referencing structures will cause errors
 */
export const Subscribable = () => <
  T extends Object,
  Tkey extends keyof ObservablesOnly<T> & string
>(
  target: T,
  propertyKey: Tkey
) => {
  const annotation: SubscribableMetaData = {
    name: propertyKey,
    type: Reflect.getMetadata('design:type', target, propertyKey),
  };

  WorkerUtils.pushAnnotation(target.constructor, WorkerAnnotations.Observables, annotation);
};
