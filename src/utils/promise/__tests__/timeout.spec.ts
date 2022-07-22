import { timeout } from '../timeout';
import { nearlyEqual } from '../../../__tests__/testUtils';

const baseTimeoutInMs = 20;
const resolutionValue = 'random_Value';

test('Promise utils / timeout - What happens in the event of a timeout or no timeout at all', async () => {
  const prom = new Promise(() => { });

  expect(timeout(0, prom)).toBe(prom); // If we set the timeout with a value less than 1, we just get the original promise (no timeout).
  expect(timeout(-1, prom)).toBe(prom); // If we set the timeout with a value less than 1, we just get the original promise (no timeout).

  prom.then(
    () => expect('This should not execute').toBeFalsy(),
    () => expect('This should execute on timeout expiration.')
  );

  const ts = Date.now();
  const wrapperProm = timeout(baseTimeoutInMs, prom);

  expect(wrapperProm).not.toBe(prom); // If we actually set a timeout it should return a wrapping promise.

  try {
    // This should be rejected after 10ms
    await wrapperProm;
    expect('Should not execute').toBeFalsy();
  } catch (error: any) {
    // The promise was rejected not resolved. Give it an error margin of 10ms since it's not predictable
    expect(nearlyEqual(Date.now() - ts, baseTimeoutInMs)).toBe(true); // The timeout should have rejected the promise.
    expect(error.message).toMatch(/^Operation timed out because it exceeded the configured time limit of/); // The timeout should have rejected the promise with a Split Timeout Error.
  }
});

test('Promise utils / timeout - What happens if the promise resolves before the timeout.', async () => {
  let promiseResolver: any = null;
  const prom = new Promise(res => { promiseResolver = res; });
  const wrapperProm = timeout(baseTimeoutInMs * 100, prom);

  expect(wrapperProm).not.toBe(prom); // If we actually set a timeout it should return a wrapping promise.

  setTimeout(() => {
    // Resolve the promise before the timeout
    promiseResolver(resolutionValue);
  }, baseTimeoutInMs * 10);

  // This one should not reject but be resolved
  try {
    // await prom;
    const result = await wrapperProm;

    expect(result).toBe(resolutionValue); // The wrapper should resolve to the same value the original promise resolves.
  } catch (error) {
    expect('Should not execute').toBeFalsy();
  }
});

test('Promise utils / timeout - What happens if the promise rejects before the timeout.', async () => {
  let promiseRejecter: any = null;
  const prom = new Promise((res, rej) => { promiseRejecter = rej; });
  const wrapperProm = timeout(baseTimeoutInMs * 100, prom);

  expect(wrapperProm).not.toBe(prom); // If we actually set a timeout it should return a wrapping promise.

  setTimeout(() => {
    // Reject the promise before the timeout
    promiseRejecter(resolutionValue);
  }, baseTimeoutInMs * 10);

  // This one should not resolve but be rejected
  try {
    await wrapperProm;

    expect('Should not execute').toBeFalsy();
  } catch (error) {
    expect(error).toBe(resolutionValue); // The wrapper should reject to the same error than the original promise.
  }
});
