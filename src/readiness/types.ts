import SplitIO from '../../types/splitio';

/** Readiness event types */

export type SDK_READY_TIMED_OUT = 'init::timeout'
export type SDK_READY = 'init::ready'
export type SDK_READY_FROM_CACHE = 'init::cache-ready'
export type SDK_UPDATE = 'state::update'
export type SDK_DESTROY = 'state::destroy'

export type IReadinessEvent = SDK_READY_TIMED_OUT | SDK_READY | SDK_READY_FROM_CACHE | SDK_UPDATE | SDK_DESTROY

export interface IReadinessEventEmitter extends SplitIO.IEventEmitter {
  emit(event: IReadinessEvent, ...args: any[]): boolean
}

/** Splits data emitter */

type SDK_DEFINITIONS_ARRIVED = 'state::splits-arrived'
type SDK_DEFINITIONS_CACHE_LOADED = 'state::splits-cache-loaded'
type IDefinitionsEvent = SDK_DEFINITIONS_ARRIVED | SDK_DEFINITIONS_CACHE_LOADED

export interface IDefinitionsEventEmitter extends SplitIO.IEventEmitter {
  emit(event: IDefinitionsEvent, ...args: any[]): boolean
  on(event: IDefinitionsEvent, listener: (...args: any[]) => void): this;
  on(event: SDK_UPDATE, listener: (metadata: SplitIO.SdkUpdateMetadata) => void): this;
  once(event: IDefinitionsEvent, listener: (...args: any[]) => void): this;
  definitionsArrived: boolean
  definitionsCacheLoaded: boolean
  hasInit: boolean,
  initCallbacks: (() => void)[]
}

/** Segments data emitter */

type SDK_SEGMENTS_ARRIVED = 'state::segments-arrived'
type ISegmentsEvent = SDK_SEGMENTS_ARRIVED

export interface ISegmentsEventEmitter extends SplitIO.IEventEmitter {
  emit(event: ISegmentsEvent, ...args: any[]): boolean
  on(event: ISegmentsEvent, listener: (...args: any[]) => void): this;
  on(event: SDK_UPDATE, listener: (metadata: SplitIO.SdkUpdateMetadata) => void): this;
  once(event: ISegmentsEvent, listener: (...args: any[]) => void): this;
  segmentsArrived: boolean
}

/** Readiness manager */

export interface IReadinessManager {
  /** Event emitters */
  definitions: IDefinitionsEventEmitter,
  segments: ISegmentsEventEmitter,
  gate: IReadinessEventEmitter,

  /** Readiness status */
  isReady(): boolean,
  isReadyFromCache(): boolean,
  isTimedout(): boolean,
  hasTimedout(): boolean,
  isDestroyed(): boolean,
  isOperational(): boolean,
  lastUpdate(): number,
  metadataReady(): SplitIO.SdkReadyMetadata,

  timeout(): void,
  setDestroyed(): void,
  destroy(): void,
  init(): void,

  /** for client-side */
  shared(): IReadinessManager,
}

/** SDK readiness manager */

export interface ISdkReadinessManager {
  readinessManager: IReadinessManager
  sdkStatus: SplitIO.IStatusInterface

  /** for client-side */
  shared(): ISdkReadinessManager
}
