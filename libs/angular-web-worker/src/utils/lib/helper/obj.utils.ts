/**
 * A utility function as the replacer for the `JSON.stringify()` function to make the native browser `Error` class serializable to JSON
 */
export const replaceErrors = (_key: string, value: any) => {
  return value instanceof Error
    ? Object.getOwnPropertyNames(value).reduce(
        (error, property) => ({ ...error, [property]: value[property] }),
        {}
      )
    : value;
};
