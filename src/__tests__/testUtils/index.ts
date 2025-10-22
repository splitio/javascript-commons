const DEFAULT_ERROR_MARGIN = 75; // 0.075 secs if numbers are timestamps in milliseconds

/**
 * Assert if an `actual` and `expected` numeric values are nearly equal.
 *
 * @param actual - actual time lapse in millis
 * @param expected - expected time lapse in millis
 * @param epsilon - error margin in millis
 * @returns whether the absolute difference is minor to epsilon value or not
 */
export function nearlyEqual(actual: number, expected: number, epsilon = DEFAULT_ERROR_MARGIN) {
  const diff = Math.abs(actual - expected);
  return diff <= epsilon;
}
