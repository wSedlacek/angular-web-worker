import {
  SecretResult,
  WorkerEvents,
  WorkerRequestBody,
  WorkerRequestEvent,
  WorkerRequestPropertyName,
  WorkerResponseEvent,
} from 'angular-web-worker/common';

import { replaceErrors } from './obj.utils';

/**
 * A utility function to create a new `WorkerResponseEvent` from the details provided by the `WorkerRequestEvent`, as well as the result to be returned
 * @param type The type of worker event
 * @param request The request that the response relates to
 * @param result data to return with the response
 */
export const responseFactory = <EventType extends WorkerEvents, R extends EventType | string>(
  type: EventType,
  request: WorkerRequestEvent<EventType>,
  result?: R | null
): WorkerResponseEvent<R> => {
  return {
    type,
    result,
    isError: false,
    requestSecret: request.requestSecret,
    propertyName: request.propertyName,
  };
};

/**
 * A utility function to create a new error in the form of a `WorkerResponseEvent` from the details provided by the `WorkerRequestEvent`, as well as the error to be returned
 * @param type The type of worker event
 * @param request The request that the error relates to
 * @param result the error to be returned
 */
export const errorFactory = <EventType extends WorkerEvents>(
  type: WorkerEvents,
  request: WorkerRequestEvent<EventType>,
  error?: any
): WorkerResponseEvent<EventType> => {
  return {
    type,
    isError: true,
    requestSecret: request.requestSecret,
    propertyName: request.propertyName,
    error: JSON.stringify(error, replaceErrors),
    result: null,
  };
};

export const requestFactory = <EventType extends WorkerEvents>({
  type,
  requestSecret,
  noProperty,
  secretResult,
  additionalContext,
  body,
}: {
  type: EventType;
  requestSecret: string;
  noProperty: boolean;
  secretResult: SecretResult<EventType> | null;
  additionalContext: any;
  body?(
    secretResult: SecretResult<EventType> | null,
    additionalContext: any
  ): WorkerRequestBody<EventType>;
}): WorkerRequestEvent<EventType> => ({
  type,
  requestSecret,
  propertyName: (noProperty || secretResult === null
    ? null
    : secretResult.propertyName) as WorkerRequestPropertyName<EventType>,
  body: (body ? body(secretResult, additionalContext) : null) as WorkerRequestBody<EventType>,
});

export const mockRequestFactory = <EventType extends WorkerEvents>(
  type: EventType,
  propertyName?: string,
  body?: any
): WorkerRequestEvent<EventType> => {
  return {
    type,
    body: body ? JSON.parse(JSON.stringify(body)) : null,
    propertyName: (propertyName ?? null) as WorkerRequestPropertyName<EventType>,
    requestSecret: 'secret',
  };
};
