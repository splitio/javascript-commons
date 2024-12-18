import SplitIO from '../../types/splitio';
import { MaybeThenable, ISplit, IMySegmentsResponse } from '../dtos/types';
import { MySegmentsData } from '../sync/polling/types';
import { EventDataType, HttpErrors, HttpLatencies, ImpressionDataType, LastSync, Method, MethodExceptions, MethodLatencies, MultiMethodExceptions, MultiMethodLatencies, MultiConfigs, OperationType, StoredEventWithMetadata, StoredImpressionWithMetadata, StreamingEvent, UniqueKeysPayloadCs, UniqueKeysPayloadSs, TelemetryUsageStatsPayload, UpdatesFromSSEEnum } from '../sync/submitters/types';
import { ISettings } from '../types';

/**
 * Interface of a pluggable storage wrapper.
 */
export interface IPluggableStorageWrapper {

  /** Key-Value operations */

  /**
   * Get the value of given `key`.
   *
   * @param key - Item to retrieve
   * @returns A promise that resolves with the element value associated with the specified `key`,
   * or null if the key does not exist. The promise rejects if the operation fails.
   */
  get: (key: string) => Promise<string | null>
  /**
   * Add or update an item with a specified `key` and `value`.
   *
   * @param key - Item to update
   * @param value - Value to set
   * @returns A promise that resolves if the operation success, whether the key was added or updated.
   * The promise rejects if the operation fails.
   */
  set: (key: string, value: string) => Promise<boolean | void>
  /**
   * Add or update an item with a specified `key` and `value`.
   *
   * @param key - Item to update
   * @param value - Value to set
   * @returns A promise that resolves with the previous value associated to the given `key`, or null if not set.
   * The promise rejects if the operation fails.
   */
  getAndSet: (key: string, value: string) => Promise<string | null>
  /**
   * Removes the specified item by `key`.
   *
   * @param key - Item to delete
   * @returns A promise that resolves if the operation success, whether the key existed and was removed (resolves with true) or it didn't exist (resolves with false).
   * The promise rejects if the operation fails, for example, if there is a connection error.
   */
  del: (key: string) => Promise<boolean>
  /**
   * Returns all keys matching the given prefix.
   *
   * @param prefix - String prefix to match
   * @returns A promise that resolves with the list of keys that match the given `prefix`.
   * The promise rejects if the operation fails.
   */
  getKeysByPrefix: (prefix: string) => Promise<string[]>
  /**
   * Returns the values of all given `keys`.
   *
   * @param keys - List of keys to retrieve
   * @returns A promise that resolves with the list of items associated with the specified list of `keys`.
   * For every key that does not hold a string value or does not exist, null is returned. The promise rejects if the operation fails.
   */
  getMany: (keys: string[]) => Promise<(string | null)[]>

  /** Integer operations */

  /**
   * Increments the number stored at `key` by `increment`, or set it to `increment` if the value doesn't exist.
   *
   * @param key - Key to increment
   * @param increment - Value to increment by. Defaults to 1.
   * @returns A promise that resolves with the value of key after the increment. The promise rejects if the operation fails,
   * for example, if there is a connection error or the key contains a string that can not be represented as integer.
   */
  incr: (key: string, increment?: number) => Promise<number>
  /**
   * Decrements the number stored at `key` by `decrement`, or set it to minus `decrement` if the value doesn't exist.
   *
   * @param key - Key to decrement
   * @param decrement - Value to decrement by. Defaults to 1.
   * @returns A promise that resolves with the value of key after the decrement. The promise rejects if the operation fails,
   * for example, if there is a connection error or the key contains a string that can not be represented as integer.
   */
  decr: (key: string, decrement?: number) => Promise<number>

  /** Queue operations */

