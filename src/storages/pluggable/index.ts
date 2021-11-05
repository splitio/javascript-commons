import { ICustomStorageWrapper, IStorageAsync, IStorageAsyncFactory, IStorageFactoryParams } from '../types';

import KeyBuilderSS from '../KeyBuilderSS';
import { SplitsCachePluggable } from './SplitsCachePluggable';
import { SegmentsCachePluggable } from './SegmentsCachePluggable';
import { ImpressionsCachePluggable } from './ImpressionsCachePluggable';
import { EventsCachePluggable } from './EventsCachePluggable';
import { wrapperAdapter, METHODS_TO_PROMISE_WRAP } from './wrapperAdapter';
import { isObject } from '../../utils/lang';
import { validatePrefix } from '../KeyBuilder';
import { STORAGE_CUSTOM } from '../../utils/constants';
import ImpressionsCacheInMemory from '../inMemory/ImpressionsCacheInMemory';
import EventsCacheInMemory from '../inMemory/EventsCacheInMemory';

const NO_VALID_WRAPPER = 'Expecting custom storage `wrapper` in options, but no valid wrapper instance was provided.';
const NO_VALID_WRAPPER_INTERFACE = 'The provided wrapper instance doesn’t follow the expected interface. Check our docs.';

export interface CustomStorageOptions {
  prefix?: string
  wrapper: ICustomStorageWrapper
}

/**
 * Validate custom storage factory options.
 *
 * @param options user options
 * @throws Will throw an error if the options are invalid. Example: wrapper is not provided or doesn't have some methods.
 */
function validateCustomStorageOptions(options: any) {
  if (!isObject(options) || !isObject(options.wrapper)) throw new Error(NO_VALID_WRAPPER);

  const wrapper = options.wrapper;
  const missingMethods = METHODS_TO_PROMISE_WRAP.filter(method => typeof wrapper[method] !== 'function');
  if (missingMethods.length) throw new Error(`${NO_VALID_WRAPPER_INTERFACE} The following methods are missing or invalid: ${missingMethods}`);
}

/**
 * Custom storage factory for consumer server-side & client-side SplitFactory.
 */
export function CustomStorage(options: CustomStorageOptions): IStorageAsyncFactory {

  validateCustomStorageOptions(options);

  const prefix = validatePrefix(options.prefix);

  function CustomStorageFactory({ log, metadata, onReadyCb, trackInMemory }: IStorageFactoryParams): IStorageAsync {
    const keys = new KeyBuilderSS(prefix, metadata);
    const wrapper = wrapperAdapter(log, options.wrapper);

    // subscription to Wrapper connect event in order to emit SDK_READY event
    wrapper.connect().then(() => {
      if (onReadyCb) onReadyCb();
    }).catch((e) => {
      if (onReadyCb) onReadyCb(e || new Error('Error connecting wrapper'));
    });

    return {
      splits: new SplitsCachePluggable(log, keys, wrapper),
      segments: new SegmentsCachePluggable(log, keys, wrapper),
      impressions: trackInMemory ? new ImpressionsCacheInMemory() : new ImpressionsCachePluggable(log, keys.buildImpressionsKey(), wrapper, metadata),
      events: trackInMemory ? new EventsCacheInMemory() : new EventsCachePluggable(log, keys.buildEventsKey(), wrapper, metadata),
      // @TODO add telemetry cache when required

      // Disconnect the underlying storage, to release its resources (such as open files, database connections, etc).
      destroy() {
        return wrapper.close();
      }
    };
  }

  CustomStorageFactory.type = STORAGE_CUSTOM;
  return CustomStorageFactory;
}
