import { MaybeThenable, IMetadata, ISplitFiltersValidation } from '../dtos/types';
import { ILogger } from '../logger/types';
import { StoredEventWithMetadata, StoredImpressionWithMetadata } from '../sync/submitters/types';
import { SplitIO, ImpressionDTO, SDKMode } from '../types';

/**
 * Interface of a pluggable storage wrapper.
 */
export interface IPluggableStorageWrapper {

  /** Key-Value operations */

  /**
   * Get the value of given `key`.
   *
   * @function get
   * @param {string} key Item to retrieve
   * @returns {Promise<string | null>} A promise that resolves with the element value associated with the specified `key`,
   * or null if the key does not exist. The promise rejects if the operation fails.
   */
  get: (key: string) => Promise<string | null>
  /**
   * Add or update an item with a specified `key` and `value`.
   *
   * @function set
   * @param {string} key Item to update
   * @param {string} value Value to set
   * @returns {Promise<void>} A promise that resolves if the operation success, whether the key was added or updated.
   * The promise rejects if the operation fails.
   */
  set: (key: string, value: string) => Promise<boolean | void>
  /**
   * Add or update an item with a specified `key` and `value`.
   *
   * @function getAndSet
   * @param {string} key Item to update
   * @param {string} value Value to set
   * @returns {Promise<string | null>} A promise that resolves with the previous value associated to the given `key`, or null if not set.
   * The promise rejects if the operation fails.
   */
  getAndSet: (key: string, value: string) => Promise<string | null>
  /**
   * Removes the specified item by `key`.
   *
   * @function del
   * @param {string} key Item to delete
   * @returns {Promise<void>} A promise that resolves if the operation success, whether the key existed and was removed or it didn't exist.
   * The promise rejects if the operation fails, for example, if there is a connection error.
   */
  del: (key: string) => Promise<boolean | void>
  /**
   * Returns all keys matching the given prefix.
   *
   * @function getKeysByPrefix
   * @param {string} prefix String prefix to match
   * @returns {Promise<string[]>} A promise that resolves with the list of keys that match the given `prefix`.
   * The promise rejects if the operation fails.
   */
  getKeysByPrefix: (prefix: string) => Promise<string[]>
  /**
   * Returns the values of all given `keys`.
   *
   * @function getMany
   * @param {string[]} keys List of keys to retrieve
   * @returns {Promise<(string | null)[]>} A promise that resolves with the list of items associated with the specified list of `keys`.
   * For every key that does not hold a string value or does not exist, null is returned. The promise rejects if the operation fails.
   */
  getMany: (keys: string[]) => Promise<(string | null)[]>

  /** Integer operations */

  /**
   * Increments in 1 the given `key` value or set it to 1 if the value doesn't exist.
   *
   * @function incr
   * @param {string} key Key to increment
   * @returns {Promise<number>} A promise that resolves with the value of key after the increment. The promise rejects if the operation fails,
   * for example, if there is a connection error or the key contains a string that can not be represented as integer.
   */
  incr: (key: string) => Promise<number>
  /**
   * Decrements in 1 the given `key` value or set it to -1 if the value doesn't exist.
   *
   * @function decr
   * @param {string} key Key to decrement
   * @returns {Promise<number>} A promise that resolves with the value of key after the decrement. The promise rejects if the operation fails,
   * for example, if there is a connection error or the key contains a string that can not be represented as integer.
   */
  decr: (key: string) => Promise<number>

  /** Queue operations */

  /**
   * Inserts given items at the tail of `key` list. If `key` does not exist, an empty list is created before pushing the items.
   *
   * @function pushItems
   * @param {string} key List key
   * @param {string[]} items List of items to push
   * @returns {Promise<void>} A promise that resolves if the operation success.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  pushItems: (key: string, items: string[]) => Promise<void>
  /**
   * Removes and returns the first `count` items from a list. If `key` does not exist, an empty list is items is returned.
   *
   * @function popItems
   * @param {string} key List key
   * @param {number} count Number of items to pop
   * @returns {Promise<string[]>} A promise that resolves with the list of removed items from the list, or an empty array when key does not exist.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  popItems: (key: string, count: number) => Promise<string[]>
  /**
   * Returns the count of items in a list, or 0 if `key` does not exist.
   *
   * @function getItemsCount
   * @param {string} key List key
   * @returns {Promise<number>} A promise that resolves with the number of items at the `key` list, or 0 when `key` does not exist.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a list.
   */
  getItemsCount: (key: string) => Promise<number>

  /** Set operations */

