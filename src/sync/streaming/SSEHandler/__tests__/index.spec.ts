// @ts-nocheck
import SSEHandlerFactory from '..';
import { PUSH_SUBSYSTEM_UP, PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN, PUSH_RETRYABLE_ERROR, MY_SEGMENTS_UPDATE, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE } from '../../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

// update messages
import splitUpdateMessage from '../../../../__tests__/mocks/message.SPLIT_UPDATE.1457552620999.json';
import splitKillMessage from '../../../../__tests__/mocks/message.SPLIT_KILL.1457552650000.json';
import segmentUpdateMessage from '../../../../__tests__/mocks/message.SEGMENT_UPDATE.1457552640000.json';
import mySegmentsUpdateMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE.nicolas@split.io.1457552640000.json';

// occupancy messages
import occupancy1ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.1.control_pri.1586987434450.json';
import occupancy0ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.0.control_pri.1586987434550.json';
import occupancy2ControlPri from '../../../../__tests__/mocks/message.OCCUPANCY.2.control_pri.1586987434650.json';
const occupancy1ControlSec = { ...occupancy1ControlPri, data: occupancy1ControlPri.data.replace('control_pri', 'control_sec') };
const occupancy0ControlSec = { ...occupancy0ControlPri, data: occupancy0ControlPri.data.replace('control_pri', 'control_sec') };
const occupancy2ControlSec = { ...occupancy2ControlPri, data: occupancy2ControlPri.data.replace('control_pri', 'control_sec') };

// control messages
import controlStreamingPaused from '../../../../__tests__/mocks/message.CONTROL.STREAMING_PAUSED.control_pri.1586987434750.json';
import controlStreamingResumed from '../../../../__tests__/mocks/message.CONTROL.STREAMING_RESUMED.control_pri.1586987434850.json';
import controlStreamingDisabled from '../../../../__tests__/mocks/message.CONTROL.STREAMING_DISABLED.control_pri.1586987434950.json';
const controlStreamingPausedSec = { ...controlStreamingPaused, data: controlStreamingPaused.data.replace('control_pri', 'control_sec') };
const controlStreamingResumedSec = { ...controlStreamingResumed, data: controlStreamingResumed.data.replace('control_pri', 'control_sec') };
const controlStreamingDisabledSec = { ...controlStreamingDisabled, data: controlStreamingDisabled.data.replace('control_pri', 'control_sec') };

const pushEmitter = { emit: jest.fn() };

test('`handleOpen` and `handlerMessage` for OCCUPANCY notifications (NotificationKeeper)', () => {
  pushEmitter.emit.mockClear();
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);

  // handleOpen

  sseHandler.handleOpen();
  expect(pushEmitter.emit.mock.calls[0][0]).toBe(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on

  // OCCUPANCY messages

  sseHandler.handleMessage(occupancy1ControlPri);
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not emit PUSH_SUBSYSTEM_UP if streaming on

  sseHandler.handleMessage(occupancy0ControlPri);
  sseHandler.handleMessage(occupancy0ControlSec);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN); // must emit PUSH_SUBSYSTEM_DOWN if streaming on and OCCUPANCY 0 in both control channels

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not handle update massage if streaming off after an OCCUPANCY message

  sseHandler.handleMessage(occupancy0ControlPri);
  sseHandler.handleMessage(occupancy0ControlSec);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not emit PUSH_SUBSYSTEM_DOWN if streaming off

  sseHandler.handleMessage(occupancy1ControlPri);
  sseHandler.handleMessage(occupancy1ControlSec);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must ignore OCCUPANCY message if its timestamp is older

  sseHandler.handleMessage(occupancy2ControlSec);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP if streaming off and OCCUPANCY mayor than 0 in at least one channel

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  sseHandler.handleMessage(occupancy2ControlPri); // must not emit PUSH_SUBSYSTEM_UP, since streaming is already on
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on after an OCCUPANCY event

  expect(pushEmitter.emit).toBeCalledTimes(5); // must not emit PUSH_SUBSYSTEM_UP if streaming is already on and another channel has publishers

});

test('`handlerMessage` for CONTROL notifications (NotificationKeeper)', () => {
  pushEmitter.emit.mockClear();
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);
  sseHandler.handleOpen();

  // CONTROL messages

  sseHandler.handleMessage(controlStreamingPaused);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN); // must emit PUSH_SUBSYSTEM_DOWN if streaming on and received a STREAMING_PAUSED control message

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not handle update massage if streaming off after a CONTROL message

  sseHandler.handleMessage(controlStreamingPaused);
  sseHandler.handleMessage(controlStreamingPausedSec);
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not emit PUSH_SUBSYSTEM_DOWN if streaming off

  sseHandler.handleMessage(controlStreamingResumedSec); // testing STREAMING_RESUMED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP if streaming off and received a STREAMING_RESUMED control message');

  sseHandler.handleMessage(controlStreamingResumed);
  sseHandler.handleMessage(controlStreamingResumedSec);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not emit PUSH_SUBSYSTEM_UP if streaming on

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, 1457552620999); // must handle update massage if streaming on after a CONTROL event

  sseHandler.handleMessage(controlStreamingDisabledSec); // testing STREAMING_DISABLED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // must emit PUSH_NONRETRYABLE_ERROR if received a STREAMING_DISABLED control message

  const sseHandler2 = SSEHandlerFactory(loggerMock, pushEmitter);
  sseHandler2.handleOpen();

  sseHandler2.handleMessage(controlStreamingPausedSec); // testing STREAMING_PAUSED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN);

  sseHandler2.handleMessage(controlStreamingDisabled);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // must emit PUSH_NONRETRYABLE_ERROR if received a STREAMING_DISABLED control message, even if streaming is off

});

test('`handlerMessage` for update notifications (NotificationProcessor)', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);
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
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  const error = 'some error';
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // A network error must emit PUSH_RETRYABLE_ERROR

  const errorWithData = { data: '{ "message": "error message"}' };
  sseHandler.handleError(errorWithData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An error without Ably code must emit PUSH_RETRYABLE_ERROR

  const errorWithBadData = { data: '{"message"error"' };
  sseHandler.handleError(errorWithBadData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An error that cannot be parsed must emit PUSH_RETRYABLE_ERROR

  const ably4XXRecoverableError = { data: '{"message":"Token expired","code":40142,"statusCode":401}' };
  sseHandler.handleError(ably4XXRecoverableError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An Ably recoverable error must emit PUSH_RETRYABLE_ERROR

  const ably4XXNonRecoverableError = { data: '{"message":"Token expired","code":42910,"statusCode":429}' };
  sseHandler.handleError(ably4XXNonRecoverableError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // An Ably non-recoverable error must emit PUSH_NONRETRYABLE_ERROR

  const ably5XXError = { data: '{"message":"...","code":50000,"statusCode":500}' };
  sseHandler.handleError(ably5XXError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An Ably recoverable error must emit PUSH_RETRYABLE_ERROR

});

test('handlerMessage: ignore invalid events', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);
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

test('handleClose: ignore errors after closing', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  const error = 'some error';
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toBeCalledTimes(1); // + PUSH_SUBSYSTEM_UP, + PUSH_RETRYABLE_ERROR

  sseHandler.handleClose();
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toBeCalledTimes(1);

  sseHandler.handleOpen();
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toBeCalledTimes(3); // + PUSH_SUBSYSTEM_UP, + PUSH_RETRYABLE_ERROR

  sseHandler.handleClose();
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toBeCalledTimes(3);
});
