import { Backoff } from '../Backoff';
import { nearlyEqual } from '../../__tests__/testUtils';

describe('Backoff', () => {

  test('scheduleCall', (done) => {

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

  test('scheduleCallAsync resolves with cb result', async () => {
    const cb = () => Promise.resolve(42);
    const backoff = new Backoff(cb, 10, 50);

    const result = await backoff.scheduleCallAsync<number>();
    expect(result).toBe(42);
    expect(backoff.attempts).toBe(1);
  });

  test('scheduleCallAsync rejects when cb rejects', async () => {
    const cb = () => Promise.reject(new Error('fail'));
    const backoff = new Backoff(cb, 10, 50);

    await expect(backoff.scheduleCallAsync()).rejects.toThrow('fail');
  });

  test('scheduleCallAsync is settled immediately by reset({ value }), without invoking cb again', async () => {
    const cb = jest.fn(() => Promise.resolve('done'));
    const backoff = new Backoff(cb, 100, 100);

    const promise = backoff.scheduleCallAsync();
    backoff.reset({ value: 'fallback-value' });

    const result = await Promise.race([
      promise,
      new Promise(r => setTimeout(() => r('timeout'), 150))
    ]);
    expect(result).toBe('fallback-value');
    expect(cb).not.toHaveBeenCalled();
  });

  test('scheduleCallAsync is rejected immediately by reset({ error }), without invoking cb again', async () => {
    const cb = jest.fn(() => Promise.resolve('done'));
    const backoff = new Backoff(cb, 100, 100);

    const promise = backoff.scheduleCallAsync();
    backoff.reset({ error: new Error('gave up') });

    await expect(promise).rejects.toThrow('gave up');
    expect(cb).not.toHaveBeenCalled();
  });

  test('reset() without settle cancels the scheduled cb call, leaving the scheduleCallAsync promise unsettled', async () => {
    const cb = jest.fn(() => Promise.resolve('done'));
    const backoff = new Backoff(cb, 10, 10);

    const promise = backoff.scheduleCallAsync();
    backoff.reset();

    const result = await Promise.race([
      promise.then(() => 'resolved').catch(() => 'rejected'),
      new Promise(r => setTimeout(() => r('timeout'), 50))
    ]);
    expect(result).toBe('timeout');
    expect(cb).not.toHaveBeenCalled();
  });
  test('callUntilSuccess calls cb until it resolves with true, and resets attempts', async () => {
    const cb = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const backoff = new Backoff(cb, 10, 10);

    expect(await backoff.callUntilSuccess()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(3);
    expect(backoff.attempts).toBe(0);
  });

  test('callUntilSuccess is resolved with false by stop, without invoking cb again', async () => {
    const cb = jest.fn(() => Promise.resolve(false));
    const backoff = new Backoff(cb, 10, 10);

    const promise = backoff.callUntilSuccess();
    await new Promise(r => setTimeout(r, 0)); // first call fails and a retry is scheduled
    backoff.stop();

    expect(await promise).toBe(false);
    await new Promise(r => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('callUntilSuccess does not retry if stop is called while cb is in progress', async () => {
    let resolveCb: (value: boolean) => void = () => { };
    const cb = jest.fn(() => new Promise<boolean>(r => { resolveCb = r; }));
    const backoff = new Backoff(cb, 10, 10);

    const promise = backoff.callUntilSuccess();
    backoff.stop();
    resolveCb(false);

    expect(await promise).toBe(false);
    await new Promise(r => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('callUntilSuccess returns the same promise if called again while in progress, and starts a new run once succeeded', async () => {
    const cb = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const backoff = new Backoff(cb, 10, 10);

    const promise = backoff.callUntilSuccess();
    expect(backoff.callUntilSuccess()).toBe(promise); // in progress
    expect(await promise).toBe(true);
    expect(cb).toHaveBeenCalledTimes(2);

    const newPromise = backoff.callUntilSuccess(); // succeeded: new run
    expect(newPromise).not.toBe(promise);
    expect(await newPromise).toBe(true);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  test('callUntilSuccess starts a new run if called after stop, and the stopped run does not retry', async () => {
    let resolveCb: (value: boolean) => void = () => { };
    const cb = jest.fn(() => new Promise<boolean>(r => { resolveCb = r; }));
    const backoff = new Backoff(cb, 10, 10);

    const stoppedPromise = backoff.callUntilSuccess();
    const resolveStoppedCb = resolveCb;
    backoff.stop();

    const promise = backoff.callUntilSuccess();
    expect(promise).not.toBe(stoppedPromise);
    expect(cb).toHaveBeenCalledTimes(2);

    resolveStoppedCb(false); // the stopped run fails after the new run started, and must not retry
    expect(await stoppedPromise).toBe(false);
    await new Promise(r => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledTimes(2);

    resolveCb(true);
    expect(await promise).toBe(true);
  });

  test('callUntilSuccess: a stopped run that succeeds after a new run started does not reset the new run', async () => {
    const resolvers: Array<(value: boolean) => void> = [];
    const cb = jest.fn(() => new Promise<boolean>(r => { resolvers.push(r); }));
    const backoff = new Backoff(cb, 10, 10);

    const stoppedPromise = backoff.callUntilSuccess();
    backoff.stop();
    const promise = backoff.callUntilSuccess();

    resolvers[1](false); // the new run fails and schedules a retry
    await new Promise(r => setTimeout(r, 0));
    resolvers[0](true); // the stopped run succeeds: must not cancel the retry of the new run
    expect(await stoppedPromise).toBe(false);

    await new Promise(r => setTimeout(r, 50)); // the retry is called
    expect(cb).toHaveBeenCalledTimes(3);
    resolvers[2](true);
    expect(await promise).toBe(true);
  });
});
