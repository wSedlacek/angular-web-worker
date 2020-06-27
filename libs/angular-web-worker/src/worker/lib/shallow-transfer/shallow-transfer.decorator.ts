import {
  ShallowTransferParamMetaData,
  WorkerAnnotations,
  WorkerUtils,
} from 'angular-web-worker/common';

/**
 * Transfers the decorated argument's prototype when it is serialized and deserialized when the method is called from `WorkerClient.call()`. This will only have an effect if
 * the method is decorated with `@Callable()`
 * @Experimental has limitations
 */
export const ShallowTransfer = () => <T extends Object>(
  target: T,
  propertyKey: string,
  parameterIndex: number
) => {
  const argTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
  const annotation: ShallowTransferParamMetaData = {
    name: propertyKey,
    type: argTypes[parameterIndex],
    argIndex: parameterIndex,
  };

  WorkerUtils.pushAnnotation(target.constructor, WorkerAnnotations.ShallowTransferArgs, annotation);
};
