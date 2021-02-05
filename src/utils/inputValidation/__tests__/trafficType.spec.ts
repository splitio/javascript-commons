import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { validateTrafficType } from '../trafficType';

const errorMsgs = {
  NULL_TRAFFIC_TYPE: 'you passed a null or undefined traffic_type_name, traffic_type_name must be a non-empty string.',
  WRONG_TYPE_TRAFFIC_TYPE: 'you passed an invalid traffic_type_name, traffic_type_name must be a non-empty string.',
  EMPTY_TRAFFIC_TYPE: 'you passed an empty traffic_type_name, traffic_type_name must be a non-empty string.',
  LOWERCASE_TRAFFIC_TYPE: 'traffic_type_name should be all lowercase - converting string to lowercase.'
};

const invalidTrafficTypes = [
  { tt: [], msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: () => { }, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: Object.create({}), msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: {}, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: true, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: false, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: 10, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: 0, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: NaN, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: Infinity, msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: null, msg: errorMsgs.NULL_TRAFFIC_TYPE },
  { tt: undefined, msg: errorMsgs.NULL_TRAFFIC_TYPE },
  { tt: new Promise(res => res), msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: Symbol('asd'), msg: errorMsgs.WRONG_TYPE_TRAFFIC_TYPE },
  { tt: '', msg: errorMsgs.EMPTY_TRAFFIC_TYPE }
];

const convertibleTrafficTypes = [
  'tRaFfIc_TyP3_t3S7',
  'trafficTypeTest',
  'TRAFFICTYPE'
];

describe('INPUT VALIDATION for Traffic Types', () => {

  test('Should return the provided traffic type if it is a valid string without logging any errors', () => {
    expect(validateTrafficType('traffictype', 'some_method_trafficType')).toBe('traffictype'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateTrafficType('traffic_type', 'some_method_trafficType')).toBe('traffic_type'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateTrafficType('traffic-type-23', 'some_method_trafficType')).toBe('traffic-type-23'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });

  test('Should lowercase the whole traffic type if it is a valid string with uppercases and log a warning (if those are enabled)', () => {
    for (let i = 0; i < convertibleTrafficTypes.length; i++) {
      const convertibleTrafficType = convertibleTrafficTypes[i];

      expect(validateTrafficType(convertibleTrafficType, 'some_method_trafficType')).toBe(convertibleTrafficType.toLowerCase()); // It should return the lowercase version of the traffic type received.
      expect(loggerMock.warn.mock.calls[i][0]).toEqual(`some_method_trafficType: ${errorMsgs.LOWERCASE_TRAFFIC_TYPE}`); // Should log a warning.
    }

    expect(loggerMock.error.mock.calls.length).toBe(0); // It should have not logged any errors.

    mockClear();
  });

  test('Should return false and log error if traffic type is not a valid string', () => {
    for (let i = 0; i < invalidTrafficTypes.length; i++) {
      const invalidValue = invalidTrafficTypes[i]['tt'];
      const expectedLog = invalidTrafficTypes[i]['msg'];

      expect(validateTrafficType(invalidValue, 'test_method')).toBe(false); // Invalid traffic types should always return false.
      expect(loggerMock.error.mock.calls[i][0]).toEqual(`test_method: ${expectedLog}`); // Should log the error for the invalid traffic type.
    }

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });
});
