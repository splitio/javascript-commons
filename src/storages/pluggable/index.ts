import { ICustomStorageWrapper, IStorageAsync, IStorageFactoryParams } from '../types';

import KeyBuilderSS from '../KeyBuilderSS';
import { SplitsCachePluggable } from './SplitsCachePluggable';
import { SegmentsCachePluggable } from './SegmentsCachePluggable';
import { ImpressionsCachePluggable } from './ImpressionsCachePluggable';
import { EventsCachePluggable } from './EventsCachePluggable';
import { wrapperAdapter, METHODS_TO_PROMISE_WRAP } from './wrapperAdapter';
import { isObject } from '../../utils/lang';

const NO_VALID_WRAPPER = 'Expecting custom storage `wrapper` in options, but no valid wrapper instance was provided.';
const NO_VALID_WRAPPER_INTERFACE = 'The provided wrapper instance doesn’t follow the expected interface. Check our docs.';

export interface PluggableStorageOptions {
  prefix?: string
  wrapper: ICustomStorageWrapper
}

/**
 * Validate pluggable storage factory options.
 *
 * @param options user options
 * @throws Will throw an error if the options are invalid. Example: wrapper is not provided or doesn't have some methods.
 */
function validatePluggableStorageOptions(options: any) {
  if (!isObject(options) || !isObject(options.wrapper)) throw new Error(NO_VALID_WRAPPER);

  const wrapper = options.wrapper;
  const missingMethods = METHODS_TO_PROMISE_WRAP.filter(method => typeof wrapper[method] !== 'function');
  if (missingMethods.length) throw new Error(`${NO_VALID_WRAPPER_INTERFACE} The following methods are missing or invalid: ${missingMethods}`);
}

/**
 * Pluggable storage factory for consumer server-side & client-side SplitFactory.
 */
export function PluggableStorage(options: PluggableStorageOptions) {

  validatePluggableStorageOptions(options);

  const prefix = options.prefix ? options.prefix + '.SPLITIO' : 'SPLITIO';

  return function PluggableStorageFactory({ log, metadata, onConnectCb }: IStorageFactoryParams): IStorageAsync {
    const keys = new KeyBuilderSS(prefix, metadata);
    const wrapper = wrapperAdapter(log, options.wrapper);

    // subscription to Wrapper connect event in order to emit SDK_READY event
    wrapper.connect().then(() => {
      if (onConnectCb) onConnectCb();
    }).catch((e) => {
      if (onConnectCb) onConnectCb(e || new Error('Error connecting wrapper'));
    });

    return {
      splits: new SplitsCachePluggable(log, keys, wrapper),
      segments: new SegmentsCachePluggable(log, keys, wrapper),
      impressions: new ImpressionsCachePluggable(log, keys, wrapper, metadata),
      events: new EventsCachePluggable(log, keys, wrapper, metadata),
      // @TODO add telemetry cache when required

      // Disconnect the underlying storage, to release its resources (such as open files, database connections, etc).
      destroy() {
        return wrapper.close();
      }
    };
  };
}
