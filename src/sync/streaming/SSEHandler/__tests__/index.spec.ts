// @ts-nocheck
import { SSEHandlerFactory } from '..';
import { PUSH_SUBSYSTEM_UP, PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN, PUSH_RETRYABLE_ERROR, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE, MY_SEGMENTS_UPDATE_V3, MY_LARGE_SEGMENTS_UPDATE, ControlType } from '../../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

// update messages
import splitUpdateMessage from '../../../../__tests__/mocks/message.SPLIT_UPDATE.1457552620999.json';
import splitKillMessage from '../../../../__tests__/mocks/message.SPLIT_KILL.1457552650000.json';
import segmentUpdateMessage from '../../../../__tests__/mocks/message.SEGMENT_UPDATE.1457552640000.json';

// update messages MY_SEGMENTS_UPDATE_V3
import unboundedMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE_V3.UNBOUNDED.1457552650000.json';
import boundedGzipMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE_V3.BOUNDED.GZIP.1457552651000.json';
import keylistGzipMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE_V3.KEYLIST.GZIP.1457552652000.json';
import segmentRemovalMessage from '../../../../__tests__/mocks/message.MY_SEGMENTS_UPDATE_V3.SEGMENT_REMOVAL.1457552653000.json';
import { keylists, bitmaps } from '../../__tests__/dataMocks';

// update messages MY_LARGE_SEGMENTS_UPDATE
import largeSegmentUnboundedMessage from '../../../../__tests__/mocks/message.MY_LARGE_SEGMENTS_UPDATE.UNBOUNDED.1457552650000.json';
import largeSegmentRemovalMessage from '../../../../__tests__/mocks/message.MY_LARGE_SEGMENTS_UPDATE.SEGMENT_REMOVAL.1457552653000.json';

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

// streaming reset message, from `{orgHash}_{envHash}_control` channel
import streamingReset from '../../../../__tests__/mocks/message.STREAMING_RESET.json';
import { ABLY_ERROR, NON_REQUESTED, SSE_CONNECTION_ERROR } from '../../../../utils/constants';

const pushEmitter = { emit: jest.fn() };
const telemetryTracker = { streamingEvent: jest.fn() };

test('`handleOpen` and `handlerMessage` for OCCUPANCY notifications (NotificationKeeper)', () => {
  pushEmitter.emit.mockClear();
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);

  // handleOpen

  sseHandler.handleOpen();
  expect(pushEmitter.emit.mock.calls[0][0]).toBe(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, { type: 'SPLIT_UPDATE', changeNumber: 1457552620999 }); // must handle update message if streaming on

  // OCCUPANCY messages

  sseHandler.handleMessage(occupancy1ControlPri);
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not emit PUSH_SUBSYSTEM_UP if streaming on

  sseHandler.handleMessage(occupancy0ControlPri);
  sseHandler.handleMessage(occupancy0ControlSec);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN); // must emit PUSH_SUBSYSTEM_DOWN if streaming on and OCCUPANCY 0 in both control channels

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not handle update message if streaming off after an OCCUPANCY message

  sseHandler.handleMessage(streamingReset);
  expect(pushEmitter.emit).toBeCalledTimes(4); // but must handle streaming reset message

  sseHandler.handleMessage(occupancy0ControlPri);
  sseHandler.handleMessage(occupancy0ControlSec);
  expect(pushEmitter.emit).toBeCalledTimes(4); // must not emit PUSH_SUBSYSTEM_DOWN if streaming off

  sseHandler.handleMessage(occupancy1ControlPri);
  sseHandler.handleMessage(occupancy1ControlSec);
  expect(pushEmitter.emit).toBeCalledTimes(4); // must ignore OCCUPANCY message if its timestamp is older

  sseHandler.handleMessage(occupancy2ControlSec);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP if streaming off and OCCUPANCY mayor than 0 in at least one channel

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  sseHandler.handleMessage(occupancy2ControlPri); // must not emit PUSH_SUBSYSTEM_UP, since streaming is already on

  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, { type: 'SPLIT_UPDATE', changeNumber: 1457552620999 }); // must handle update message if streaming on after an OCCUPANCY event
  sseHandler.handleMessage(streamingReset);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(ControlType.STREAMING_RESET); // must handle streaming reset
  expect(pushEmitter.emit).toBeCalledTimes(7); // must not emit PUSH_SUBSYSTEM_UP if streaming is already on and another channel has publishers
});

