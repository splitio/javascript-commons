export class Backoff {

  // For testing purposes, assign to overwrite the provided value by param
  static __TEST__BASE_MILLIS?: number;
  static __TEST__MAX_MILLIS?: number;

  static DEFAULT_BASE_MILLIS = 1000; // 1 second
  static DEFAULT_MAX_MILLIS = 1800000; // 30 minutes

  baseMillis: number;
  maxMillis: number;
  attempts: number;
  cb: (...args: any[]) => any;
  timeoutID: ReturnType<typeof setTimeout> | undefined;
  pending: { resolve: (value: any) => void, reject: (error: any) => void } | undefined;
  untilSuccess: Promise<boolean> | undefined;

  /**
   * Schedule function calls with exponential backoff.
   * @param cb - The function to call. Must return a promise if used with `scheduleCallAsync`.
   */
  constructor(cb: (...args: any[]) => any, baseMillis?: number, maxMillis?: number) {
    this.baseMillis = Backoff.__TEST__BASE_MILLIS || baseMillis || Backoff.DEFAULT_BASE_MILLIS;
    this.maxMillis = Backoff.__TEST__MAX_MILLIS || maxMillis || Backoff.DEFAULT_MAX_MILLIS;
    this.attempts = 0;
    this.cb = cb;
  }

  /**
   * Schedule a next call to `cb`
   * @returns scheduled delay in milliseconds
   */
  scheduleCall() {
    let delayInMillis = Math.min(this.baseMillis * Math.pow(2, this.attempts), this.maxMillis);

    if (this.timeoutID) clearTimeout(this.timeoutID);
    this.attempts++;

    this.timeoutID = setTimeout(() => {
      this.timeoutID = undefined;
      this.cb();
    }, delayInMillis);

    return delayInMillis;
  }

  /**
   * Schedule a delayed call to `cb`
   * @returns a promise that resolves/rejects with the result of the `cb` function, which must return a promise.
   */
  scheduleCallAsync<T>(fn: () => Promise<T> = this.cb): Promise<T> {
    const delayInMillis = Math.min(this.baseMillis * Math.pow(2, this.attempts), this.maxMillis);

    if (this.timeoutID) clearTimeout(this.timeoutID);
    this.attempts++;

    return new Promise<T>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timeoutID = setTimeout(() => {
        this.timeoutID = undefined;
        this.pending = undefined;
        fn().then(resolve, reject);
      }, delayInMillis);
    });
  }

  /**
   * Call `cb`, and call it again with exponential backoff until it resolves with `true`, or `stop` is called.
   * `cb` must return a promise that resolves with a boolean value.
   * While in progress, calling it again returns the same promise (no new calls to `cb`). Once succeeded or stopped, it starts a new run.
   * @returns a promise that resolves with `true` when `cb` succeeds, or `false` if `stop` is called before.
   */
  callUntilSuccess(): Promise<boolean> {
    if (this.untilSuccess) return this.untilSuccess;

    let untilSuccess: Promise<boolean>;
    const attempt = (): Promise<boolean> => this.cb().then((success: boolean) => {
      // stopped: neither retry nor reset, even if a new run was started after it
      if (this.untilSuccess !== untilSuccess) return false;
      if (success) {
        this.untilSuccess = undefined;
        this.reset();
        return true;
      }
      return this.scheduleCallAsync(attempt);
    });

    return untilSuccess = this.untilSuccess = attempt();
  }

  /**
   * Stop the `callUntilSuccess` retries, resolving its promise with `false`.
   */
  stop() {
    this.untilSuccess = undefined;
    this.reset({ value: false });
  }

  /**
   * Reset the backoff attempts, canceling any scheduled `cb` call. If a `scheduleCallAsync` call is pending
   * and the caller wants to settle it immediately instead of waiting for `cb` to be invoked, pass `settle`:
   * `{ value }` to resolve, or `{ error }` to reject.
   */
  reset<T>(settle?: { value: T } | { error: any }) {
    this.attempts = 0;
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
    if (settle && this.pending) {
      if ('value' in settle) this.pending.resolve(settle.value);
      else this.pending.reject(settle.error);
      this.pending = undefined;
    }
  }

}