  /**
   * Returns if item is a member of a set.
   *
   * @function itemContains
   * @param {string} key Set key
   * @param {string} item Item value
   * @returns {Promise<boolean>} A promise that resolves with true boolean value if `item` is a member of the set stored at `key`,
   * or false if it is not a member or `key` set does not exist. The promise rejects if the operation fails, for example,
   * if there is a connection error or the key holds a value that is not a set.
   */
  itemContains: (key: string, item: string) => Promise<boolean>
  /**
   * Add the specified `items` to the set stored at `key`. Those items that are already part of the set are ignored.
   * If key does not exist, an empty set is created before adding the items.
   *
   * @function addItems
   * @param {string} key Set key
   * @param {string} items Items to add
   * @returns {Promise<boolean | void>} A promise that resolves if the operation success.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  addItems: (key: string, items: string[]) => Promise<boolean | void>
  /**
   * Remove the specified `items` from the set stored at `key`. Those items that are not part of the set are ignored.
   *
   * @function removeItems
   * @param {string} key Set key
   * @param {string} items Items to remove
   * @returns {Promise<boolean | void>} A promise that resolves if the operation success. If key does not exist, the promise also resolves.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  removeItems: (key: string, items: string[]) => Promise<boolean | void>
  /**
   * Returns all the items of the `key` set.
   *
   * @function getItems
   * @param {string} key Set key
   * @returns {Promise<string[]>} A promise that resolves with the list of items. If key does not exist, the result is an empty list.
   * The promise rejects if the operation fails, for example, if there is a connection error or the key holds a value that is not a set.
   */
  getItems: (key: string) => Promise<string[]>

  /** Control operations */

  /**
   * Connects to the underlying storage.
   * It is meant for storages that requires to be connected to some database or server. Otherwise it can just return a resolved promise.
   * Note: will be called once on SplitFactory instantiation and once per each shared client instantiation.
   *
   * @function connect
   * @returns {Promise<void>} A promise that resolves when the wrapper successfully connect to the underlying storage.
   * The promise rejects with the corresponding error if the wrapper fails to connect.
   */
  connect: () => Promise<void>
  /**
   * Disconnects from the underlying storage.
   * It is meant for storages that requires to be closed, in order to release resources. Otherwise it can just return a resolved promise.
   * Note: will be called once on SplitFactory main client destroy.
   *
   * @function disconnect
   * @returns {Promise<void>} A promise that resolves when the operation ends.
   * The promise never rejects.
   */
  disconnect: () => Promise<void>
}

/** Splits cache */

export interface ISplitsCacheBase {
  addSplits(entries: [string, string][]): MaybeThenable<boolean[] | void>,
  removeSplits(names: string[]): MaybeThenable<boolean[] | void>,
  getSplit(name: string): MaybeThenable<string | null>,
  getSplits(names: string[]): MaybeThenable<Record<string, string | null>>, // `fetchMany` in spec
  setChangeNumber(changeNumber: number): MaybeThenable<boolean | void>,
  // should never reject or throw an exception. Instead return -1 by default, assuming no splits are present in the storage.
  getChangeNumber(): MaybeThenable<number>,
  getAll(): MaybeThenable<string[]>,
  getSplitNames(): MaybeThenable<string[]>,
  // should never reject or throw an exception. Instead return true by default, asssuming the TT might exist.
  trafficTypeExists(trafficType: string): MaybeThenable<boolean>,
  // only for Client-Side
  usesSegments(): MaybeThenable<boolean>,
  clear(): MaybeThenable<boolean | void>,
  // should never reject or throw an exception. Instead return false by default, to avoid emitting SDK_READY_FROM_CACHE.
  checkCache(): MaybeThenable<boolean>,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): MaybeThenable<boolean>
}

export interface ISplitsCacheSync extends ISplitsCacheBase {
  addSplits(entries: [string, string][]): boolean[],
  removeSplits(names: string[]): boolean[],
  getSplit(name: string): string | null,
  getSplits(names: string[]): Record<string, string | null>,
  setChangeNumber(changeNumber: number): boolean,
  getChangeNumber(): number,
  getAll(): string[],
  getSplitNames(): string[],
  trafficTypeExists(trafficType: string): boolean,
  usesSegments(): boolean,
  clear(): void,
  checkCache(): boolean,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): boolean
}

