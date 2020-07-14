import { Subject, Subscription } from 'rxjs';

export interface SubjectHooks {
  subscribe?(): void;
  unsubscribe?(): void;
  next?(): void;
}

export const createHookedSubject = <T>(hooksFactory: () => SubjectHooks) => {
  const hooks = hooksFactory();
  const subject = new Subject<T>();
  const applyHooks = (obj: Subject<T> | Subscription, prop: string | number | symbol) => {
    if (typeof prop === 'string' && prop in hooks) {
      return () => {
        hooks[prop]();

        return obj[prop]();
      };
    }

    return obj[prop];
  };

  return new Proxy(subject, {
    get(subjectTarget, subjectProp): any {
      if (subjectProp === 'subscribe') {
        return (...args: any[]) => {
          hooks[subjectProp]?.();
          const subscription = subjectTarget[subjectProp](...args);

          return new Proxy(subscription, {
            get(subscriptionTarget, subscriptionProp): any {
              return applyHooks(subscriptionTarget, subscriptionProp);
            },
          });
        };
      }

      return applyHooks(subjectTarget, subjectProp);
    },
  });
};
