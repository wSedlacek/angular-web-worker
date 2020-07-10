import {
  AccessibleMetaData,
  Instantiable,
  SubjectableMetaData,
  SubscribableMetaData,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvents,
  WorkerUtils,
} from 'angular-web-worker/common';

/**
 * Collection of factory functions for the factory as attached to a single object which allows for testing of imported function
 */
const WorkerFactoryFunctions = {
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
  configureAccessibles: <I extends Object>(instance: I) => {
    const accessibles = WorkerUtils.getAnnotation<AccessibleMetaData[]>(
      instance.constructor,
      WorkerAnnotations.Accessibles,
      []
    );

    if (accessibles.length) {
      accessibles.forEach((item) => {
        let _val = instance[item.name];

        Object.defineProperty(instance, item.name, {
          get: () => {
            const config: WorkerConfig | undefined = instance[WorkerAnnotations.Config];

            if (config?.isClient) {
              return {
                clientSecret: config.clientSecret,
                types: [WorkerEvents.Accessible],
                propertyName: item.name,
                body: {
                  get: item.get,
                  set: item.set,
                },
              };
            }

            return _val;
          },
          set: (newVal: typeof _val) => {
            _val = newVal;
          },
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
  configureSubscribables: <I extends Object>(instance: I) => {
    const observables = WorkerUtils.getAnnotation<SubscribableMetaData[]>(
      instance.constructor,
      WorkerAnnotations.Observables,
      []
    );

    if (observables.length) {
      observables.forEach((item) => {
        let _val = instance[item.name];

        Object.defineProperty(instance, item.name, {
          get: () => {
            const config: WorkerConfig | undefined = instance[WorkerAnnotations.Config];

            if (config?.isClient) {
              return {
                clientSecret: config.clientSecret,
                types: [WorkerEvents.Observable, WorkerEvents.Unsubscribable],
                propertyName: item.name,
                body: null,
              };
            }

            return _val;
          },
          set: (newVal: typeof _val) => {
            _val = newVal;
          },
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
  configureSubjectables: <I extends Object>(instance: I) => {
    const subjects = WorkerUtils.getAnnotation<SubjectableMetaData[]>(
      instance.constructor,
      WorkerAnnotations.Subjectables,
      []
    );

    if (subjects.length) {
      subjects.forEach((item) => {
        let _val = instance[item.name];

        Object.defineProperty(instance, item.name, {
          get: () => {
            const config: WorkerConfig | undefined = instance[WorkerAnnotations.Config];

            if (config?.isClient) {
              return {
                clientSecret: config.clientSecret,
                types: [WorkerEvents.Subjectable],
                propertyName: item.name,
                body: null,
              };
            }

            return _val;
          },
          set: (newVal: typeof _val) => {
            _val = newVal;
          },
          enumerable: true,
          configurable: true,
        });
      });
    }
  },
};

/**
 * Class decorator allowing the class to be bootstrapped into a web worker script, and allowing communication with a `WorkerClient`
 */
export function WebWorker<I>(options?: { deps?: unknown[] }): (Target: Instantiable<I>) => void {
  return <T extends Instantiable<I>>(Target: T) => {
    WorkerUtils.setAnnotation(Target, WorkerAnnotations.IsWorker, true);
    WorkerUtils.setAnnotation(Target, WorkerAnnotations.Factory, (config: WorkerConfig) => {
      const instance = new Target(...(options?.deps ?? []));
      WorkerFactoryFunctions.setWorkerConfig(instance, config);
      WorkerFactoryFunctions.configureAccessibles(instance);
      WorkerFactoryFunctions.configureSubscribables(instance);
      WorkerFactoryFunctions.configureSubjectables(instance);

      return instance;
    });
  };
}
