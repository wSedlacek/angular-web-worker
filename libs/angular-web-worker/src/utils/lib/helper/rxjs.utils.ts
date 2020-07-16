import { Subject, Subscription } from 'rxjs';

export interface SubjectHooks {
  subscribe?(): void;
  unsubscribe?(): void;
  next?(): void;
}

export const createHookedSubject = <T>(hooksFactory: (() => SubjectHooks) | SubjectHooks) => {
  const hooks = typeof hooksFactory === 'function' ? hooksFactory() : hooksFactory;
  const subject = new Subject<T>();
  const applyHooks = (obj: Subject<T> | Subscription, prop: string | number | symbol) =>
    typeof prop === 'string' && prop in hooks
      ? (...args: unknown[]) => {
          hooks[prop]();

          return obj[prop](...args);
        }
      : obj[prop];

  return new Proxy(subject, {
    get: (obj, prop) =>
      prop === 'subscribe'
        ? (...args: unknown[]) => new Proxy(applyHooks(obj, prop)(...args), { get: applyHooks })
        : applyHooks(obj, prop),
  });
};
