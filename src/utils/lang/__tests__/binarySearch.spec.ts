import { binarySearch } from '../binarySearch';

test('BINARY SEARCH / given [1,3,5,7,10] as dataset look for several elements', () => {
  let searchFor = binarySearch.bind(null, [1, 3, 5, 7, 10]);
  let index = undefined;
  let value = -1;

  index = searchFor(value);
  expect(index).toBe(0); // expected value 0

  value++; // 0
  index = searchFor(value);
  expect(index).toBe(0); // expected value 0

  value++; // 1
  index = searchFor(value);
  expect(index).toBe(0); // expected value 0

  value++; // 2
  index = searchFor(value);
  expect(index).toBe(0); // expected value 0

  value++; // 3
  index = searchFor(value);
  expect(index).toBe(1); // expected value 1

  value++; // 4
  index = searchFor(value);
  expect(index).toBe(1); // expected value 1

  value++; // 5
  index = searchFor(value);
  expect(index).toBe(2); // expected value 2

  value++; // 6
  index = searchFor(value);
  expect(index).toBe(2); // expected value 2

  value++; // 7
  index = searchFor(value);
  expect(index).toBe(3); // expected value 3

  value++; // 8
  index = searchFor(value);
  expect(index).toBe(3); // expected value 3

  value++; // 9
  index = searchFor(value);
  expect(index).toBe(3); // expected value 3

  value++; // 10
  index = searchFor(value);
  expect(index).toBe(4); // expected value 4

  value++; // 11
  index = searchFor(value);
  expect(index).toBe(4); // expected value 4

  value++; // 12
  index = searchFor(value);
  expect(index).toBe(4); // expected value 4
});

test('BINARY SEARCH / run test using integer keys', () => {
  const KEYS = [
    1000, 1500, 2250, 3375, 5063,
    7594, 11391, 17086, 25629, 38443,
    57665, 86498, 129746, 194620, 291929,
    437894, 656841, 985261, 1477892, 2216838,
    3325257, 4987885, 7481828
  ];

  let searchFor = binarySearch.bind(null, KEYS);

  let index = searchFor(10);
  expect(index).toBe(0); // expected value 0

  index = searchFor(1001);
  expect(index).toBe(0); // expected value 0

  index = searchFor(1499);
  expect(index).toBe(0); // expected value 0

  index = searchFor(1500);
  expect(index).toBe(1); // expected value 1

  index = searchFor(2200);
  expect(index).toBe(1); // expected value 1

  index = searchFor(2251);
  expect(index).toBe(2); // expected value 2
});

test('BINARY SEARCH / run test using float keys', () => {
  const KEYS = [
    1, 1.5, 2.25, 3.38, 5.06, 7.59, 11.39, 17.09, 25.63, 38.44,
    57.67, 86.5, 129.75, 194.62, 291.93, 437.89, 656.84, 985.26, 1477.89,
    2216.84, 3325.26, 4987.89, 7481.83
  ];

  let searchFor = binarySearch.bind(null, KEYS);

  let index = searchFor(3.38);
  expect(index).toBe(3); // expected value 3

  index = searchFor(6);
  expect(index).toBe(4); // expected value 4

  index = searchFor(500.55);
  expect(index).toBe(15); // expected value 15

  index = searchFor(7481.83);
  expect(index).toBe(22); // expected value 22

  index = searchFor(80000);
  expect(index).toBe(22); // expected value 22
});
