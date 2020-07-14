import { SecretResult, WorkerEvents, WorkerResponseEvent } from 'angular-web-worker/common';

export const isValidResponse = (requestSecret: string) => (
  resp: WorkerResponseEvent<WorkerEvents>
) => requestSecret === resp.requestSecret;

/**
 * Generates a random key
 * @param propertyName appended as the prefix to the key
 * @param length length of the randomly generated characters
 */
export const generateKey = (propertyName: string, length: number) => {
  return `${propertyName.toUpperCase()}_${Array(length)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('')}`;
};

/**
 * Checks if a valid `SecretResult` is returned when a decorated property and/or method of the client instance of the worker class is called.
 *  Returns the secret when valid otherwise returns null
 * @param secretResult the returned value from calling the property or method of a client instance of a worker
 * @param type the worker event type that originated the request
 */
export const isSecret = <SecretType extends number>(
  clientSecret: string,
  secretResult: any | SecretResult<SecretType>,
  type: SecretType
): SecretResult<SecretType> | null => {
  if (
    secretResult &&
    secretResult['clientSecret'] &&
    secretResult['propertyName'] &&
    secretResult['types'] &&
    secretResult['clientSecret'] === clientSecret &&
    Array.isArray(secretResult['types']) &&
    secretResult['types'].includes(type)
  ) {
    return secretResult as SecretResult<SecretType>;
  }

  return null;
};

export const getWorkerProperty = <W, T>(worker: W, workerProperty?: string | ((worker: W) => T)) =>
  typeof workerProperty === 'string' ? worker[workerProperty] : workerProperty?.(worker);
