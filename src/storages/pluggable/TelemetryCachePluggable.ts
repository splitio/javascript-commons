import { ILogger } from '../../types';
import { Method } from '../../sync/submitters/types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { IPluggableStorageWrapper, ITelemetryCacheAsync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';

export class TelemetryCachePluggable implements ITelemetryCacheAsync {

  /**
   * Create a Telemetry cache that uses a storage wrapper.
   * @param log  Logger instance.
   * @param keys  Key builder.
   * @param wrapper  Adapted wrapper storage.
   */
  constructor(private readonly log: ILogger, private readonly keys: KeyBuilderSS, private readonly wrapper: IPluggableStorageWrapper) { }

  recordLatency(method: Method, latencyMs: number) {
    return this.wrapper.incr(this.keys.buildLatencyKey(method, findLatencyIndex(latencyMs)))
      .catch(() => { /* Handle rejections for telemetry */ });
  }
  recordException(method: Method) {
    return this.wrapper.incr(this.keys.buildExceptionKey(method))
      .catch(() => { /* Handle rejections for telemetry */ });
  }

}
