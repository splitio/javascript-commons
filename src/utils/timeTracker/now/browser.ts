// @TODO migrate to Browser SDK package eventually
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
