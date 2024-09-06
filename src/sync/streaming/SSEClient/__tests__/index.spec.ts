// @ts-nocheck
import EventSourceMock from '../../../../__tests__/testUtils/eventSourceMock';
import { authDataSample, channelsQueryParamSample } from '../../__tests__/dataMocks';
import { fullSettings as settings, fullSettingsServerSide as settingsServerSide } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { url } from '../../../../utils/settingsValidation/url';

import { SSEClient } from '../index';

const EXPECTED_HEADERS = {
  SplitSDKClientKey: '1234',
  SplitSDKVersion: settings.version
};

const EXPECTED_URL = url(settings, '/sse') +
  '?channels=' + channelsQueryParamSample +
  '&accessToken=' + authDataSample.token +
  '&v=1.1&heartbeats=true';

const EXPECTED_BROWSER_URL = EXPECTED_URL +
  `&SplitSDKVersion=${settings.version}&SplitSDKClientKey=${EXPECTED_HEADERS.SplitSDKClientKey}`;

test('SSClient / instance creation throws error if EventSource is not provided', () => {
  expect(() => { new SSEClient(settings); }).toThrow(Error);
  expect(() => { new SSEClient(settings, {}); }).toThrow(Error);
  expect(() => { new SSEClient(settings, { getEventSource: () => undefined }); }).toThrow(Error);
});

test('SSClient / instance creation success if EventSource is provided', () => {
  const instance = new SSEClient(settings, { getEventSource: () => EventSourceMock });
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
  const instance = new SSEClient(settings, { getEventSource: () => EventSourceMock });
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

describe('SSClient / open method on client-side', () => {

  test('metadata as query params', () => {

    const instance = new SSEClient(settings, { getEventSource: () => EventSourceMock });
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_BROWSER_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({}); // No headers are passed for streaming connection
  });

  test('custom headers', () => {
    const settingsWithGetHeaderOverrides = {
      ...settings,
      sync: {
        requestOptions: {
          getHeaderOverrides: (context) => {
            expect(context).toEqual({ headers: {} });
            context.headers['otherheader'] = 'customvalue';
            return {
              SplitSDKClientKey: '4321', // will not be overridden
              CustomHeader: 'custom-value'
            };
          }
        }
      },
    };
    const instance = new SSEClient(settingsWithGetHeaderOverrides, { getEventSource: () => EventSourceMock });
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_BROWSER_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({
      headers: {
        CustomHeader: 'custom-value'
      }
    }); // Only custom headers are passed for streaming connection
  });

});

describe('SSClient / open method on server-side', () => {

  test('metadata as headers', () => {

    const instance = new SSEClient(settingsServerSide, { getEventSource: () => EventSourceMock });
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({ headers: EXPECTED_HEADERS });
  });

  test('metadata with IP and Hostname as headers', () => {

    const settingsWithRuntime = {
      ...settingsServerSide,
      runtime: {
        ip: 'some ip',
        hostname: 'some hostname'
      }
    };
    const instance = new SSEClient(settingsWithRuntime, { getEventSource: () => EventSourceMock });
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({
      headers: {
        ...EXPECTED_HEADERS,
        SplitSDKMachineIP: settingsWithRuntime.runtime.ip,
        SplitSDKMachineName: settingsWithRuntime.runtime.hostname
      }
    });
  });

  test('metadata as headers and custom options', () => {
    const platform = { getEventSource: jest.fn(() => EventSourceMock), getOptions: jest.fn(() => ({ withCredentials: true })) };

    const instance = new SSEClient(settingsServerSide, platform);
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({ headers: EXPECTED_HEADERS, withCredentials: true }); // Headers and options are properly set for streaming connection

    // Assert that getEventSource and getOptions were called once with settings
    expect(platform.getEventSource.mock.calls).toEqual([[settingsServerSide]]);
    expect(platform.getOptions.mock.calls).toEqual([[settingsServerSide]]);
  });

  test('custom headers', () => {
    const settingsWithGetHeaderOverrides = {
      ...settingsServerSide,
      sync: {
        requestOptions: {
          getHeaderOverrides: (context) => {
            expect(context).toEqual({ headers: EXPECTED_HEADERS });
            context.headers['otherheader'] = 'customvalue';
            return {
              SplitSDKClientKey: '4321', // will not be overridden
              CustomHeader: 'custom-value'
            };
          }
        }
      },
    };
    const instance = new SSEClient(settingsWithGetHeaderOverrides, { getEventSource: () => EventSourceMock });
    instance.open(authDataSample);

    expect(instance.connection.url).toBe(EXPECTED_URL);
    expect(instance.connection.__eventSourceInitDict).toEqual({
      headers: {
        ...EXPECTED_HEADERS,
        CustomHeader: 'custom-value'
      }
    }); // SDK headers and custom headers are passed for streaming connection
  });
});
