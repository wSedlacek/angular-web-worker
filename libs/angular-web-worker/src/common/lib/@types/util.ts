export type Instantiable<T extends Object> = new (...args: any[]) => T;
