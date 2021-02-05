// Simplified version of https://github.com/wesleytodd/setprototypeof/blob/master/index.js
const setPrototypeOf = Object.setPrototypeOf || function (obj, proto) { obj.__proto__ = proto; return obj; };

export class SplitError extends Error {
  constructor(msg = 'Split Error') {
    super(msg);
    this.message = msg;

    // Required when extending a native constructor and transpiling to ES5
    // See https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    setPrototypeOf(this, SplitError.prototype);
  }
}

export class SplitTimeoutError extends SplitError {
  constructor(msg?: string) {
    super(msg || 'Split Timeout Error');
    setPrototypeOf(this, SplitTimeoutError.prototype);
  }
}

export class SplitNetworkError extends SplitError {

  // HTTP error status code, or undefined if it is not an HTTP error
  statusCode?: number;

  constructor(msg?: string, code?: number) {
    super(msg || 'Split Network Error');
    this.statusCode = code;
    setPrototypeOf(this, SplitNetworkError.prototype);
  }
}
