import { ILogger } from '../../logger/types';
import { SplitError } from '../../utils/lang/errors';
import { ICustomStorageWrapper } from '../types';
import { LOG_PREFIX } from './constants';

export const METHODS_TO_PROMISE_WRAP: string[] = [
  'get',
  'set',
  'getAndSet',
  'del',
  'getKeysByPrefix',
  'getByPrefix',
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
 * Used to properly handle exception and rejected promise results: logs error and wrap them into SplitErrors.
 *
 * @param log logger instance
 * @param wrapper custom storage wrapper to adapt
 * @returns an adapted version of the given storage wrapper
 */
export function wrapperAdapter(log: ILogger, wrapper: ICustomStorageWrapper): ICustomStorageWrapper {

  const wrapperAdapter: Record<string, Function> = {};

  METHODS_TO_PROMISE_WRAP.forEach((method) => {

    // Logs error and wraps it into an SplitError object (required to handle user callback errors in SDK readiness events)
    function handleError(e: any) {
      log.error(`${LOG_PREFIX} Wrapper '${method}' operation threw an error. Message: ${e}`);
      return Promise.reject(new SplitError(e));
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