  /**
   * Inserts given items at the tail of `key` list. If `key` does not exist, an empty list is created before pushing the items.
   *
   * @param key - List key
   * @param items - List of items to push
   * @returns A promise that resolves if the operation success.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  pushItems: (key: string, items: string[]) => Promise<void>
  /**
   * Removes and returns the first `count` items from a list. If `key` does not exist, an empty list is items is returned.
   *
   * @param key - List key
   * @param count - Number of items to pop
   * @returns A promise that resolves with the list of removed items from the list, or an empty array when key does not exist.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  popItems: (key: string, count: number) => Promise<string[]>
  /**
   * Returns the count of items in a list, or 0 if `key` does not exist.
   *
   * @param key - List key
   * @returns A promise that resolves with the number of items at the `key` list, or 0 when `key` does not exist.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  getItemsCount: (key: string) => Promise<number>

  /** Set operations */

  /**
   * Returns if item is a member of a set.
   *
   * @param key - Set key
   * @param item - Item value
   * @returns A promise that resolves with true boolean value if `item` is a member of the set stored at `key`,
   * or false if it is not a member or `key` set does not exist. The promise rejects if the operation fails, for example,
   * if there is a connection error or the key holds a value that is not a set.
   */
  itemContains: (key: string, item: string) => Promise<boolean>
  /**
   * Add the specified `items` to the set stored at `key`. Those items that are already part of the set are ignored.
   * If key does not exist, an empty set is created before adding the items.
   *
   * @param key - Set key
   * @param items - Items to add
   * @returns A promise that resolves if the operation success.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  addItems: (key: string, items: string[]) => Promise<boolean | void>
  /**
   * Remove the specified `items` from the set stored at `key`. Those items that are not part of the set are ignored.
   *
   * @param key - Set key
   * @param items - Items to remove
   * @returns A promise that resolves if the operation success. If key does not exist, the promise also resolves.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  removeItems: (key: string, items: string[]) => Promise<boolean | void>
  /**
   * Returns all the items of the `key` set.
   *
   * @param key - Set key
   * @returns A promise that resolves with the list of items. If key does not exist, the result is an empty list.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  getItems: (key: string) => Promise<string[]>

  /** Control operations */

  /**
   * Connects to the underlying storage.
   * It is meant for storages that requires to be connected to some database or server. Otherwise it can just return a resolved promise.
   * Note: will be called once on SplitFactory instantiation and once per each shared client instantiation.
   *
   * @returns A promise that resolves when the wrapper successfully connect to the underlying storage.
   * The promise rejects with the corresponding error if the wrapper fails to connect.
   */
  connect: () => Promise<void>
  /**
   * Disconnects from the underlying storage.
   * It is meant for storages that requires to be closed, in order to release resources. Otherwise it can just return a resolved promise.
   * Note: will be called once on SplitFactory main client destroy.
   *
   * @returns A promise that resolves when the operation ends.
   * The promise never rejects.
   */
  disconnect: () => Promise<void>
}

/** Splits cache */

export interface ISplitsCacheBase {
  addSplits(entries: [string, ISplit][]): MaybeThenable<boolean[] | void>,
  removeSplits(names: string[]): MaybeThenable<boolean[] | void>,
  getSplit(name: string): MaybeThenable<ISplit | null>,
  getSplits(names: string[]): MaybeThenable<Record<string, ISplit | null>>, // `fetchMany` in spec
  setChangeNumber(changeNumber: number): MaybeThenable<boolean | void>,
  // should never reject or throw an exception. Instead return -1 by default, assuming no splits are present in the storage.
  getChangeNumber(): MaybeThenable<number>,
  getAll(): MaybeThenable<ISplit[]>,
  getSplitNames(): MaybeThenable<string[]>,
  // should never reject or throw an exception. Instead return true by default, asssuming the TT might exist.
  trafficTypeExists(trafficType: string): MaybeThenable<boolean>,
  // only for Client-Side. Returns true if the storage is not synchronized yet (getChangeNumber() === -1) or contains a FF using segments or large segments
  usesSegments(): MaybeThenable<boolean>,
  clear(): MaybeThenable<boolean | void>,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): MaybeThenable<boolean>,
  getNamesByFlagSets(flagSets: string[]): MaybeThenable<Set<string>[]>
}

