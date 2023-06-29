import { IEventEmitter, IStatusInterface } from '../types';

/** Splits data emitter */

type SDK_SPLITS_ARRIVED = 'state::splits-arrived'
type SDK_SPLITS_CACHE_LOADED = 'state::splits-cache-loaded'
type ISplitsEvent = SDK_SPLITS_ARRIVED | SDK_SPLITS_CACHE_LOADED

export interface ISplitsEventEmitter extends IEventEmitter {
  emit(event: ISplitsEvent, ...args: any[]): boolean
  on(event: ISplitsEvent, listener: (...args: any[]) => void): this;
  once(event: ISplitsEvent, listener: (...args: any[]) => void): this;
  splitsArrived: boolean
  splitsCacheLoaded: boolean
}

/** Segments data emitter */

type SDK_SEGMENTS_ARRIVED = 'state::segments-arrived'
type ISegmentsEvent = SDK_SEGMENTS_ARRIVED

export interface ISegmentsEventEmitter extends IEventEmitter {
  emit(event: ISegmentsEvent, ...args: any[]): boolean
  on(event: ISegmentsEvent, listener: (...args: any[]) => void): this;
  once(event: ISegmentsEvent, listener: (...args: any[]) => void): this;
  segmentsArrived: boolean
}

/** Readiness emitter */

export type SDK_READY_TIMED_OUT = 'init::timeout'
export type SDK_READY = 'init::ready'
export type SDK_READY_FROM_CACHE = 'init::cache-ready'
export type SDK_UPDATE = 'state::update'
export type SDK_DESTROY = 'state::destroy'
export type IReadinessEvent = SDK_READY_TIMED_OUT | SDK_READY | SDK_READY_FROM_CACHE | SDK_UPDATE | SDK_DESTROY

export interface IReadinessEventEmitter extends IEventEmitter {
  emit(event: IReadinessEvent, ...args: any[]): boolean
}

/** Readiness manager */

export interface IReadinessManager {
  /** Event emitters */
  splits: ISplitsEventEmitter,
  segments: ISegmentsEventEmitter,
  gate: IReadinessEventEmitter,

  /** Readiness status */
  isReady(): boolean,
  isReadyFromCache(): boolean,
  hasTimedout(): boolean,
  isDestroyed(): boolean,
  isOperational(): boolean,

  timeout(): void,
  destroy(): void,

  /** for client-side */
  shared(readyTimeout?: number): IReadinessManager,
}

/** SDK readiness manager */

export interface ISdkReadinessManager {
  readinessManager: IReadinessManager
  sdkStatus: IStatusInterface

  /**
   * Increment internalReadyCbCount, an offset value of SDK_READY listeners that are added/removed internally
   * by the SDK. It is required to properly log the warning 'No listeners for SDK Readiness detected'
   */
  incInternalReadyCbCount(): void

  /** for client-side */
  shared(readyTimeout?: number): ISdkReadinessManager
}
