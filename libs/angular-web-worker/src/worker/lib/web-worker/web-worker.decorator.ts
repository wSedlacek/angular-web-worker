import {
  AccessibleMetaData,
  SubscribableMetaData,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvents,
  WorkerUtils,
} from 'angular-web-worker/common';

/**
 * Collection of factory functions for the factory as attached to a single object which allows for testing of imported function
 */
export const WorkerFactoryFunctions = {
  /**
   * Attaches a worker configuration to an instance of a worker class
   * @param instance instance of the worker class
   * @param config configuration
   */
  setWorkerConfig: <I>(instance: I, config: WorkerConfig) => {
    Object.defineProperty(instance, WorkerAnnotations.Config, {
      get: () => config,
      enumerable: true,
      configurable: true,
    });
  },

  /**
   * Adds a get wrapper to all properties decorated with `@Accessible()` which returns a `SecretResult` if the class instance is a client, otherwise it will use the default behavior
   * @param instance instance of the worker class
   */
  configureAccessibles: <I, P extends Object>(instance: I, prototype: P) => {
    const accessibles = WorkerUtils.getAnnotation<AccessibleMetaData[]>(
      prototype.constructor,
      WorkerAnnotations.Accessibles,
      []
    );

    if (accessibles.length) {
      accessibles.forEach((item) => {
        let _val = instance[item.name];
        const getter = () => {
          // tslint:disable-next-line: no-invalid-this
          const config: WorkerConfig | undefined = instance[WorkerAnnotations.Config];

          if (config?.isClient) {
            return {
              clientSecret: config.clientSecret,
              type: WorkerEvents.Accessible,
              propertyName: item.name,
              body: {
                get: item.get,
                set: item.set,
              },
            };
          }

          return _val;
        };

        const setter = (newVal: typeof _val) => {
          _val = newVal;
        };

        delete instance[item.name];
        Object.defineProperty(instance, item.name, {
          get: getter,
          set: setter,
          enumerable: true,
          configurable: true,
        });
      });
    }
  },

  /**
   * Adds a get wrapper to all properties decorated with `@Subscribable()` which returns a `SecretResult` if the class instance is a client, otherwise it will use the default behavior
   * @param instance instance of the worker class
   */
  configureSubscribables: <I, P extends Object>(instance: I, prototype: P) => {
    const observables = WorkerUtils.getAnnotation<SubscribableMetaData[]>(
      prototype.constructor,
      WorkerAnnotations.Observables,
      []
    );

    if (observables.length) {
      observables.forEach((item) => {
        let _val = instance[item.name];

        const getter = () => {
          const config: WorkerConfig | undefined = instance[WorkerAnnotations.Config];

          if (config?.isClient) {
            return {
              clientSecret: config.clientSecret,
              type: WorkerEvents.Observable,
              propertyName: item.name,
              body: null,
            };
          }

          return _val;
        };

        const setter = (newVal: typeof _val) => {
          _val = newVal;
        };

        delete instance[item.name];
        Object.defineProperty(instance, item.name, {
          get: getter,
          set: setter,
          enumerable: true,
          configurable: true,
        });
      });
    }
  },
};

type Instantiable<T extends Object> = new (...args: any[]) => T;

/**
 * Class decorator allowing the class to be bootstrapped into a web worker script, and allowing communication with a `WorkerClient`
 */
export const WebWorker = <I>(options?: { deps?: unknown[] }) => <T extends Instantiable<I>>(
  Target: T
) => {
  WorkerUtils.setAnnotation(Target, WorkerAnnotations.IsWorker, true);
  WorkerUtils.setAnnotation(Target, WorkerAnnotations.Factory, (config: WorkerConfig) => {
    const instance = new Target(...(options?.deps ?? []));
    WorkerFactoryFunctions.setWorkerConfig(instance, config);
    WorkerFactoryFunctions.configureAccessibles(instance, Target.prototype);
    WorkerFactoryFunctions.configureSubscribables(instance, Target.prototype);

    return instance;
  });
};
