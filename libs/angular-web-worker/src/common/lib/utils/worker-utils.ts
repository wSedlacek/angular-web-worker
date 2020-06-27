import { WorkerAnnotations } from '../@types';

/**
 * A set of static utility functions for creating and retrieving worker annotations
 */
export class WorkerUtils {
  /**
   * Creates or replaces a worker annotation
   * @param target Class or object that the annotations will be attached to
   * @param propertyKey name of the annotated property
   * @param value the value of the annotation
   */
  public static setAnnotation<T extends Object>(target: T, propertyKey: string, value: any): void {
    if (target.hasOwnProperty(WorkerAnnotations.Annotation)) {
      target[WorkerAnnotations.Annotation][propertyKey] = value;
    } else {
      Object.defineProperty(target, WorkerAnnotations.Annotation, {
        value: {},
      });
      WorkerUtils.setAnnotation(target, propertyKey, value);
    }
  }

  /**
   * Adds an item to an array for a particular annotation property. If no array exists a new array will be created before the item is added
   * @param cls Class or object that the annotations will be attached to
   * @param propertyKey name of the annotated array
   * @param value the item to add in the array
   */
  public static pushAnnotation(cls: any, propertyKey: string, value: any): void {
    if (cls.hasOwnProperty(WorkerAnnotations.Annotation)) {
      if (cls[WorkerAnnotations.Annotation].hasOwnProperty(propertyKey)) {
        cls[WorkerAnnotations.Annotation][propertyKey].push(value);
      } else {
        cls[WorkerAnnotations.Annotation][propertyKey] = [];
        cls[WorkerAnnotations.Annotation][propertyKey].push(value);
      }
    } else {
      Object.defineProperty(cls, WorkerAnnotations.Annotation, {
        value: {},
      });
      WorkerUtils.pushAnnotation(cls, propertyKey, value);
    }
  }

  /**
   * Returns an annotated worker property. Allows for a generic type argument to specify the return type of the annotation
   * @param cls Class or object that the annotations is attached to
   * @param propertyKey name of the annotated array
   * @param ifUndefined the returned value if the annotated property does not exist
   */
  public static getAnnotation<T extends Object>(
    cls: Object,
    propertyKey: string,
    ifUndefined?: T
  ): T {
    if (cls.hasOwnProperty(WorkerAnnotations.Annotation)) {
      return cls[WorkerAnnotations.Annotation][propertyKey] ?? ifUndefined;
    }

    if (ifUndefined === undefined) throw new Error('No default value given!');

    return ifUndefined;
  }
}
