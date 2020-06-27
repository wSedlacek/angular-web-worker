import { Accessible, Subscribable } from 'angular-web-worker';
import {
  SecretResult,
  WorkerAnnotations,
  WorkerConfig,
  WorkerEvents,
} from 'angular-web-worker/common';
import { Subject } from 'rxjs';

import { WebWorker, WorkerFactoryFunctions } from './web-worker.decorator';

@WebWorker()
class WorkerTestClass {
  public name: string;

  constructor() {
    this.name = 'Peter';
  }
}

describe('@WebWorker(): [angular-web-worker]', () => {
  it('should attach metadata', () => {
    expect(WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.IsWorker]).toEqual(true);
  });

  it('should attach metadata with a factory function', () => {
    expect(typeof WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory]).toEqual(
      'function'
    );
  });

  describe('Worker factory', () => {
    const config: WorkerConfig = {
      isClient: false,
    };

    it('should return a new class instance', () => {
      jest.spyOn(WorkerFactoryFunctions, 'setWorkerConfig');
      expect(
        WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory](config)
      ).toEqual(expect.objectContaining(new WorkerTestClass()));
    });

    it('should call setWorkerConfig with config and new instance', () => {
      const spy = jest.spyOn(WorkerFactoryFunctions, 'setWorkerConfig');
      WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory](config);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining(new WorkerTestClass()), config);
    });

    it('should call WorkerFactoryFunctions.configureAccessibles', () => {
      const spy = jest.spyOn(WorkerFactoryFunctions, 'configureAccessibles');
      WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory](config);
      expect(spy).toHaveBeenCalled();
    });

    it('should call WorkerFactoryFunctions.configureSubscribables', () => {
      const spy = jest.spyOn(WorkerFactoryFunctions, 'configureSubscribables');
      WorkerTestClass[WorkerAnnotations.Annotation][WorkerAnnotations.Factory](config);
      expect(spy).toHaveBeenCalled();
    });

    describe('WorkerFactoryFunctions.configureAccessibles()', () => {
      // tslint:disable: max-classes-per-file
      class AccessibleTestClass {
        @Accessible()
        public property?: string;
        public property2?: string;
      }
      // tslint:enable: max-classes-per-file

      let clientInstance: AccessibleTestClass;
      let workerInstance: AccessibleTestClass;
      const property1Value = 'value1';
      const property2Value = 'value2';
      const clientSecretKey = 'my-secret';

      beforeEach(() => {
        clientInstance = new AccessibleTestClass();
        clientInstance[WorkerAnnotations.Config] = {
          isClient: true,
          clientSecret: clientSecretKey,
        };
        clientInstance.property = property1Value;
        clientInstance.property2 = property2Value;
        WorkerFactoryFunctions.configureAccessibles(clientInstance, AccessibleTestClass.prototype);

        workerInstance = new AccessibleTestClass();
        workerInstance[WorkerAnnotations.Config] = {
          isClient: false,
        };
        workerInstance.property = property1Value;
        workerInstance.property2 = property2Value;
        WorkerFactoryFunctions.configureAccessibles(workerInstance, AccessibleTestClass.prototype);
      });

      it('For client instances, it should replace the getter of decorated properties to return a secret', () => {
        const secretResult: SecretResult<WorkerEvents.Accessible> = {
          clientSecret: clientSecretKey,
          propertyName: 'property',
          type: WorkerEvents.Accessible,
          body: {
            get: true,
            set: true,
          },
        };
        expect(clientInstance.property as any).toEqual(secretResult);
      });

      it('For client instances, it should not replace the getter of undecorated properties', () => {
        expect(clientInstance.property2).toEqual(property2Value);
      });

      it('For worker instances, it should not replace the getter functionality of any properties', () => {
        expect(workerInstance.property).toEqual(property1Value);
        expect(workerInstance.property2).toEqual(property2Value);
      });

      it('For instances where no config has been set, it should not replace the getter functionality of any properties', () => {
        const instance = new AccessibleTestClass();
        instance.property = property1Value;
        instance.property2 = property2Value;
        expect(instance.property).toEqual(property1Value);
        expect(instance.property2).toEqual(property2Value);
      });
    });

    describe('WorkerFactoryFunctions.configureSubscribables()', () => {
      // tslint:disable: max-classes-per-file
      class SubscribableTestClass {
        @Subscribable()
        public event?: Subject<any>;
        public event2?: Subject<any>;
      }
      // tslint:enable: max-classes-per-file

      let clientInstance: SubscribableTestClass;
      let workerInstance: SubscribableTestClass;
      const subjectValue = new Subject<any>();
      const clientSecretKey = 'my-secret';

      beforeEach(() => {
        clientInstance = new SubscribableTestClass();
        clientInstance[WorkerAnnotations.Config] = {
          isClient: true,
          clientSecret: clientSecretKey,
        };
        clientInstance.event = subjectValue;
        clientInstance.event2 = subjectValue;
        WorkerFactoryFunctions.configureSubscribables(
          clientInstance,
          SubscribableTestClass.prototype
        );

        workerInstance = new SubscribableTestClass();
        workerInstance[WorkerAnnotations.Config] = {
          isClient: false,
        };
        workerInstance.event = subjectValue;
        WorkerFactoryFunctions.configureSubscribables(
          workerInstance,
          SubscribableTestClass.prototype
        );
      });

      it('For client instances, it should replace the getter of decorated properties to return a secret', () => {
        const secretResult: SecretResult<WorkerEvents.Observable> = {
          clientSecret: clientSecretKey,
          propertyName: 'event',
          type: WorkerEvents.Observable,
          body: null,
        };
        expect(clientInstance.event as any).toEqual(secretResult);
      });

      it('For client instances, it should not replace the getter of undecorated properties', () => {
        expect(clientInstance.event2).toEqual(subjectValue);
      });

      it('For worker instances, it should not replace the getter functionality of any properties', () => {
        expect(workerInstance.event).toEqual(subjectValue);
        expect(workerInstance.event2).toEqual(undefined);
      });

      it('For instances where no config has been set, it should not replace the getter functionality of any properties', () => {
        const instance = new SubscribableTestClass();
        instance.event = subjectValue;
        expect(instance.event).toEqual(subjectValue);
        expect(instance.event2).toEqual(undefined);
      });
    });

    describe('WorkerFactoryFunctions.setWorkerConfig()', () => {
      it('should attach config to class instance', () => {
        const instance = new WorkerTestClass();
        WorkerFactoryFunctions.setWorkerConfig(instance, config);
        expect(instance[WorkerAnnotations.Config]).toEqual(config);
      });
    });
  });
});
