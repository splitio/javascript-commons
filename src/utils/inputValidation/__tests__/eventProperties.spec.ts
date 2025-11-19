import { ERROR_NOT_BOOLEAN, ERROR_NOT_PLAIN_OBJECT, ERROR_SIZE_EXCEEDED, WARN_SETTING_NULL, WARN_TRIMMING_PROPERTIES } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateEventProperties, validateImpressionsDisabled } from '../eventProperties';

function calculateSize(obj: any) {
  // we calculate the expected size.
  const keys = Object.keys(obj);
  // each string char counts as two bytes.
  const keysSize = keys.reduce((accum, key) => accum + (key.length * 2), 0);
  const valuesSize = keys.reduce((accum, key) => {
    if (obj[key] === null) return accum; // 0 for null
    if (Number.isFinite(obj[key])) return accum + 8; // 8 for numbers
    if (obj[key] === true || obj[key] === false) return accum + 4; // 4 for bool
    if (typeof obj[key] === 'string') return accum + (obj[key].length * 2);

    return accum; // Invalid props won't count towards the size, since those should had been
  }, 0);
  return keysSize + valuesSize;
}

const invalidValues = [
  [],
  () => { },
  false,
  true,
  'something',
  NaN,
  -Infinity,
  Infinity,
  new Promise(res => res),
  Symbol('asd'),
  new Map()
];

