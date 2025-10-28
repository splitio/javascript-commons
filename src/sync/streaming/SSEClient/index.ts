import { IPlatform } from '../../../sdkFactory/types';
import { decorateHeaders } from '../../../services/decorateHeaders';
import { IEventSourceConstructor } from '../../../services/types';
import { ISettings } from '../../../types';
import { checkIfServerSide } from '../../../utils/key';
import { isString } from '../../../utils/lang';
import { objectAssign } from '../../../utils/lang/objectAssign';
import { IAuthTokenPushEnabled } from '../AuthClient/types';
import { ISSEClient, ISseEventHandler } from './types';

const ABLY_API_VERSION = '1.1';

const CONTROL_CHANNEL_REGEX = /^control_/;

/**
 * Build metadata headers for SSE connection.
 *
 * @param settings - Validated settings.
 * @returns Headers object
 */
function buildSSEHeaders(settings: ISettings) {
  const headers: Record<string, string> = {
    SplitSDKClientKey: isString(settings.core.authorizationKey) ? settings.core.authorizationKey.slice(-4) : '',
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
export class SSEClient implements ISSEClient {
  // Instance properties:
  eventSource?: IEventSourceConstructor;
  connection?: InstanceType<IEventSourceConstructor>;
  handler?: ISseEventHandler;
  headers: Record<string, string>;
  options?: object;

  /**
   * SSEClient constructor.
   *
   * @param settings - Validated settings.
   * @param platform - object containing environment-specific dependencies
   * @throws 'EventSource API is not available.' if EventSource is not available.
   */
  constructor(private settings: ISettings, { getEventSource, getOptions }: IPlatform) {
    this.eventSource = getEventSource && getEventSource(settings);
    // if eventSource is not available, throw an exception
    if (!this.eventSource) throw new Error('EventSource API is not available.');

    this.headers = buildSSEHeaders(settings);
    this.options = getOptions && getOptions(settings);
  }

  setEventHandler(handler: ISseEventHandler) {
    this.handler = handler;
  }

  /**
   * Open the connection with a given authToken
   */
  open(authToken: IAuthTokenPushEnabled) {
    this.close(); // it closes connection if previously opened

    const channelsQueryParam = Object.keys(authToken.channels).map((channel) => {
      const params = CONTROL_CHANNEL_REGEX.test(channel) ? '[?occupancy=metrics.publishers]' : '';
      return encodeURIComponent(params + channel);
    }).join(',');
    const url = `${this.settings.urls.streaming}/sse?channels=${channelsQueryParam}&accessToken=${authToken.token}&v=${ABLY_API_VERSION}&heartbeats=true`; // same results using `&heartbeats=false`
    const isServerSide = checkIfServerSide(this.settings);

    this.connection = new this.eventSource!(
      // For client-side SDKs, metadata is passed as query param to avoid CORS issues and because native EventSource implementations in browsers do not support headers
      isServerSide ? url : url + `&SplitSDKVersion=${this.headers.SplitSDKVersion}&SplitSDKClientKey=${this.headers.SplitSDKClientKey}`,
      // For server-side SDKs, metadata is passed via headers
      objectAssign(
        isServerSide ?
          { headers: decorateHeaders(this.settings, this.headers) } :
          this.settings.sync.requestOptions?.getHeaderOverrides ?
            { headers: decorateHeaders(this.settings, {}) } : // User must provide a window.EventSource polyfill that supports headers
            {},
        this.options
      )
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
}