export interface ISplitsCacheSync extends ISplitsCacheBase {
  addSplits(entries: [string, ISplit][]): boolean[],
  removeSplits(names: string[]): boolean[],
  getSplit(name: string): ISplit | null,
  getSplits(names: string[]): Record<string, ISplit | null>,
  setChangeNumber(changeNumber: number): boolean | void,
  getChangeNumber(): number,
  getAll(): ISplit[],
  getSplitNames(): string[],
  trafficTypeExists(trafficType: string): boolean,
  usesSegments(): boolean,
  clear(): void,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): boolean,
  getNamesByFlagSets(flagSets: string[]): Set<string>[]
}

export interface ISplitsCacheAsync extends ISplitsCacheBase {
  addSplits(entries: [string, ISplit][]): Promise<boolean[] | void>,
  removeSplits(names: string[]): Promise<boolean[] | void>,
  getSplit(name: string): Promise<ISplit | null>,
  getSplits(names: string[]): Promise<Record<string, ISplit | null>>,
  setChangeNumber(changeNumber: number): Promise<boolean | void>,
  getChangeNumber(): Promise<number>,
  getAll(): Promise<ISplit[]>,
  getSplitNames(): Promise<string[]>,
  trafficTypeExists(trafficType: string): Promise<boolean>,
  usesSegments(): Promise<boolean>,
  clear(): Promise<boolean | void>,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): Promise<boolean>,
  getNamesByFlagSets(flagSets: string[]): Promise<Set<string>[]>
}

/** Segments cache */

export interface ISegmentsCacheBase {
  isInSegment(name: string, key?: string): MaybeThenable<boolean> // different signature on Server and Client-Side
  registerSegments(names: string[]): MaybeThenable<boolean | void> // only for Server-Side
  getRegisteredSegments(): MaybeThenable<string[]> // only for Server-Side
  getChangeNumber(name: string): MaybeThenable<number | undefined> // only for Server-Side
  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number): MaybeThenable<boolean> // only for Server-Side
  clear(): MaybeThenable<boolean | void>
}

// Same API for both variants: SegmentsCache and MySegmentsCache (client-side API)
export interface ISegmentsCacheSync extends ISegmentsCacheBase {
  isInSegment(name: string, key?: string): boolean
  registerSegments(names: string[]): boolean
  getRegisteredSegments(): string[]
  getKeysCount(): number // only used for telemetry
  getChangeNumber(name?: string): number | undefined
  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number): boolean // only for Server-Side
  resetSegments(segmentsData: MySegmentsData | IMySegmentsResponse): boolean // only for Sync Client-Side
  clear(): void
}

export interface ISegmentsCacheAsync extends ISegmentsCacheBase {
  isInSegment(name: string, key: string): Promise<boolean>
  registerSegments(names: string[]): Promise<boolean | void>
  getRegisteredSegments(): Promise<string[]>
  getChangeNumber(name: string): Promise<number | undefined>
  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number): Promise<boolean>
  clear(): Promise<boolean | void>
}

/** Recorder storages (impressions, events and telemetry) */

export interface IImpressionsCacheBase {
  // Used by impressions tracker, in DEBUG and OPTIMIZED impression modes, to push impressions into the storage.
  track(data: SplitIO.ImpressionDTO[]): MaybeThenable<void>
}

export interface IEventsCacheBase {
  // Used by events tracker to push events into the storage.
  track(data: SplitIO.EventData, size?: number): MaybeThenable<boolean>
}

export interface IImpressionCountsCacheBase {
  // Used by impressions tracker, in OPTIMIZED and NONE impression modes, to count impressions.
  track(featureName: string, timeFrame: number, amount: number): void
}

export interface IUniqueKeysCacheBase {
  // Used by impressions tracker, in NONE impression mode, to track unique keys.
  track(key: string, value: string): void
}

/** Impressions and events cache for standalone and partial consumer modes (sync methods) */

// API methods for sync recorder storages, used by submitters in standalone mode to pop data and post it to Split BE.
export interface IRecorderCacheSync<T> {
  // @TODO names are inconsistent with spec
  /* Checks if cache is empty. Returns true if the cache was just created or cleared */
  isEmpty(): boolean
  /* Clears cache data */
  clear(): void
  /* Pops cache data */
  pop(toMerge?: T): T
}