export interface ISplitsCacheAsync extends ISplitsCacheBase {
  addSplits(entries: [string, string][]): Promise<boolean[] | void>,
  removeSplits(names: string[]): Promise<boolean[] | void>,
  getSplit(name: string): Promise<string | null>,
  getSplits(names: string[]): Promise<Record<string, string | null>>,
  setChangeNumber(changeNumber: number): Promise<boolean | void>,
  getChangeNumber(): Promise<number>,
  getAll(): Promise<string[]>,
  getSplitNames(): Promise<string[]>,
  trafficTypeExists(trafficType: string): Promise<boolean>,
  usesSegments(): Promise<boolean>,
  clear(): Promise<boolean | void>,
  checkCache(): Promise<boolean>,
  killLocally(name: string, defaultTreatment: string, changeNumber: number): Promise<boolean>
}

/** Segments cache */

export interface ISegmentsCacheBase {
  addToSegment(name: string, segmentKeys: string[]): MaybeThenable<boolean | void> // different signature on Server and Client-Side
  removeFromSegment(name: string, segmentKeys: string[]): MaybeThenable<boolean | void> // different signature on Server and Client-Side
  isInSegment(name: string, key?: string): MaybeThenable<boolean> // different signature on Server and Client-Side
  registerSegments(names: string[]): MaybeThenable<boolean | void> // only for Server-Side
  getRegisteredSegments(): MaybeThenable<string[]> // only for Server-Side
  setChangeNumber(name: string, changeNumber: number): MaybeThenable<boolean | void> // only for Server-Side
  getChangeNumber(name: string): MaybeThenable<number> // only for Server-Side
  clear(): MaybeThenable<boolean | void>
}

// Same API for both variants: SegmentsCache and MySegmentsCache (client-side API)
export interface ISegmentsCacheSync extends ISegmentsCacheBase {
  addToSegment(name: string, segmentKeys?: string[]): boolean
  removeFromSegment(name: string, segmentKeys?: string[]): boolean
  isInSegment(name: string, key?: string): boolean
  registerSegments(names: string[]): boolean
  getRegisteredSegments(): string[]
  setChangeNumber(name: string, changeNumber: number): boolean
  getChangeNumber(name: string): number
  resetSegments(names: string[]): boolean // only for Sync Client-Side
  clear(): void
}

export interface ISegmentsCacheAsync extends ISegmentsCacheBase {
  addToSegment(name: string, segmentKeys: string[]): Promise<boolean | void>
  removeFromSegment(name: string, segmentKeys: string[]): Promise<boolean | void>
  isInSegment(name: string, key: string): Promise<boolean>
  registerSegments(names: string[]): Promise<boolean | void>
  getRegisteredSegments(): Promise<string[]>
  setChangeNumber(name: string, changeNumber: number): Promise<boolean | void>
  getChangeNumber(name: string): Promise<number>
  clear(): Promise<boolean | void>
}

/** Recorder storages (impressions, events and telemetry) */

export interface IImpressionsCacheBase {
  // Consumer API method, used by impressions tracker, in standalone and consumer modes, to push impressions into the storage.
  track(data: ImpressionDTO[]): MaybeThenable<void>
}

export interface IEventsCacheBase {
  // Consumer API method, used by events tracker, in standalone and consumer modes, to push events into the storage.
  track(data: SplitIO.EventData, size?: number): MaybeThenable<boolean>
}

/** Impressions and events cache for standalone mode (sync) */

// Producer API methods for sync recorder storages, used by submitters in standalone mode to pop data and post it to Split BE.
export interface IRecorderCacheProducerSync<T> {
  // @TODO names are inconsistent with spec
  /* Checks if cache is empty. Returns true if the cache was just created or cleared */
  isEmpty(): boolean
  /* Clears cache data */
  clear(): void
  /* Gets cache data */
  state(): T
}


export interface IImpressionsCacheSync extends IImpressionsCacheBase, IRecorderCacheProducerSync<ImpressionDTO[]> {
  track(data: ImpressionDTO[]): void
  /* Registers callback for full queue */
  setOnFullQueueCb(cb: () => void): void
}

export interface IEventsCacheSync extends IEventsCacheBase, IRecorderCacheProducerSync<SplitIO.EventData[]> {
  track(data: SplitIO.EventData, size?: number): boolean
  /* Registers callback for full queue */
  setOnFullQueueCb(cb: () => void): void
}

/** Impressions and events cache for consumer and producer mode (async) */

// Producer API methods for async recorder storages, used by submitters in producer mode to pop data and post it to Split BE.
export interface IRecorderCacheProducerAsync<T> {
  /* returns the number of stored items */
  count(): Promise<number>
  /* removes the given number of items from the store. If not provided, it deletes all items */
  drop(count?: number): Promise<void>
  /* pops the given number of items from the store */
  popNWithMetadata(count: number): Promise<T>
}

