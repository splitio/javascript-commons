import { thenable } from '../thenable';

test('Promise utils / thenable', () => {
  const prom = new Promise(() => { });
  const promResolved = Promise.resolve();
  const promRejected = Promise.reject();
  const thenableThing = { then: () => { } };
  const nonThenableThing = { then: 'not a function' };

  expect(thenable(prom)).toBe(true); // Promises and thenable-like objects should pass the test.
  expect(thenable(promResolved)).toBe(true); // Promises and thenable-like objects should pass the test.
  expect(thenable(promRejected)).toBe(true); // Promises and thenable-like objects should pass the test.
  expect(thenable(thenableThing)).toBe(true); // Promises and thenable-like objects should pass the test.

  expect(thenable(nonThenableThing)).toBe(false); // Non thenable objects should fail the test.
  expect(thenable('string')).toBe(false); // Non thenable objects should fail the test.
  expect(thenable(123)).toBe(false); // Non thenable objects should fail the test.
  expect(thenable({})).toBe(false); // Non thenable objects should fail the test.
  expect(thenable({ catch: () => { } })).toBe(false); // Non thenable objects should fail the test.
  expect(thenable([prom, promResolved])).toBe(false); // Non thenable objects should fail the test.
  expect(thenable(() => { })).toBe(false); // Non thenable objects should fail the test.
});
