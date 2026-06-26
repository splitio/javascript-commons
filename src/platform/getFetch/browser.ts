// It doesn't return a ponyfill if global fetch is not available
export function getFetch() {
  // eslint-disable-next-line no-undef
  return typeof fetch === 'function' ? fetch : undefined;
}