export interface IImpressionsCacheAsync extends IImpressionsCacheBase, IRecorderCacheProducerAsync<StoredImpressionWithMetadata[]> {
  // Consumer API method, used by impressions tracker (in standalone and consumer modes) to push data into.
  track(data: ImpressionDTO[]): Promise<void>
}

export interface IEventsCacheAsync extends IEventsCacheBase, IRecorderCacheProducerAsync<StoredEventWithMetadata[]> {
  // Consumer API method, used by events tracker (in standalone and consumer modes) to push data into.
  track(data: SplitIO.EventData, size?: number): Promise<boolean>
}

/**
 * Impression counts cache for impressions dedup in standalone and producer mode.
 * Only in memory. Named `ImpressionsCounter` in spec.
 */
export interface IImpressionCountsCacheSync extends IRecorderCacheProducerSync<Record<string, number>> {
  // Used by impressions tracker
  track(featureName: string, timeFrame: number, amount: number): void

  // Used by impressions count submitter in standalone and producer mode
  isEmpty(): boolean // check if cache is empty. Return true if the cache was just created or cleared.
  clear(): void // clear cache data
  state(): Record<string, number> // get cache data
}


/** Latencies and metric counts cache */
// @TODO remove. They are deprecated.

export interface ILatenciesCacheSync extends IRecorderCacheProducerSync<Record<string, number[]>> {
  track(metricName: string, latency: number): boolean
  isEmpty(): boolean
  clear(): void
  state(): Record<string, number[]>
}

export interface ILatenciesCacheAsync {
  track(metricName: string, latency: number): Promise<boolean>
}

export interface ICountsCacheSync extends IRecorderCacheProducerSync<Record<string, number>> {
  track(metricName: string): boolean
  isEmpty(): boolean
  clear(): void
  state(): Record<string, number>
}

export interface ICountsCacheAsync {
  track(metricName: string): Promise<boolean>
}

/**
 * Storages
 */

export interface IStorageBase<
  TSplitsCache extends ISplitsCacheBase,
  TSegmentsCache extends ISegmentsCacheBase,
  TImpressionsCache extends IImpressionsCacheBase,
  TEventsCache extends IEventsCacheBase,
  TLatenciesCache extends ILatenciesCacheSync | ILatenciesCacheAsync,
  TCountsCache extends ICountsCacheSync | ICountsCacheAsync,
  > {
  splits: TSplitsCache,
  segments: TSegmentsCache,
  impressions: TImpressionsCache,
  impressionCounts?: IImpressionCountsCacheSync,
  events: TEventsCache,
  latencies?: TLatenciesCache,
  counts?: TCountsCache,
  destroy(): void | Promise<void>,
  shared?: (matchingKey: string, onReadyCb: (error?: any) => void) => this
}

export type IStorageSync = IStorageBase<
  ISplitsCacheSync,
  ISegmentsCacheSync,
  IImpressionsCacheSync,
  IEventsCacheSync,
  ILatenciesCacheSync,
  ICountsCacheSync
>

export type IStorageAsync = IStorageBase<
  ISplitsCacheAsync,
  ISegmentsCacheAsync,
  IImpressionsCacheAsync | IImpressionsCacheSync,
  IEventsCacheAsync | IEventsCacheSync,
  ILatenciesCacheAsync,
  ICountsCacheAsync
>

/** StorageFactory */

export type DataLoader = (storage: IStorageSync, matchingKey: string) => void

export interface IStorageFactoryParams {
  log: ILogger,
  impressionsQueueSize?: number,
  eventsQueueSize?: number,
  optimize?: boolean /* whether create the `impressionCounts` cache (OPTIMIZED impression mode) or not (DEBUG impression mode) */,

  // ATM, only used by InLocalStorage
  matchingKey?: string, /* undefined on server-side SDKs */
  splitFiltersValidation?: ISplitFiltersValidation,

  // ATM, only used by PluggableStorage
  mode?: SDKMode,

  // This callback is invoked when the storage is ready to be used. Error-first callback style: if an error is passed,
  // it means that the storge fail to connect and shouldn't be used.
  // It is meant for emitting SDK_READY event in consumer mode, and for synchronizer to wait before using the storage.
  onReadyCb: (error?: any) => void,
  metadata: IMetadata,
}

export type StorageType = 'MEMORY' | 'LOCALSTORAGE' | 'REDIS' | 'PLUGGABLE';

export type IStorageSyncFactory = {
  readonly type: StorageType,
  (params: IStorageFactoryParams): IStorageSync
}

export type IStorageAsyncFactory = {
  type: StorageType,
  (params: IStorageFactoryParams): IStorageAsync
}
