/* eslint-disable no-undef */

// Reference to the global object if it exists: https://github.com/tc39/proposal-global
// The only reliable means to get the global object is `Function('return this')()`. However, this causes CSP violations in Chrome apps.
const globalRef =
  typeof global !== 'undefined' ? global : // reference to global object in Node runtime environment
    typeof window !== 'undefined' ? window : // reference to global object in browsers
      typeof self !== 'undefined' ? self : // reference to global object in browsers, web workers and others
        typeof globalThis !== 'undefined' ? globalThis : undefined; // ECMAScript proposal for global reference

/**
 * Get a global object passing its key
 */
export function getGlobal(key: string): object | undefined {
  // @ts-ignore
  return globalRef && globalRef[key];
}
