import { getFetch } from '../browser';

test('getFetch returns global fetch in Browser', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  global.fetch = fetchMock;

  expect(getFetch()).toBe(fetchMock);

  global.fetch = originalFetch;
});

test('getFetch returns undefined when fetch is not available', () => {
  expect(getFetch()).toBeUndefined();
});
