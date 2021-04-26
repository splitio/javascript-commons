import { toString, isString } from '../../utils/lang';
import { sanitizeBoolean as sBoolean } from '../../evaluator/value/sanitize';
import { ILogger } from '../../logger/types';
import { SplitError } from '../../utils/lang/errors';
import { ICustomStorageWrapper } from '../types';
import { logPrefix } from './constants';

// Sanitizers return the given value if it is of the expected type, or a new sanitized one if invalid.

function sanitizeBoolean(val: any): boolean {
  return sBoolean(val) || false;
}
sanitizeBoolean.type = 'boolean';

function sanitizeArray(val: any): string[] {
  if (!Array.isArray(val)) return []; // if not an array, returns a new empty one
  if (val.every(isString)) return val; // if all items are valid, return the given array
  return val.filter(isString); // otherwise, return a new array filtering the invalid items
}
sanitizeArray.type = 'Array<string>';

function sanitizeNullableString(val: any): string | null {
  if (val === null) return val;
  return toString(val);
}
sanitizeNullableString.type = 'string | null';

function sanitizeArrayOfNullableString(val: any): (string | null)[] {
  const isStringOrNull = (v: any) => v === null || isString(v);
  if (!Array.isArray(val)) return [];
  if (val.every(isStringOrNull)) return val;
  return val.filter(isStringOrNull);
}
sanitizeArrayOfNullableString.type = 'Array<string | null>';

const METHODS_TO_PROMISE_WRAP: [string, { (val: any): any, type: string }][] = [
  ['get', sanitizeNullableString],
  ['set', sanitizeBoolean],
  ['del', sanitizeBoolean],
  ['getKeysByPrefix', sanitizeArray],
  ['incr', sanitizeBoolean],
  ['decr', sanitizeBoolean],
  ['getMany', sanitizeArrayOfNullableString],
  ['connect', sanitizeBoolean],
  ['close', sanitizeBoolean]
];

/**
 * Adapter of the Custom Storage Wrapper.
 * Used to properly handle exception and rejected promise results: logs error and wrap them into SplitErrors.
 *
 * @param log logger instance
 * @param wrapper custom storage wrapper to adapt
 * @returns an adapted version of the given storage wrapper
 */
export function wrapperAdapter(log: ILogger, wrapper: ICustomStorageWrapper): ICustomStorageWrapper {

  const wrapperAdapter: Record<string, Function> = {};

  METHODS_TO_PROMISE_WRAP.forEach(([method, sanitizer]) => {

    // Logs error and wraps it into an SplitError object
    function handleError(e: any) {
      log.error(`${logPrefix} wrapper '${method}' operation threw an error. Message: ${e}`);
      return Promise.reject(new SplitError(e));
    }

    wrapperAdapter[method] = function () {
      try {
        // @ts-ignore
        return wrapper[method].apply(wrapper, arguments).then((value => {
          const sanitizedValue = sanitizer(value);
          // if value had to be sanitized, log a warning
          if (sanitizedValue !== value) log.warn(`${logPrefix} Attempted to sanitize return value [${value}] of wrapper '${method}' operation which should be of type [${sanitizer.type}]. Sanitized and processed value => [${sanitizedValue}]`);

          return sanitizedValue;
        })).catch(handleError);
      } catch (e) {
        return handleError(e);
      }
    };

  });

  // @ts-ignore
  return wrapperAdapter;
}
