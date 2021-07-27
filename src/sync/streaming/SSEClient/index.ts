import { ISettings } from '../../../types';
import { IAuthTokenPushEnabled } from '../AuthClient/types';
import { ISSEClient, ISseEventHandler } from './types';

const VERSION = '1.1';

const CONTROL_CHANNEL_REGEX = /^control_/;

/**
 * Build metadata headers for SSE connection.
 *
 * @param {ISettings} settings Validated settings.
 * @returns {Record<string, string>} Headers object
 */
function buildSSEHeaders(settings: ISettings) {
  const headers: Record<string, string> = {
    SplitSDKClientKey: settings.core.authorizationKey.slice(-4),
    SplitSDKVersion: settings.version,
  };

  // ip and hostname are false if IPAddressesEnabled is false
  const { ip, hostname } = settings.runtime;
  if (ip) headers['SplitSDKMachineIP'] = ip;
  if (hostname) headers['SplitSDKMachineName'] = hostname;

  return headers;
}

/**
 * Handles streaming connections with EventSource API
 */
export default class SSEClient implements ISSEClient {
  // Instance properties:
  eventSource: typeof EventSource;
  streamingUrl: string;
  connection?: InstanceType<typeof EventSource>;
  handler?: ISseEventHandler;
  authToken?: IAuthTokenPushEnabled;
  useHeaders?: boolean;
  headers: Record<string, string>;

  /**
   * SSEClient constructor.
   *
   * @param settings Validated settings.
   * @param useHeaders True to send metadata as headers or false to send as query params. If `true`, the provided EventSource must support headers.
   * @param getEventSource Function to get the EventSource constructor.
   * @throws 'EventSource API is not available. ' if EventSource is not available.
   */
  constructor(settings: ISettings, useHeaders?: boolean, getEventSource?: () => (typeof EventSource | undefined)) {
    // @ts-expect-error
    this.eventSource = getEventSource && getEventSource();
    // if eventSource is not available, throw an exception
    if (!this.eventSource) throw new Error('EventSource API is not available. ');

    this.streamingUrl = settings.urls.streaming + '/sse';
    this.reopen = this.reopen.bind(this);
    // @TODO get `useHeaders` flag from `getEventSource`, to use EventSource headers on client-side SDKs when possible.
    this.useHeaders = useHeaders;
    this.headers = buildSSEHeaders(settings);
  }

  setEventHandler(handler: ISseEventHandler) {
    this.handler = handler;
  }

  /**
   * Open the connection with a given authToken
   *
   * @param {IAuthTokenPushEnabled} authToken
   * @throws {TypeError} Will throw an error if `authToken` is undefined
   */
  open(authToken: IAuthTokenPushEnabled) {
    this.close(); // it closes connection if previously opened

    this.authToken = authToken;

    const channelsQueryParam = Object.keys(authToken.channels).map(
      function (channel) {
        const params = CONTROL_CHANNEL_REGEX.test(channel) ? '[?occupancy=metrics.publishers]' : '';
        return encodeURIComponent(params + channel);
      }
    ).join(',');
    const url = `${this.streamingUrl}?channels=${channelsQueryParam}&accessToken=${authToken.token}&v=${VERSION}&heartbeats=true`; // same results using `&heartbeats=false`

    this.connection = new this.eventSource(
      // For client-side SDKs, SplitSDKClientKey and SplitSDKClientKey metadata is passed as query params,
      // because native EventSource implementations for browser doesn't support headers.
      this.useHeaders ? url : url + `&SplitSDKVersion=${this.headers.SplitSDKVersion}&SplitSDKClientKey=${this.headers.SplitSDKClientKey}`,
      // @ts-ignore. For server-side SDKs, metadata is passed via headers. EventSource must support headers, like 'eventsource' package for Node.
      this.useHeaders ? { headers: this.headers } : undefined
    );

    if (this.handler) { // no need to check if SSEClient is used only by PushManager
      this.connection.addEventListener('open', this.handler.handleOpen);
      this.connection.addEventListener('message', this.handler.handleMessage);
      this.connection.addEventListener('error', this.handler.handleError);
    }
  }

  /** Close connection  */
  close() {
    if (this.connection) this.connection.close();
  }

  /**
   * Re-open the connection with the last given authToken.
   *
   * @throws {TypeError} if `open` has not been previously called with an authToken
   * @TODO this method is not used currently and could be removed.
   */
  reopen() {
    this.open(this.authToken as IAuthTokenPushEnabled);
  }
}
