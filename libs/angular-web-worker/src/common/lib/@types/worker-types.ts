import { Observable, Subject } from 'rxjs';

/**
 * The names of methods/functions from any class provided as a generic type argument
 */
export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * Selection of class methods/functions where the class is provided as a generic type argument
 */
export type FunctionsOnly<T> = Pick<T, FunctionPropertyNames<T>>;

/**
 * The names of properties in a particular class that are neither methods nor observables where the class is provided as a generic type argument
 */
export type NonObservablePropertyNames<T> = {
  [K in keyof T]: T[K] extends Observable<any> ? never : T[K] extends Function ? never : K;
}[keyof T];
/**
 * Selection class properties that are neither methods nor observables where the class is provided as a generic type argument
 */
export type NonObservablesOnly<T> = Pick<T, NonObservablePropertyNames<T>>;

/**
 * The names of class properties that are RxJS observables, being a `Observable`, `Subject`, `BehaviorSubject`, `AsyncSubject` or `ReplaySubject`.
 * The class is provided as a generic type argument
 */
export type ObservablePropertyNames<T> = {
  [K in keyof T]: T[K] extends Observable<any> | undefined ? K : never;
}[keyof T];

/**
 * The names of class properties that are multicasted RxJS Subjects, being a `Subject`, `BehaviorSubject`, `AsyncSubject` or `ReplaySubject`.
 * The class is provided as a generic type argument
 */
export type SubjectPropertyNames<T> = {
  [K in keyof T]: T[K] extends Subject<any> | undefined ? K : never;
}[keyof T];

/**
 * Selection of class properties that are RxJS observables, being a `Observable`, `Subject`, `BehaviorSubject`, `AsyncSubject` or `ReplaySubject`.
 * The class is provided as a generic type argument
 */
export type ObservablesOnly<T> = Pick<T, ObservablePropertyNames<T>>;

/**
 * Selection of class properties that are multicasted RxJS observables, being a `Subject`, `BehaviorSubject`, `AsyncSubject` or `ReplaySubject`.
 * The class is provided as a generic type argument
 */
export type SubjectsOnly<T> = Pick<T, SubjectPropertyNames<T>>;

/**
 * A type of RxJS observable
 */
export type WorkerObservableType<T> = Observable<T>;
