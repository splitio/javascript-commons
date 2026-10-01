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
  scheduleCallAsync<T>(): Promise<T> {
    const delayInMillis = Math.min(this.baseMillis * Math.pow(2, this.attempts), this.maxMillis);

    if (this.timeoutID) clearTimeout(this.timeoutID);
    this.attempts++;

    return new Promise<T>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timeoutID = setTimeout(() => {
        this.timeoutID = undefined;
        this.pending = undefined;
        this.cb().then(resolve, reject);
      }, delayInMillis);
    });
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