describe('INPUT VALIDATION for Event Properties', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Not setting the properties object is acceptable', () => {
    expect(validateEventProperties(loggerMock, undefined, 'some_method_eventProps')).toEqual({
      properties: null,
      size: 1024
    });
    // It should return null in replacement of undefined since it is valid with default event size.');
    expect(validateEventProperties(loggerMock, undefined, 'some_method_eventProps')).toEqual({
      properties: null,
      size: 1024
    });
    // It should return the passed null since it is valid with default event size.');

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('When setting a value for properties, only objects are acceptable', () => {

    invalidValues.forEach(val => {
      expect(validateEventProperties(loggerMock, val, 'some_method_eventProps')).toEqual({
        properties: false,
        size: 1024
      }); // It should return default size and properties false if the properties value is not an object or null/undefined.');
      expect(loggerMock.error).toBeCalledWith(ERROR_NOT_PLAIN_OBJECT, ['some_method_eventProps', 'properties']); // Should log an error.
      loggerMock.error.mockClear();
    });


    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('It should return the properties object when valid and also the correct event size', () => {
    // The events are considered to weight 1024 bytes (1kb) in average without props. Properties add to that.
    const validProperties = {
      bool: true,
      falseyBool: false,
      string: 'a string',
      number: 123,
      number2: 0.250,
      nullProp: null
    };
    const output = validateEventProperties(loggerMock, validProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: validProperties,
      size: 1024 + calculateSize(validProperties)
    });
    // It should return the properties and the event size.');

    expect(validProperties).not.toBe(output.properties); // Returned properties should be a clone.

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('It should return the properties object when valid and also the correct event size, nulling any invalid prop', () => {
    // The events are considered to weight 1024 bytes (1kb) in average without props. Properties add to that.
    const providedProperties = {
      bool: true,
      falseyBool: false,
      string: 'a string',
      number: 123,
      nullProp: null,
      willBeNulled1: function () { },
      willBeNulled2: {},
      willBeNulled3: [],
      willBeNulled4: new Map()
    };
    const output = validateEventProperties(loggerMock, providedProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: {
        ...providedProperties,
        willBeNulled1: null, willBeNulled2: null, willBeNulled3: null, willBeNulled4: null
      },
      size: 1024 + calculateSize(providedProperties)
    });
    // It should return the properties and the event size.');

    expect(providedProperties).not.toBe(output.properties); // Returned properties should be a clone.

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).toBeCalledTimes(4); // It should have logged one warning per each property of the invalid type.

    ['willBeNulled1', 'willBeNulled2', 'willBeNulled3', 'willBeNulled4'].forEach((key, index) => {
      expect(loggerMock.warn.mock.calls[index]).toEqual([WARN_SETTING_NULL, ['some_method_eventProps', key]]);
    });
  });

  test('It should log a warning if the object has more than the max amount of allowed keys, logging a warning and returning the event (if other validations pass)', () => {
    const validProperties: Record<number, any> = {};

    for (let i = 0; i < 300; i++) {
      validProperties[i] = null; // all will be null so we do not exceed the size.
    }
    let output = validateEventProperties(loggerMock, validProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: validProperties,
      size: 1024 + calculateSize(validProperties)
    });
    // It should return the properties and the event size.');

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

    // @ts-ignore
    validProperties.a = null; // Adding one prop to exceed the limit.
    output = validateEventProperties(loggerMock, validProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: validProperties,
      size: 1024 + calculateSize(validProperties)
    });
    // It should return the properties and the event size.');

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).toBeCalledWith(WARN_TRIMMING_PROPERTIES, ['some_method_eventProps']); // It should have logged a warning.
  });

  const fiveHundredChars = 'JKHSAKFJASHFJKASHSFKHAKJSGJKASGH1234567890JASHGJHASGJKAHSJKGHAJKSHGJKAHGJKASHajksghkjahsgjkhsakjghjkashgjkhagjkhajksghjkahsgjksahgjkahsgjkhasgjkhsagjkabsgjhaenjkrnjkwnqrkjnqwekjrnkjweqntkjnjkenasdjkngjksdajkghkjdasgkjnadsjgn asdkjgnkjsadngkjnasdjkngjknasdkjgnasdlgnsdakgnlkasndugbuoewqoitnwlkgadsgjdnsagubadisugboisdngklasdgndsgbjasdbgjkasbdgubuiqwetoiqhweiojtioweqhtiohqweiohtiowqehtoihewqiobtgoiqwengiowqnegionwqeogiqwneoignqiowegnioqewgnwqoiegnoiqwengiowqnegoinqwgionqwegionwqeoignqwegoinoiadnfaosignoiansgk';

  test('It should log an error and not return the properties if it exceeds the 32kb size limit', () => {
    const validProperties: Record<number, any> = {};

    for (let i = 10; i < 41; i++) {
      validProperties[i] = fiveHundredChars; // key length is two, plus 510 chars it is 512 which multiplied by the byte size of each char is 1kb each key.
    }
    // It should be right on the size limit.
    let output = validateEventProperties(loggerMock, validProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: validProperties,
      size: 1024 + calculateSize(validProperties)
    });
    // It should return the properties and the event size.');

    expect(validProperties).not.toBe(output.properties); // Returned properties should be a clone.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // Should not log any warnings.

    // @ts-ignore
    validProperties.a = null; // exceed by two bytes (1 char string key which is two bytes, null value which we count as 0 to match other SDKs)

    output = validateEventProperties(loggerMock, validProperties, 'some_method_eventProps');

    expect(output).toEqual({
      properties: false,
      size: (1024 * 32) + 2 // the two extra bytes.
    });
    // It should return false instead of the properties and the event size.');

    expect(loggerMock.warn).not.toBeCalled(); // Should not log any warnings.
    expect(loggerMock.error).toBeCalledWith(ERROR_SIZE_EXCEEDED, ['some_method_eventProps']); // Should log an error.
  });
});

describe('INPUT VALIDATION for Impressions disabled', () => {

  afterEach(() => { loggerMock.mockClear(); });

  const impressionsDisabledInvalidValues = [
    [],
    () => { },
    'something',
    NaN,
    -Infinity,
    Infinity,
    new Promise(res => res),
    Symbol('asd'),
    new Map()
  ];

  test('Not setting impressionsDisabled is acceptable', () => {
    expect(validateImpressionsDisabled(loggerMock, undefined, 'some_method_eventProps')).toBeUndefined();

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('When setting a value for impressionsDisabled, only booleans are acceptable', () => {

    impressionsDisabledInvalidValues.forEach(val => {
      expect(validateImpressionsDisabled(loggerMock, val, 'some_method_eventProps')).toBeUndefined();
      expect(loggerMock.error).toBeCalledWith(ERROR_NOT_BOOLEAN, ['some_method_eventProps', 'impressionsDisabled']); // Should log an error.
      loggerMock.error.mockClear();
    });

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('It should return the impressionsDisabled value when valid', () => {
    expect(validateImpressionsDisabled(loggerMock, true, 'some_method_eventProps')).toBeTruthy();
    expect(validateImpressionsDisabled(loggerMock, false, 'some_method_eventProps')).toBeFalsy();

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

});