export interface IImpressionsCacheSync extends IImpressionsCacheBase, IRecorderCacheSync<SplitIO.ImpressionDTO[]> {
  track(data: SplitIO.ImpressionDTO[]): void
  /* Registers callback for full queue */
  setOnFullQueueCb(cb: () => void): void
}

export interface IEventsCacheSync extends IEventsCacheBase, IRecorderCacheSync<SplitIO.EventData[]> {
  track(data: SplitIO.EventData, size?: number): boolean
  /* Registers callback for full queue */
  setOnFullQueueCb(cb: () => void): void
}

/* Named `ImpressionsCounter` in spec */
export interface IImpressionCountsCacheSync extends IImpressionCountsCacheBase, IRecorderCacheSync<Record<string, number>> { }

export interface IUniqueKeysCacheSync extends IUniqueKeysCacheBase, IRecorderCacheSync<UniqueKeysPayloadSs | UniqueKeysPayloadCs> {
  setOnFullQueueCb(cb: () => void): void,
}

/** Impressions and events cache for consumer and producer modes (async methods) */

// API methods for async recorder storages, used by submitters in producer mode (synchronizer) to pop data and post it to Split BE.
export interface IRecorderCacheAsync<T> {
  /* returns the number of stored items */
  count(): Promise<number>
  /* removes the given number of items from the store. If not provided, it deletes all items */
  drop(count?: number): Promise<void>
  /* pops the given number of items from the store */
  popNWithMetadata(count: number): Promise<T>
}

export interface IImpressionsCacheAsync extends IImpressionsCacheBase, IRecorderCacheAsync<StoredImpressionWithMetadata[]> {
  // Consumer API method, used by impressions tracker (in standalone and consumer modes) to push data into.
  // The result promise can reject.
  track(data: SplitIO.ImpressionDTO[]): Promise<void>
}

export interface IEventsCacheAsync extends IEventsCacheBase, IRecorderCacheAsync<StoredEventWithMetadata[]> {
  // Consumer API method, used by events tracker (in standalone and consumer modes) to push data into.
  // The result promise cannot reject.
  track(data: SplitIO.EventData, size?: number): Promise<boolean>
}

/**
 * Telemetry storage interface for standalone and partial consumer modes.
 * Methods are sync because data is stored in memory.
 */

export interface ITelemetryInitConsumerSync {
  getTimeUntilReady(): number | undefined;
  getTimeUntilReadyFromCache(): number | undefined;
  getNonReadyUsage(): number;
  // 'active factories' and 'redundant factories' are not tracked in the storage. They are derived from `usedKeysMap`
}

export interface ITelemetryRuntimeConsumerSync {
  getImpressionStats(type: ImpressionDataType): number;
  getEventStats(type: EventDataType): number;
  getLastSynchronization(): LastSync;
  popHttpErrors(): HttpErrors;
  popHttpLatencies(): HttpLatencies;
  popAuthRejections(): number;
  popTokenRefreshes(): number;
  popStreamingEvents(): Array<StreamingEvent>;
  popTags(): Array<string> | undefined;
  getSessionLength(): number | undefined;
}

export interface ITelemetryEvaluationConsumerSync {
  popExceptions(): MethodExceptions;
  popLatencies(): MethodLatencies;
}

export interface ITelemetryStorageConsumerSync extends ITelemetryInitConsumerSync, ITelemetryRuntimeConsumerSync, ITelemetryEvaluationConsumerSync { }

export interface ITelemetryInitProducerSync {
  recordTimeUntilReady(ms: number): void;
  recordTimeUntilReadyFromCache(ms: number): void;
  recordNonReadyUsage(): void;
  // 'active factories' and 'redundant factories' are not tracked in the storage. They are derived from `usedKeysMap`
}

export interface ITelemetryRuntimeProducerSync {
  addTag(tag: string): void;
  recordImpressionStats(type: ImpressionDataType, count: number): void;
  recordEventStats(type: EventDataType, count: number): void;
  recordSuccessfulSync(resource: OperationType, timeMs: number): void;
  recordHttpError(resource: OperationType, status: number): void;
  recordHttpLatency(resource: OperationType, latencyMs: number): void;
  recordAuthRejections(): void;
  recordTokenRefreshes(): void;
  recordStreamingEvents(streamingEvent: StreamingEvent): void;
  recordSessionLength(ms: number): void;
  recordUpdatesFromSSE(type: UpdatesFromSSEEnum): void
}

