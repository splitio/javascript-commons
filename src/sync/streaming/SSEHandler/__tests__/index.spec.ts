// @ts-nocheck
import SSEHandlerFactory from '..';
import { PUSH_CONNECT, PUSH_DISABLED, PUSH_DISCONNECT, SSE_ERROR, MY_SEGMENTS_UPDATE, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE } from '../../constants';

// update messages
import splitUpdateMessage from '../../../../__tests__/mocks/message.SPLIT_UPDATE.1457552620999.json';
import splitKillMessage from '../../../../__tests__/mocks/message.SPLIT_KILL.1457552650000.json';
import segmentUpdateMessage from '../../../../__tests__/mocks/message.SEGMENT_UPDATE.1457552640000.json';
import mySegmentsUpdateMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE.nicolas@split.io.1457552640000.json';

// occupancy messages
import occupancy1ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.1.control_pri.1586987434450.json';
import occupancy0ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.0.control_pri.1586987434550.json';
import occupancy2ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.2.control_pri.1586987434650.json';

// control messages
import controlStreamingPaused from '../../../../__tests__/mocks/message.CONTROL.STREAMING_PAUSED.control_pri.1586987434750.json';
import controlStreamingResumed from '../../../../__tests__/mocks/message.CONTROL.STREAMING_RESUMED.control_pri.1586987434850.json';
import controlStreamingDisabled from '../../../../__tests__/mocks/message.CONTROL.STREAMING_DISABLED.control_pri.1586987434950.json';

const pushEmitter = { emit: jest.fn() };

test('`handleOpen` and `handlerMessage` for CONTROL and OCCUPANCY notifications (NotificationKeeper)', () => {
  pushEmitter.emit.mockClear();
  const sseHandler = SSEHandlerFactory(pushEmitter);

  // handleOpen

  sseHandler.handleOpen();
  expect(pushEmitter.emit.mock.calls[0][0]).toBe(PUSH_CONNECT); // must emit PUSH_CONNECT

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on

  // OCCUPANCY messages

  sseHandler.handleMessage(occupancy1ControlPri);
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not emit PUSH_CONNECT if streaming on

  sseHandler.handleMessage(occupancy0ControlPri);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_DISCONNECT); // must emit PUSH_DISCONNECT if streaming on and OCCUPANCY 0 in control_pri

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not handle update massage if streaming off after an OCCUPANCY message

  sseHandler.handleMessage(occupancy0ControlPri);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not emit PUSH_DISCONNECT if streaming off

  sseHandler.handleMessage(occupancy1ControlPri);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must ignore OCCUPANCY message if its timestamp is older

  sseHandler.handleMessage(occupancy2ControlPri);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_CONNECT); // must emit PUSH_CONNECT if streaming off and OCCUPANCY mayor than 0 in control_pri

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on after an OCCUPANCY event

  // CONTROL messages

  sseHandler.handleMessage(controlStreamingPaused);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_DISCONNECT); // must emit PUSH_DISCONNECT if streaming on and received a STREAMING_PAUSED control message

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(6); // must not handle update massage if streaming off after a CONTROL message

  sseHandler.handleMessage(controlStreamingPaused);
  expect(pushEmitter.emit).toBeCalledTimes(6); // must not emit PUSH_DISCONNECT if streaming off

  sseHandler.handleMessage(controlStreamingResumed);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_CONNECT); // must emit PUSH_CONNECT if streaming off and received a STREAMING_RESUMED control message

  sseHandler.handleMessage(controlStreamingResumed);
  expect(pushEmitter.emit).toBeCalledTimes(7); // must not emit PUSH_CONNECT if streaming on

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on after a CONTROL event

  sseHandler.handleMessage(controlStreamingDisabled);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_DISABLED); // must emit PUSH_DISABLED if received a STREAMING_RESUMED control message

  const sseHandler2 = SSEHandlerFactory(pushEmitter);
  sseHandler2.handleOpen();

  sseHandler2.handleMessage(controlStreamingPaused);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_DISCONNECT);

  sseHandler2.handleMessage(controlStreamingDisabled);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_DISABLED); // must emit PUSH_DISABLED if received a STREAMING_RESUMED control message, even if streaming is off

});

test('`handlerMessage` for update notifications (NotificationProcessor)', () => {
  const sseHandler = SSEHandlerFactory(pushEmitter);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  let expectedParams = [1457552620999];
  sseHandler.handleMessage(splitUpdateMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, ...expectedParams); // must emit SPLIT_UPDATE with the message change number

  expectedParams = [1457552650000, 'whitelist', 'not_allowed'];
  sseHandler.handleMessage(splitKillMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_KILL, ...expectedParams); // must emit SPLIT_KILL with the message change number, split name and default treatment

  expectedParams = [1457552640000, 'splitters'];
  sseHandler.handleMessage(segmentUpdateMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SEGMENT_UPDATE, ...expectedParams); // must emit SEGMENT_UPDATE with the message change number and segment name

  expectedParams = [{ type: MY_SEGMENTS_UPDATE, changeNumber: 1457552640000, includesPayload: false }, 'NzM2MDI5Mzc0_NDEzMjQ1MzA0Nw==_NTcwOTc3MDQx_mySegments'];
  sseHandler.handleMessage(mySegmentsUpdateMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_SEGMENTS_UPDATE, ...expectedParams); // must emit MY_SEGMENTS_UPDATE with the message parsed data and channel

});

test('handleError', () => {
  const sseHandler = SSEHandlerFactory(pushEmitter);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  const error = 'some error';
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SSE_ERROR, error); // must emit ZSSE_ERROR with given error

  const errorWithData = { data: '{ "message": "error message"}' };
  sseHandler.handleError(errorWithData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SSE_ERROR,
    { data: errorWithData.data, parsedData: JSON.parse(errorWithData.data) }); // must emit SSE_ERROR with given error and parsed data

  const errorWithBadData = { data: '{"message"error"' };
  sseHandler.handleError(errorWithBadData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SSE_ERROR,
    { data: errorWithBadData.data }); // must emit SSE_ERROR with given error and not parsed data if cannot be parsed

});

test('handlerMessage: ignore invalid events', () => {
  const sseHandler = SSEHandlerFactory(pushEmitter);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  sseHandler.handleMessage('invalid message');
  sseHandler.handleMessage({ data: '{ data: %invalid json\'\'}' });
  expect(pushEmitter.emit).toBeCalledTimes(0); // must ignore massage if invalid

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"UNSUPPORTED_TYPE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(0); // must ignore massage if it has an invalid type

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(1); // must handle massage if valid

});
