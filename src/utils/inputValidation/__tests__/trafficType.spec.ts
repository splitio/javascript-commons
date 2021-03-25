import { ERROR_NULL, ERROR_INVALID, ERROR_EMPTY, WARN_LOWERCASE_TRAFFIC_TYPE } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateTrafficType } from '../trafficType';

const invalidTrafficTypes = [
  { tt: [], msg: ERROR_INVALID },
  { tt: () => { }, msg: ERROR_INVALID },
  { tt: Object.create({}), msg: ERROR_INVALID },
  { tt: {}, msg: ERROR_INVALID },
  { tt: true, msg: ERROR_INVALID },
  { tt: false, msg: ERROR_INVALID },
  { tt: 10, msg: ERROR_INVALID },
  { tt: 0, msg: ERROR_INVALID },
  { tt: NaN, msg: ERROR_INVALID },
  { tt: Infinity, msg: ERROR_INVALID },
  { tt: null, msg: ERROR_NULL },
  { tt: undefined, msg: ERROR_NULL },
  { tt: new Promise(res => res), msg: ERROR_INVALID },
  { tt: Symbol('asd'), msg: ERROR_INVALID },
  { tt: '', msg: ERROR_EMPTY }
];

const convertibleTrafficTypes = [
  'tRaFfIc_TyP3_t3S7',
  'trafficTypeTest',
  'TRAFFICTYPE'
];

describe('INPUT VALIDATION for Traffic Types', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the provided traffic type if it is a valid string without logging any errors', () => {
    expect(validateTrafficType(loggerMock, 'traffictype', 'some_method_trafficType')).toBe('traffictype'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateTrafficType(loggerMock, 'traffic_type', 'some_method_trafficType')).toBe('traffic_type'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateTrafficType(loggerMock, 'traffic-type-23', 'some_method_trafficType')).toBe('traffic-type-23'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should lowercase the whole traffic type if it is a valid string with uppercases and log a warning (if those are enabled)', () => {
    for (let i = 0; i < convertibleTrafficTypes.length; i++) {
      const convertibleTrafficType = convertibleTrafficTypes[i];

      expect(validateTrafficType(loggerMock, convertibleTrafficType, 'some_method_trafficType')).toBe(convertibleTrafficType.toLowerCase()); // It should return the lowercase version of the traffic type received.
      expect(loggerMock.warn.mock.calls[i]).toEqual([WARN_LOWERCASE_TRAFFIC_TYPE, ['some_method_trafficType']]); // Should log a warning.
    }

    expect(loggerMock.error.mock.calls.length).toBe(0); // It should have not logged any errors.
  });

  test('Should return false and log error if traffic type is not a valid string', () => {
    for (let i = 0; i < invalidTrafficTypes.length; i++) {
      const invalidValue = invalidTrafficTypes[i]['tt'];
      const expectedLog = invalidTrafficTypes[i]['msg'];

      expect(validateTrafficType(loggerMock, invalidValue, 'test_method')).toBe(false); // Invalid traffic types should always return false.
      expect(loggerMock.error.mock.calls[i]).toEqual([expectedLog, ['test_method']]); // Should log the error for the invalid traffic type.
    }

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });
});