export interface ITelemetryEvaluationProducerSync {
  recordLatency(method: Method, latencyMs: number): void;
  recordException(method: Method): void;
}

export interface ITelemetryStorageProducerSync extends ITelemetryInitProducerSync, ITelemetryRuntimeProducerSync, ITelemetryEvaluationProducerSync { }

export interface ITelemetryCacheSync extends ITelemetryStorageConsumerSync, ITelemetryStorageProducerSync, IRecorderCacheSync<TelemetryUsageStatsPayload> { }

/**
 * Telemetry storage interface for consumer mode.
 * Methods are async because data is stored in Redis or a pluggable storage.
 */

export interface ITelemetryEvaluationConsumerAsync {
  popLatencies(): Promise<MultiMethodLatencies>;
  popExceptions(): Promise<MultiMethodExceptions>;
  popConfigs(): Promise<MultiConfigs>;
}

export interface ITelemetryEvaluationProducerAsync {
  recordLatency(method: Method, latencyMs: number): Promise<any>;
  recordException(method: Method): Promise<any>;
  recordConfig(): Promise<any>;
}

// ATM it only implements the producer API, used by the SDK in consumer mode.
export interface ITelemetryCacheAsync extends ITelemetryEvaluationProducerAsync, ITelemetryEvaluationConsumerAsync { }

/**
 * Storages
 */

export interface IStorageBase<
  TSplitsCache extends ISplitsCacheBase,
  TSegmentsCache extends ISegmentsCacheBase,
  TImpressionsCache extends IImpressionsCacheBase,
  TImpressionsCountCache extends IImpressionCountsCacheBase,
  TEventsCache extends IEventsCacheBase,
  TTelemetryCache extends ITelemetryCacheSync | ITelemetryCacheAsync,
  TUniqueKeysCache extends IUniqueKeysCacheBase
> {
  splits: TSplitsCache,
  segments: TSegmentsCache,
  impressions: TImpressionsCache,
  impressionCounts?: TImpressionsCountCache,
  events: TEventsCache,
  telemetry?: TTelemetryCache,
  uniqueKeys?: TUniqueKeysCache,
  destroy(): void | Promise<void>,
  shared?: (matchingKey: string, onReadyCb: (error?: any) => void) => this
}

export interface IStorageSync extends IStorageBase<
  ISplitsCacheSync,
  ISegmentsCacheSync,
  IImpressionsCacheSync,
  IImpressionCountsCacheSync,
  IEventsCacheSync,
  ITelemetryCacheSync,
  IUniqueKeysCacheSync
> {
  // Defined in client-side
  validateCache?: () => boolean, // @TODO support async
  largeSegments?: ISegmentsCacheSync,
}

export interface IStorageAsync extends IStorageBase<
  ISplitsCacheAsync,
  ISegmentsCacheAsync,
  IImpressionsCacheAsync | IImpressionsCacheSync,
  IImpressionCountsCacheBase,
  IEventsCacheAsync | IEventsCacheSync,
  ITelemetryCacheAsync | ITelemetryCacheSync,
  IUniqueKeysCacheBase
> { }

/** StorageFactory */

export type DataLoader = (storage: IStorageSync, matchingKey: string) => void

export interface IStorageFactoryParams {
  settings: ISettings,
  /**
   * Error-first callback invoked when the storage is ready to be used. An error means that the storage failed to connect and shouldn't be used.
   * It is meant for emitting SDK_READY event in consumer mode, and waiting before using the storage in the synchronizer.
   */
  onReadyCb: (error?: any) => void,
}


export type IStorageSyncFactory = SplitIO.StorageSyncFactory & {
  readonly type: SplitIO.StorageType,
  (params: IStorageFactoryParams): IStorageSync
}

export type IStorageAsyncFactory = SplitIO.StorageAsyncFactory & {
  readonly type: SplitIO.StorageType,
  (params: IStorageFactoryParams): IStorageAsync
}
