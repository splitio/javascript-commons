import { SplitIO } from '../../types';

/**
 * A pair of user key and it's trafficType, required for tracking valid Split events.
 * @typedef {Object} Identity
 * @property {string} key The user key.
 * @property {string} trafficType The key traffic type.
 */
export type Identity = {
  key: string;
  trafficType: string;
};

/**
 * Options for GoogleAnalyticsToSplit integration plugin
 */
export interface GoogleAnalyticsToSplitOptions {
  /**
   * Optional flag to filter GA hits from being tracked as Split events.
   * @property {boolean} hits
   * @default true
   */
  hits?: boolean,
  /**
   * Optional predicate used to define a custom filter for tracking GA hits as Split events.
   * For example, the following filter allows to track only 'event' hits:
   *  `(model) => model.get('hitType') === 'event'`
   * By default, all hits are tracked as Split events.
   */
  filter?: (model: UniversalAnalytics.Model) => boolean,
  /**
   * Optional function useful when you need to modify the Split event before tracking it.
   * This function is invoked with two arguments:
   * 1. the GA model object representing the hit.
   * 2. the default format of the mapped Split event instance.
   * The return value must be a Split event, that can be the second argument or a new object.
   *
   * For example, the following mapper adds a custom property to events:
   *  `(model, defaultMapping) => {
   *      defaultMapping.properties.someProperty = SOME_VALUE;
   *      return defaultMapping;
   *  }`
   */
  mapper?: (model: UniversalAnalytics.Model, defaultMapping: SplitIO.EventData) => SplitIO.EventData,
  /**
   * Optional prefix for EventTypeId, to prevent any kind of data collision between events.
   * @property {string} prefix
   * @default 'ga'
   */
  prefix?: string,
  /**
   * List of Split identities (key & traffic type pairs) used to track events.
   * If not provided, events are sent using the key and traffic type provided at SDK config
   */
  identities?: Identity[],
  /**
   * Optional flag to log an error if the `auto-require` script is not detected.
   * The auto-require script automatically requires the `splitTracker` plugin for created trackers,
   * and should be placed right after your Google Analytics, Google Tag Manager or gtag.js script tag.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360040838752#set-up-with-gtm-and-gtag.js}
   *
   * @property {boolean} autoRequire
   * @default false
   */
  autoRequire?: boolean,
}

/**
 * Enable 'Google Analytics to Split' integration, to track Google Analytics hits as Split events.
 * Used by the browser variant of the isomorphic JS SDK.
 *
 * @see {@link https://help.split.io/hc/en-us/articles/360040838752#google-analytics-to-split}
 */
export interface IGoogleAnalyticsToSplitConfig extends GoogleAnalyticsToSplitOptions {
  type: 'GOOGLE_ANALYTICS_TO_SPLIT'
}

/**
 * Options for SplitToGoogleAnalytics integration plugin
 */
export interface SplitToGoogleAnalyticsOptions {
  /**
   * Optional flag to filter Split impressions from being tracked as GA hits.
   * @property {boolean} impressions
   * @default true
   */
  impressions?: boolean,
  /**
   * Optional flag to filter Split events from being tracked as GA hits.
   * @property {boolean} events
   * @default true
   */
  events?: boolean,
  /**
   * Optional predicate used to define a custom filter for tracking Split data (events and impressions) as GA hits.
   * For example, the following filter allows to track only impressions, equivalent to setting events to false:
   *  `(data) => data.type === 'IMPRESSION'`
   */
  filter?: (data: SplitIO.IntegrationData) => boolean,
  /**
   * Optional function useful when you need to modify the GA hit before sending it.
   * This function is invoked with two arguments:
   * 1. the input data (Split event or impression).
   * 2. the default format of the mapped FieldsObject instance (GA hit).
   * The return value must be a FieldsObject, that can be the second argument or a new object.
   *
   * For example, the following mapper adds a custom dimension to hits:
   *  `(data, defaultMapping) => {
   *      defaultMapping.dimension1 = SOME_VALUE;
   *      return defaultMapping;
   *  }`
   *
   * Default FieldsObject instance for data.type === 'IMPRESSION':
   *  `{
   *    hitType: 'event',
   *    eventCategory: 'split-impression',
   *    eventAction: 'Evaluate ' + data.payload.impression.feature,
   *    eventLabel: 'Treatment: ' + data.payload.impression.treatment + '. Targeting rule: ' + data.payload.impression.label + '.',
   *    nonInteraction: true,
   *  }`
   * Default FieldsObject instance for data.type === 'EVENT':
   *  `{
   *    hitType: 'event',
   *    eventCategory: 'split-event',
   *    eventAction: data.payload.eventTypeId,
   *    eventValue: data.payload.value,
   *    nonInteraction: true,
   *  }`
   */
  mapper?: (data: SplitIO.IntegrationData, defaultMapping: UniversalAnalytics.FieldsObject) => UniversalAnalytics.FieldsObject,
  /**
   * List of tracker names to send the hit. An empty string represents the default tracker.
   * If not provided, hits are only sent to default tracker.
   */
  trackerNames?: string[],
}

/**
 * Enable 'Split to Google Analytics' integration, to track Split impressions and events as Google Analytics hits.
 * Used by the browser variant of the isomorphic JS SDK.
 *
 * @see {@link https://help.split.io/hc/en-us/articles/360040838752#split-to-google-analytics}
 */
export interface ISplitToGoogleAnalyticsConfig extends SplitToGoogleAnalyticsOptions {
  type: 'SPLIT_TO_GOOGLE_ANALYTICS'
}

/**
 * Available integration options for the browser
 * Used by the browser variant of the isomorphic JS SDK.
 */
export type BrowserIntegration = ISplitToGoogleAnalyticsConfig | IGoogleAnalyticsToSplitConfig;
