const DEFAULT_ERROR_MARGIN = 75; // 0.075 secs if numbers are timestamps in milliseconds

/**
 * Assert if an `actual` and `expected` numeric values are nearly equal.
 *
 * @param {number} actual actual time lapse in millis
 * @param {number} expected expected time lapse in millis
 * @param {number} epsilon error margin in millis
 * @returns {boolean} whether the absolute difference is minor to epsilon value or not
 */
export function nearlyEqual(actual: number, expected: number, epsilon = DEFAULT_ERROR_MARGIN) {
  const diff = Math.abs(actual - expected);
  return diff <= epsilon;
}
