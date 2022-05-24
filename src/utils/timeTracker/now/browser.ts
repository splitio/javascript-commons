// Can be used on any runtime, since it fallbacks to `Date.now` if `performance.now` is not available
function nowFactory() {
  // eslint-disable-next-line
  if (typeof performance === 'object' && typeof performance.now === 'function') {
    // eslint-disable-next-line
    return performance.now.bind(performance);
  } else {
    return Date.now;
  }
}

export const now = nowFactory();
