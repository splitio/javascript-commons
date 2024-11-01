      /**
       * Custom function called before each request, allowing you to add or update headers in SDK HTTP requests.
       * Some headers, such as `SplitSDKVersion`, are required by the SDK and cannot be overridden.
       * To pass multiple headers with the same name, combine their values into a single line, separated by commas. Example: `{ 'Authorization': 'value1, value2' }`
       * Or provide keys with different case since headers are case-insensitive. Example: `{ 'authorization': 'value1', 'Authorization': 'value2' }`
       *
       * NOTE: to pass custom headers to the streaming connection in Browser, you should polyfill the `window.EventSource` object with a library that supports headers,
       * like https://www.npmjs.com/package/event-source-polyfill, since native EventSource does not support them and will be ignored.
       *
       * @property getHeaderOverrides
       * @default undefined
       *
       * @param context - The context for the request.
       * @param context.headers - The current headers in the request.
       * @returns A set of headers to be merged with the current headers.
       *
       * @example
       * const getHeaderOverrides = (context) => {
       *   return {
       *     'Authorization': context.headers['Authorization'] + ', other-value',
       *     'custom-header': 'custom-value'
       *   };
       * };
       */
      getHeaderOverrides?: (context: { headers: Record<string, string> }) => Record<string, string>