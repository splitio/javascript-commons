import { ILogger } from '../../logger/types';
import { ICustomStorageWrapper } from '../types';
import { LOG_PREFIX } from './constants';

export const METHODS_TO_PROMISE_WRAP: string[] = [
  'get',
  'set',
  'getAndSet',
  'del',
  'getKeysByPrefix',
  'incr',
  'decr',
  'getMany',
  'pushItems',
  'popItems',
  'getItemsCount',
  'itemContains',
  'addItems',
  'removeItems',
  'getItems',
  'connect',
  'close'
];

/**
 * Adapter of the Custom Storage Wrapper.
 * Used to handle exceptions as rejected promises, in order to simplify the error handling on storages.
 *
 * @param log logger instance
 * @param wrapper custom storage wrapper to adapt
 * @returns an adapted version of the given storage wrapper
 */
export function wrapperAdapter(log: ILogger, wrapper: ICustomStorageWrapper): ICustomStorageWrapper {

  const wrapperAdapter: Record<string, Function> = {};

  METHODS_TO_PROMISE_WRAP.forEach((method) => {

    // Logs error and wraps it into a rejected promise.
    function handleError(e: any) {
      log.error(`${LOG_PREFIX} Wrapper '${method}' operation threw an error. Message: ${e}`);
      return Promise.reject(e);
    }

    wrapperAdapter[method] = function () {
      try {
        // @ts-ignore
        return wrapper[method].apply(wrapper, arguments).then(value => value).catch(handleError);
      } catch (e) {
        return handleError(e);
      }
    };

  });

  // @ts-ignore
  return wrapperAdapter;
}
