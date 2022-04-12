import { findLatencyIndex } from '../findLatencyIndex';

test('findLatencyIndex', () => {

  const latenciesInMsAndBuckets = [
    // First bucket is up to 0.5 ms
    [0, 0],
    [0.500, 0],
    [1.400, 1],
    [1.500, 1],
    [8.000, 6],
    [11.39, 6],
    [11.392, 7],
    [17.085, 7],
    // Last bucket
    [7481.827, 22],
    [7481.828, 22],
    [7999.999, 22],
    // Invalid values
    [NaN, 0],
    ['invalid', 0]
  ];

  latenciesInMsAndBuckets.forEach(([latencyInMs, expectedBucket]) => { // @ts-ignore
    expect(findLatencyIndex(latencyInMs)).toBe(expectedBucket);
  });

});
