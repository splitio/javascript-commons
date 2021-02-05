import { IAuthTokenPushEnabled } from '../AuthClient/types';
import { ISSEClient, ISseEventHandler } from './types';

const VERSION = '1.1';

const CONTROL_CHANNEL_REGEX = /^control_/;

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

  /**
   * SSEClient constructor.
   *
   * @param streamingUrl URL
   * @param eventSource optional EventSource constructor to use instead of the global one
   * @throws 'EventSource API is not available. ' if EventSource is not passed and global one is not available
   */
  constructor(streamingUrl: string, getEventSource?: () => typeof EventSource | undefined) {
    // @ts-expect-error
    this.eventSource = getEventSource && getEventSource();
    // if eventSource is not available, throw an exception
    if (!this.eventSource) throw new Error('EventSource API is not available. ');

    this.streamingUrl = streamingUrl + '/sse';
    this.reopen = this.reopen.bind(this);
  }

  setEventHandler(handler: ISseEventHandler) {
    this.handler = handler;
  }

  /**
   * Open the connection with a given authToken
   *
   * @param {IAuthTokenPushEnabled} authToken
   * @throws {TypeError} if `authToken` is undefined
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

    this.connection = new this.eventSource(url);

    if (this.handler) { // no need to check if SSEClient is used only by PushManager
      this.connection.onopen = this.handler.handleOpen;
      this.connection.onmessage = this.handler.handleMessage;
      this.connection.onerror = this.handler.handleError;
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
   */
  reopen() {
    this.open(this.authToken as IAuthTokenPushEnabled);
  }
}
