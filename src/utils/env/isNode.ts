// eslint-disable-next-line no-undef
/**
 * 'true' if running in Node.js, or 'false' otherwise.
 * We check for version truthiness since most shims will have that as empty string.
 */
export const isNode: boolean = typeof process !== 'undefined' && typeof process.version !== 'undefined' && !!process.version ? true : false;
