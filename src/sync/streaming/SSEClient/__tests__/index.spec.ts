// @ts-nocheck
import EventSourceMock from '../../../../__tests__/testUtils/eventSourceMock';
import { authDataSample, channelsQueryParamSample } from '../../AuthClient/__tests__/dataMocks';

import SSClient from '../index';

const URL = 'someurl';

test('SSClient / instance creation throws error if EventSource is not provided', () => {
  expect(() => { new SSClient(URL); }).toThrow(Error);
  expect(() => { new SSClient(URL, () => undefined); }).toThrow(Error);
});

test('SSClient / instance creation success if EventSource is provided', () => {
  const instance = new SSClient(URL, () => EventSourceMock);
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
  const instance = new SSClient(URL, () => EventSourceMock);
  instance.setEventHandler(handler);

  // error on first open without authToken
  expect(instance.reopen).toThrow(Error); // throw error if reopen is invoked without a previous open call

  // open connection
  instance.open(authDataSample);
  let esconnection = instance.connection; // instance of EventSource used to mock events
  esconnection.emitOpen();
  expect(handler.handleOpen.mock.calls.length).toBe(1); // handleOpen called when connection is opened
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
  expect(handler.handleOpen.mock.calls.length).toBe(0); // handleOpen not called until open event is emitted

  // open a new connection
  instance.open(authDataSample);
  instance.connection.emitOpen();
  expect(handler.handleOpen.mock.calls.length).toBe(1); // handleOpen called when connection is open

  // reopen the connection
  handler.handleOpen.mockClear();
  instance.reopen();
  instance.connection.emitOpen();
  expect(handler.handleOpen.mock.calls.length).toBe(1); // handleOpen called if connection is reopen

  // remove event handler before opening a new connection
  handler.handleOpen.mockClear();
  instance.setEventHandler(undefined);
  instance.open(authDataSample);
  instance.connection.emitOpen();
  expect(handler.handleOpen.mock.calls.length).toBe(0); // handleOpen not called if connection is open but the handler was removed

});

test('SSClient / open method: URL', () => {

  const instance = new SSClient(URL, () => EventSourceMock);
  instance.open(authDataSample);

  const EXPECTED_URL = URL + '/sse' +
    '?channels=' + channelsQueryParamSample +
    '&accessToken=' + authDataSample.token +
    '&v=1.1&heartbeats=true';

  expect(instance.connection.url).toBe(EXPECTED_URL); // URL is properly set for streaming connection

});
