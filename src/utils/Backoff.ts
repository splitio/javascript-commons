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

  /**
   * Schedule function calls with exponential backoff
   *
   * @param {function} cb
   * @param {number} baseMillis
   * @param {number} maxMillis
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
    this.timeoutID = setTimeout(() => {
      this.timeoutID = undefined;
      this.cb();
    }, delayInMillis);
    this.attempts++;

    return delayInMillis;
  }

  reset() {
    this.attempts = 0;
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
  }

}