test('`handlerMessage` for CONTROL notifications (NotificationKeeper)', () => {
  pushEmitter.emit.mockClear();
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);
  sseHandler.handleOpen();

  // CONTROL messages

  sseHandler.handleMessage(controlStreamingPaused);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN); // must emit PUSH_SUBSYSTEM_DOWN if streaming on and received a STREAMING_PAUSED control message

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(2); // must not handle update message if streaming off after a CONTROL message

  sseHandler.handleMessage(streamingReset);
  expect(pushEmitter.emit).toBeCalledTimes(3); // but must handle streaming reset message

  sseHandler.handleMessage(controlStreamingPaused);
  sseHandler.handleMessage(controlStreamingPausedSec);
  expect(pushEmitter.emit).toBeCalledTimes(3); // must not emit PUSH_SUBSYSTEM_DOWN if streaming off

  sseHandler.handleMessage(controlStreamingResumedSec); // testing STREAMING_RESUMED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_UP); // must emit PUSH_SUBSYSTEM_UP if streaming off and received a STREAMING_RESUMED control message');

  sseHandler.handleMessage(controlStreamingResumed);
  sseHandler.handleMessage(controlStreamingResumedSec);
  expect(pushEmitter.emit).toBeCalledTimes(4); // must not emit PUSH_SUBSYSTEM_UP if streaming on

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, { type: 'SPLIT_UPDATE', changeNumber: 1457552620999 }); // must handle update message if streaming on after a CONTROL event
  sseHandler.handleMessage(streamingReset);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(ControlType.STREAMING_RESET); // must handle streaming reset

  sseHandler.handleMessage(controlStreamingDisabledSec); // testing STREAMING_DISABLED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // must emit PUSH_NONRETRYABLE_ERROR if received a STREAMING_DISABLED control message

  const sseHandler2 = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);
  sseHandler2.handleOpen();

  sseHandler2.handleMessage(controlStreamingPausedSec); // testing STREAMING_PAUSED with second region
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_SUBSYSTEM_DOWN);

  sseHandler2.handleMessage(controlStreamingDisabled);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // must emit PUSH_NONRETRYABLE_ERROR if received a STREAMING_DISABLED control message, even if streaming is off

});

test('`handlerMessage` for update notifications (NotificationProcessor) and streaming reset', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  let expectedParams = [{ type: 'SPLIT_UPDATE', changeNumber: 1457552620999 }];
  sseHandler.handleMessage(splitUpdateMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_UPDATE, ...expectedParams); // must emit SPLIT_UPDATE with the message change number

  expectedParams = [{ type: 'SPLIT_KILL', changeNumber: 1457552650000, splitName: 'whitelist', defaultTreatment: 'not_allowed' }];
  sseHandler.handleMessage(splitKillMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SPLIT_KILL, ...expectedParams); // must emit SPLIT_KILL with the message change number, split name and default treatment

  expectedParams = [{ type: 'SEGMENT_UPDATE', changeNumber: 1457552640000, segmentName: 'splitters' }];
  sseHandler.handleMessage(segmentUpdateMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(SEGMENT_UPDATE, ...expectedParams); // must emit SEGMENT_UPDATE with the message change number and segment name

  expectedParams = [{ t: 'MY_SEGMENTS_UPDATE_V3', cn: 1457552650000, c: 0, d: '', u: 0, l: [] }];
  sseHandler.handleMessage(unboundedMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_SEGMENTS_UPDATE_V3, ...expectedParams); // must emit MY_SEGMENTS_UPDATE_V3 with the message parsed data

  expectedParams = [{ t: 'MY_SEGMENTS_UPDATE_V3', cn: 1457552651000, c: 1, d: bitmaps[0].bitmapDataCompressed, u: 1, l: [] }];
  sseHandler.handleMessage(boundedGzipMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_SEGMENTS_UPDATE_V3, ...expectedParams); // must emit MY_SEGMENTS_UPDATE_V3 with the message parsed data

  expectedParams = [{ t: 'MY_SEGMENTS_UPDATE_V3', cn: 1457552652000, c: 1, d: keylists[0].keyListDataCompressed, u: 2, l: ['splitters'] }];
  sseHandler.handleMessage(keylistGzipMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_SEGMENTS_UPDATE_V3, ...expectedParams); // must emit MY_SEGMENTS_UPDATE_V3 with the message parsed data

  expectedParams = [{ t: 'MY_SEGMENTS_UPDATE_V3', cn: 1457552653000, c: 0, d: '', u: 3, l: ['splitters'] }];
  sseHandler.handleMessage(segmentRemovalMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_SEGMENTS_UPDATE_V3, ...expectedParams); // must emit MY_SEGMENTS_UPDATE_V3 with the message parsed data

  expectedParams = [{ t: 'MY_LARGE_SEGMENTS_UPDATE', cn: 1457552650000, c: 0, d: '', u: 0, l: [], i: 300, h: 1, s: 0 }];
  sseHandler.handleMessage(largeSegmentUnboundedMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_LARGE_SEGMENTS_UPDATE, ...expectedParams); // must emit MY_LARGE_SEGMENTS_UPDATE with the message parsed data

  expectedParams = [{ t: 'MY_LARGE_SEGMENTS_UPDATE', cn: 1457552653000, c: 0, d: '', u: 3, l: ['employees'] }];
  sseHandler.handleMessage(largeSegmentRemovalMessage);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(MY_LARGE_SEGMENTS_UPDATE, ...expectedParams); // must emit MY_LARGE_SEGMENTS_UPDATE with the message parsed data

  sseHandler.handleMessage(streamingReset);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(ControlType.STREAMING_RESET); // must emit STREAMING_RESET

});

