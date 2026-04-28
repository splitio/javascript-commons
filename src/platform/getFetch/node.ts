import { IFetch } from '../../services/types';

let nodeFetch: IFetch | undefined;

try {
  nodeFetch = require('node-fetch');

  // Handle node-fetch issue https://github.com/node-fetch/node-fetch/issues/1037
  if (typeof nodeFetch !== 'function') nodeFetch = (nodeFetch as any).default;

} catch (error) {
  // Try to access global fetch if `node-fetch` package couldn't be imported (e.g., not in a Node environment)
  // eslint-disable-next-line no-undef
  nodeFetch = typeof fetch === 'function' ? fetch : undefined;
}

// This function is only exposed for testing purposes.
export function __setFetch(fetch: IFetch) {
  nodeFetch = fetch;
}

/**
 * Retrieves 'node-fetch', a Fetch API polyfill for Node.js, with fallback to global 'fetch' if available.
 */
export function getFetch() {
  return nodeFetch;
}
