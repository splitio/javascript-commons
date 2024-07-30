// @ts-nocheck
import EventSourceMock from '../../../../__tests__/testUtils/eventSourceMock';
import { authDataSample, channelsQueryParamSample } from '../../__tests__/dataMocks';
import { fullSettings as settings } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { url } from '../../../../utils/settingsValidation/url';

import { SSEClient } from '../index';

const EXPECTED_URL = url(settings, '/sse') +
  '?channels=' + channelsQueryParamSample +
  '&accessToken=' + authDataSample.token +
  '&v=1.1&heartbeats=true';

const EXPECTED_HEADERS = {
  SplitSDKClientKey: '1234',
  SplitSDKVersion: settings.version
};

test('SSEClient / instance creation throws error if EventSource is not provided', () => {
  expect(() => { new SSEClient(settings); }).toThrow(Error);
  expect(() => { new SSEClient(settings, false, {}); }).toThrow(Error);
  expect(() => { new SSEClient(settings, false, { getEventSource: () => undefined }); }).toThrow(Error);
});

test('SSEClient / instance creation success if EventSource is provided', () => {
  const instance = new SSEClient(settings, false, { getEventSource: () => EventSourceMock });
  expect(instance.eventSource).toBe(EventSourceMock);
});

test('SSEClient / setEventHandler, open and close methods', () => {
  // instance event handler
  const handler = {
    handleOpen: jest.fn(),
    handleError: jest.fn(),
    handleMessage: jest.fn(),
  };

  // instance SSEClient
  const instance = new SSEClient(settings, false, { getEventSource: () => EventSourceMock });
  instance.setEventHandler(handler);

  // open connection
  instance.open(authDataSample);
  let esconnection = instance.connection; // instance of EventSource used to mock events
  esconnection.emitOpen();
  expect(handler.handleOpen).toBeCalledTimes(1); // handleOpen called when connection is opened
  handler.handleOpen.mockClear();

  // emit message
  const message = 'message';
  esconnection.emitMessage(message);
  expect(handler.handleMessage.mock.calls[0][0]).toBe(message); // handleMessage called when message received
  handler.handleMessage.mockClear();

  // emit error
  const error = 'error';
  esconnection.emitError(error);
  expect(handler.handleError.mock.calls[0][0]).toBe(error); // handleError called when error received
  handler.handleError.mockClear();

  // close connection
  instance.close();
  expect(instance.connection.readyState).toBe(2); // connection readyState is CLOSED (2)

  // open attempt without open event emitted
  instance.open(authDataSample);
  expect(handler.handleOpen).not.toBeCalled(); // handleOpen not called until open event is emitted

  // open a new connection
  instance.open(authDataSample);
  instance.connection.emitOpen();
  expect(handler.handleOpen).toBeCalledTimes(1); // handleOpen called when connection is open

  // remove event handler before opening a new connection
  handler.handleOpen.mockClear();
  instance.setEventHandler(undefined);
  instance.open(authDataSample);
  instance.connection.emitOpen();
  expect(handler.handleOpen).not.toBeCalled(); // handleOpen not called if connection is open but the handler was removed

});

test('SSEClient / open method: URL with metadata query params', () => {

  const instance = new SSEClient(settings, false, { getEventSource: () => EventSourceMock });
  instance.open(authDataSample);

  const EXPECTED_BROWSER_URL = EXPECTED_URL + `&SplitSDKVersion=${settings.version}&SplitSDKClientKey=${EXPECTED_HEADERS.SplitSDKClientKey}`;

  expect(instance.connection.url).toBe(EXPECTED_BROWSER_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toEqual({}); // No headers are passed for streaming connection
});

test('SSEClient / open method: URL and metadata headers with IP and Hostname', () => {

  const settingsWithRuntime = {
    ...settings,
    runtime: {
      ip: 'some ip',
      hostname: 'some hostname'
    }
  };
  const instance = new SSEClient(settingsWithRuntime, true, { getEventSource: () => EventSourceMock });
  instance.open(authDataSample);

  expect(instance.connection.url).toBe(EXPECTED_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toEqual({
    headers: {
      ...EXPECTED_HEADERS,
      SplitSDKMachineIP: settingsWithRuntime.runtime.ip,
      SplitSDKMachineName: settingsWithRuntime.runtime.hostname
    }
  }); // Headers are properly set for streaming connection
});

test('SSEClient / open method: URL and metadata headers without IP and Hostname', () => {

  const instance = new SSEClient(settings, true, { getEventSource: () => EventSourceMock });
  instance.open(authDataSample);

  expect(instance.connection.url).toBe(EXPECTED_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toEqual({ headers: EXPECTED_HEADERS }); // Headers are properly set for streaming connection
});

test('SSEClient / open method: URL, metadata headers and options', () => {
  const platform = { getEventSource: jest.fn(() => EventSourceMock), getOptions: jest.fn(() => ({ withCredentials: true })) };

  const instance = new SSEClient(settings, true, platform);
  instance.open(authDataSample);

  expect(instance.connection.url).toBe(EXPECTED_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toEqual({ headers: EXPECTED_HEADERS, withCredentials: true }); // Headers and options are properly set for streaming connection

  // Assert that getEventSource and getOptions were called once with settings
  expect(platform.getEventSource.mock.calls).toEqual([[settings]]);
  expect(platform.getOptions.mock.calls).toEqual([[settings]]);
});

test('SSEClient / open method: largeSegmentsEnabled true', () => {
  const authDataWithMyLargeSegmentsChannel = {
    ...authDataSample,
    channels: { ...authDataSample.channels, 'NzM2MDI5Mzc0_MzQyODU4NDUyNg==_myLargeSegments': ['subscribe'] },
  };

  let instance = new SSEClient({
    ...settings,
    sync: { largeSegmentsEnabled: false }
  }, true, { getEventSource: () => EventSourceMock });

  instance.open(authDataWithMyLargeSegmentsChannel);
  expect(instance.connection.url).toBe(EXPECTED_URL);

  instance = new SSEClient({
    ...settings,
    sync: { largeSegmentsEnabled: true }
  }, true, { getEventSource: () => EventSourceMock });

  instance.open(authDataWithMyLargeSegmentsChannel);
  expect(instance.connection.url).toBe(EXPECTED_URL.replace('&accessToken', ',NzM2MDI5Mzc0_MzQyODU4NDUyNg%3D%3D_myLargeSegments&accessToken'));
});