test('handleError', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  const error = 'some error';
  sseHandler.handleError(error);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // A network error must emit PUSH_RETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(SSE_CONNECTION_ERROR, NON_REQUESTED);

  const errorWithData = { data: '{ "message": "error message"}' };
  sseHandler.handleError(errorWithData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An error without Ably code must emit PUSH_RETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(SSE_CONNECTION_ERROR, NON_REQUESTED);

  const errorWithBadData = { data: '{"message"error"' };
  sseHandler.handleError(errorWithBadData);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An error that cannot be parsed must emit PUSH_RETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(SSE_CONNECTION_ERROR, NON_REQUESTED);

  const ably4XXRecoverableError = { data: '{"message":"Token expired","code":40142,"statusCode":401}' };
  sseHandler.handleError(ably4XXRecoverableError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An Ably recoverable error must emit PUSH_RETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(ABLY_ERROR, 40142);

  const ably4XXNonRecoverableError = { data: '{"message":"Token expired","code":42910,"statusCode":429}' };
  sseHandler.handleError(ably4XXNonRecoverableError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_NONRETRYABLE_ERROR); // An Ably non-recoverable error must emit PUSH_NONRETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(ABLY_ERROR, 42910);

  const ably5XXError = { data: '{"message":"...","code":50000,"statusCode":500}' };
  sseHandler.handleError(ably5XXError);
  expect(pushEmitter.emit).toHaveBeenLastCalledWith(PUSH_RETRYABLE_ERROR); // An Ably recoverable error must emit PUSH_RETRYABLE_ERROR
  expect(telemetryTracker.streamingEvent).toHaveBeenLastCalledWith(ABLY_ERROR, 50000);

});

test('handlerMessage: ignore invalid events', () => {
  const sseHandler = SSEHandlerFactory(loggerMock, pushEmitter, telemetryTracker);
  sseHandler.handleOpen();
  pushEmitter.emit.mockClear();

  sseHandler.handleMessage('invalid message');
  sseHandler.handleMessage({ data: '{ data: %invalid json\'\'}' });
  expect(pushEmitter.emit).toBeCalledTimes(0); // must ignore message if invalid

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"UNSUPPORTED_TYPE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(0); // must ignore message if it has an invalid type

  sseHandler.handleMessage({ data: '{ "data": "{\\"type\\":\\"SPLIT_UPDATE\\",\\"changeNumber\\":1457552620999 }" }' });
  expect(pushEmitter.emit).toBeCalledTimes(1); // must handle message if valid

});
