import { findLatencyIndex } from '../findLatencyIndex';

const latenciesInMsAndBuckets = [
  // First bucket is up to 0.5 ms
  [0, 0],
  [0.500, 0],
  [1.000, 0],
  [1.001, 1],
  [1.400, 1],
  [1.500, 1],
  [1.501, 2],
  [8.000, 6],
  [11.39, 6],
  [11.392, 7],
  [17.085, 7],
  // Last bucket
  [7481.827, 22],
  [7481.828, 22],
  [7999.999, 22],
  // Invalid values
  [NaN, 0]
];

test('findLatencyIndex', () => {

  latenciesInMsAndBuckets.forEach(([latencyInMs, expectedBucket]) => { // @ts-ignore
    expect(findLatencyIndex(latencyInMs)).toBe(expectedBucket);
  });

});
