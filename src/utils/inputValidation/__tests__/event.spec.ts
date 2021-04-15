import { ERROR_INVALID, ERROR_EMPTY, ERROR_NULL, ERROR_EVENT_TYPE_FORMAT } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateEvent } from '../event';

const invalidEvents = [
  { event: [], msg: ERROR_INVALID },
  { event: () => { }, msg: ERROR_INVALID },
  { event: false, msg: ERROR_INVALID },
  { event: true, msg: ERROR_INVALID },
  { event: {}, msg: ERROR_INVALID },
  { event: Object.create({}), msg: ERROR_INVALID },
  { event: 'something+withInvalidchars', msg: ERROR_EVENT_TYPE_FORMAT },
  { event: 'with spaces', msg: ERROR_EVENT_TYPE_FORMAT },
  { event: ' asd', msg: ERROR_EVENT_TYPE_FORMAT },
  { event: 'asd ', msg: ERROR_EVENT_TYPE_FORMAT },
  { event: '?', msg: ERROR_EVENT_TYPE_FORMAT },
  { event: '', msg: ERROR_EMPTY },
  { event: NaN, msg: ERROR_INVALID },
  { event: -Infinity, msg: ERROR_INVALID },
  { event: Infinity, msg: ERROR_INVALID },
  { event: new Promise(res => res), msg: ERROR_INVALID },
  { event: Symbol('asd'), msg: ERROR_INVALID },
  { event: null, msg: ERROR_NULL },
  { event: undefined, msg: ERROR_NULL }
];

describe('INPUT VALIDATION for Event types', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the provided event type if it is a valid string without logging any errors', () => {

    expect(validateEvent(loggerMock, 'valid:Too', 'some_method_eventType')).toBe('valid:Too'); // It should return the provided string if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(validateEvent(loggerMock, 'I.am.valid-string_ValUe', 'some_method_eventType')).toBe('I.am.valid-string_ValUe'); // It should return the provided string if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(validateEvent(loggerMock, 'a', 'some_method_eventType')).toBe('a'); // It should return the provided string if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('Should return false and log error if event type is not a valid string', () => {
    for (let i = 0; i < invalidEvents.length; i++) {
      const invalidValue = invalidEvents[i]['event'];
      const expectedLog = invalidEvents[i]['msg'];

      expect(validateEvent(loggerMock, invalidValue, 'test_method')).toBe(false); // Invalid event types should always return false.
      expect(loggerMock.error).toBeCalledWith(expectedLog, expectedLog === ERROR_EVENT_TYPE_FORMAT ? ['test_method', invalidValue] : ['test_method', 'event_type']); // Should log the error for the invalid event type.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });
});
