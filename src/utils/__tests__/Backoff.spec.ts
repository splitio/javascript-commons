import { Backoff } from '../Backoff';
import { nearlyEqual } from '../../__tests__/testUtils';

test('Backoff', (done) => {

  let start = Date.now();
  let backoff: Backoff;

  let alreadyReset = false;
  const callback = () => {
    const delta = Date.now() - start;
    start += delta;
    const expectedMillis = Math.min(backoff.baseMillis * Math.pow(2, backoff.attempts - 1), backoff.maxMillis);

    expect(nearlyEqual(delta, expectedMillis)).toBe(true); // executes callback at expected time
    if (backoff.attempts <= 3) {
      backoff.scheduleCall();
    } else {
      backoff.reset();
      expect(backoff.attempts).toBe(0); // restarts attempts when `reset` called
      expect(backoff.timeoutID).toBe(undefined); // restarts timeoutId when `reset` called

      // init the schedule cycle or finish the test
      if (alreadyReset) {
        done();
      } else {
        alreadyReset = true;
        backoff.scheduleCall();
      }
    }
  };

  backoff = new Backoff(callback);
  expect(backoff.cb).toBe(callback); // contains given callback
  expect(backoff.baseMillis).toBe(Backoff.DEFAULT_BASE_MILLIS); // contains default baseMillis
  expect(backoff.maxMillis).toBe(Backoff.DEFAULT_MAX_MILLIS); // contains default maxMillis

  const CUSTOM_BASE = 200;
  const CUSTOM_MAX = 700;
  backoff = new Backoff(callback, CUSTOM_BASE, CUSTOM_MAX);
  expect(backoff.baseMillis).toBe(CUSTOM_BASE); // contains given baseMillis
  expect(backoff.maxMillis).toBe(CUSTOM_MAX); // contains given maxMillis

  expect(backoff.scheduleCall()).toBe(backoff.baseMillis); // scheduleCall returns the scheduled delay time
});
