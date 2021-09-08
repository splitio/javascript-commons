// @ts-nocheck
import EventSourceMock from '../../../../__tests__/testUtils/eventSourceMock';
import { authDataSample, channelsQueryParamSample } from '../../AuthClient/__tests__/dataMocks';
import { fullSettings as settings } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { url } from '../../../../utils/settingsValidation/url';

import SSClient from '../index';

const EXPECTED_URL = url(settings, '/sse') +
  '?channels=' + channelsQueryParamSample +
  '&accessToken=' + authDataSample.token +
  '&v=1.1&heartbeats=true';

const EXPECTED_HEADERS = {
  SplitSDKClientKey: '1234',
  SplitSDKVersion: settings.version
};

test('SSClient / instance creation throws error if EventSource is not provided', () => {
  expect(() => { new SSClient(settings); }).toThrow(Error);
  expect(() => { new SSClient(settings, false, () => undefined); }).toThrow(Error);
});

test('SSClient / instance creation success if EventSource is provided', () => {
  const instance = new SSClient(settings, false, () => EventSourceMock);
  expect(instance.eventSource).toBe(EventSourceMock);
});

test('SSClient / setEventHandler, open and close methods', () => {
  // instance event handler
  const handler = {
    handleOpen: jest.fn(),
    handleError: jest.fn(),
    handleMessage: jest.fn(),
  };

  // instance SSEClient
  const instance = new SSClient(settings, false, () => EventSourceMock);
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

test('SSClient / open method: URL with metadata query params', () => {

  const instance = new SSClient(settings, false, () => EventSourceMock);
  instance.open(authDataSample);

  const EXPECTED_BROWSER_URL = EXPECTED_URL + `&SplitSDKVersion=${settings.version}&SplitSDKClientKey=${EXPECTED_HEADERS.SplitSDKClientKey}`;

  expect(instance.connection.url).toBe(EXPECTED_BROWSER_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toBe(undefined); // No headers are passed for streaming connection
});

test('SSClient / open method: URL and metadata headers with IP and Hostname', () => {

  const settingsWithRuntime = {
    ...settings,
    runtime: {
      ip: 'some ip',
      hostname: 'some hostname'
    }
  };
  const instance = new SSClient(settingsWithRuntime, true, () => EventSourceMock);
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

test('SSClient / open method: URL and metadata headers without IP and Hostname', () => {

  const instance = new SSClient(settings, true, () => EventSourceMock);
  instance.open(authDataSample);

  expect(instance.connection.url).toBe(EXPECTED_URL); // URL is properly set for streaming connection
  expect(instance.connection.__eventSourceInitDict).toEqual({ headers: EXPECTED_HEADERS }); // Headers are properly set for streaming connection
});
