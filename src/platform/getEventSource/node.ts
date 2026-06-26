import { IEventSourceConstructor } from '../../services/types';

let __isCustom = false;
let __eventSource: IEventSourceConstructor | undefined;

// This function is only exposed for testing purposes.
export function __setEventSource(eventSource: IEventSourceConstructor) {
  __eventSource = eventSource;
  __isCustom = true;
}
export function __restore() {
  __isCustom = false;
}

export function getEventSource() {
  // returns EventSource at `eventsource` package. If not available, return global EventSource or undefined
  try {
    return __isCustom ? __eventSource : require('./eventsource');
  } catch (error) {
    // eslint-disable-next-line no-undef -- Feature detection for EventSource
    return typeof EventSource === 'function' ? EventSource : undefined;
  }
}
