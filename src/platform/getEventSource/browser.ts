export function getEventSource() {
  // eslint-disable-next-line no-undef -- Feature detection for EventSource
  return typeof EventSource === 'function' ? EventSource : undefined;
}
