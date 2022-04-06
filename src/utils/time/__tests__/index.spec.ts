import { truncateTimeFrame } from '..';

test('Test truncateTimeFrame', () => {
  expect(truncateTimeFrame(new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(new Date(2020, 9, 2, 10, 0, 0).getTime());
  expect(truncateTimeFrame(new Date(2020, 9, 2, 10, 0, 0).getTime())).toBe(new Date(2020, 9, 2, 10, 0, 0).getTime());
  expect(truncateTimeFrame(new Date(2020, 9, 2, 10, 53, 0).getTime())).toBe(new Date(2020, 9, 2, 10, 0, 0).getTime());
  expect(truncateTimeFrame(new Date(2020, 9, 2, 10, 0, 12).getTime())).toBe(new Date(2020, 9, 2, 10, 0, 0).getTime());
  expect(truncateTimeFrame(new Date(1970, 1, 0, 0, 0, 0).getTime())).toBe(new Date(1970, 1, 0, 0, 0, 0).getTime());
});
