import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateEvent } from '../event';

const errorMsgs = {
  NULL_EVENT: () => 'you passed a null or undefined event_type, event_type must be a non-empty string.',
  WRONG_TYPE_EVENT: () => 'you passed an invalid event_type, event_type must be a non-empty string.',
  EMPTY_EVENT: () => 'you passed an empty event_type, event_type must be a non-empty string.',
  WRONG_FORMAT_EVENT: (invalidEvent: any) => `you passed "${invalidEvent}", event_type must adhere to the regular expression /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/g. This means an event_type must be alphanumeric, cannot be more than 80 characters long, and can only include a dash, underscore, period, or colon as separators of alphanumeric characters.`
};

const invalidEvents = [
  { event: [], msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: () => { }, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: false, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: true, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: {}, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: Object.create({}), msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: 'something+withInvalidchars', msg: errorMsgs.WRONG_FORMAT_EVENT },
  { event: 'with spaces', msg: errorMsgs.WRONG_FORMAT_EVENT },
  { event: ' asd', msg: errorMsgs.WRONG_FORMAT_EVENT },
  { event: 'asd ', msg: errorMsgs.WRONG_FORMAT_EVENT },
  { event: '?', msg: errorMsgs.WRONG_FORMAT_EVENT },
  { event: '', msg: errorMsgs.EMPTY_EVENT },
  { event: NaN, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: -Infinity, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: Infinity, msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: new Promise(res => res), msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: Symbol('asd'), msg: errorMsgs.WRONG_TYPE_EVENT },
  { event: null, msg: errorMsgs.NULL_EVENT },
  { event: undefined, msg: errorMsgs.NULL_EVENT }
];

describe('INPUT VALIDATION for Event types', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the provided event type if it is a valid string without logging any errors', () => {

    expect(validateEvent(loggerMock, 'valid:Too', 'some_method_eventType')).toBe('valid:Too'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateEvent(loggerMock, 'I.am.valid-string_ValUe', 'some_method_eventType')).toBe('I.am.valid-string_ValUe'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateEvent(loggerMock, 'a', 'some_method_eventType')).toBe('a'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should return false and log error if event type is not a valid string', () => {
    for (let i = 0; i < invalidEvents.length; i++) {
      const invalidValue = invalidEvents[i]['event'];
      const expectedLog = invalidEvents[i]['msg'](invalidValue);

      expect(validateEvent(loggerMock, invalidValue, 'test_method')).toBe(false); // Invalid event types should always return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual(`test_method: ${expectedLog}`); // Should log the error for the invalid event type.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });
});
