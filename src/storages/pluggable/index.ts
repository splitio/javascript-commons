import { ICustomStorageWrapper, IStorageAsync, IStorageFactoryParams } from '../types';

import KeyBuilderSS from '../KeyBuilderSS';
import { SplitsCachePluggable } from './SplitsCachePluggable';
import { SegmentsCachePluggable } from './SegmentsCachePluggable';
import { ImpressionsCachePluggable } from './ImpressionsCachePluggable';
import { EventsCachePluggable } from './EventsCachePluggable';

import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../../readiness/constants';
import { wrapperAdapter, METHODS_TO_PROMISE_WRAP } from './wrapperAdapter';
import { isObject } from '../../utils/lang';

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
  if (!isObject(options) || !isObject(options.wrapper)) throw new Error('No `wrapper` option was provided');

  const wrapper = options.wrapper;
  const missingMethods = METHODS_TO_PROMISE_WRAP.filter(method => typeof wrapper[method] !== 'function');
  if (missingMethods.length) throw new Error(`Wrapper instance must implement the following methods: ${missingMethods}`);
}

/**
 * Pluggable storage factory for consumer server-side & client-side SplitFactory.
 */
export function PluggableStorage(options: PluggableStorageOptions) {

  validatePluggableStorageOptions(options);

  const prefix = options.prefix ? options.prefix + '.SPLITIO' : 'SPLITIO';

  return function PluggableStorageFactory({ log, metadata, readinessManager }: IStorageFactoryParams): IStorageAsync {

    const keys = new KeyBuilderSS(prefix, metadata);
    const wrapper = wrapperAdapter(log, options.wrapper);

    // subscription to Wrapper connect event in order to emit SDK_READY event
    wrapper.connect().then(() => {
      if (readinessManager) {
        readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
        readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
      }
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
