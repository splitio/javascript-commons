import { clientAttributesDecoration } from '../clientAttributesDecoration';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

// mocked methods return the provided attributes object (2nd argument), to assert that it was properly passed
const clientMock = {
  getTreatment(maybeKey: any, maybeFeatureFlagName: string, maybeAttributes?: any) {
    return maybeAttributes;
  },
  getTreatmentWithConfig(maybeKey: any, maybeFeatureFlagName: string, maybeAttributes?: any) {
    return maybeAttributes;
  },
  getTreatments(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any) {
    return maybeAttributes;
  },
  getTreatmentsWithConfig(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any) {
    return maybeAttributes;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreatmentsByFlagSets(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any, maybeFlagSetNames?: string[] | undefined) {
    return maybeAttributes;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreatmentsWithConfigByFlagSets(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any, maybeFlagSetNames?: string[] | undefined) {
    return maybeAttributes;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreatmentsByFlagSet(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any, maybeFlagSetName?: string | undefined) {
    return maybeAttributes;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreatmentsWithConfigByFlagSet(maybeKey: any, maybeFeatureFlagNames: string[], maybeAttributes?: any, maybeFlagSetName?: string | undefined) {
    return maybeAttributes;
  }
};
// @ts-expect-error
const client = clientAttributesDecoration(loggerMock, clientMock);

test('ATTRIBUTES DECORATION / storage', () => {

  client.setAttribute('attributeName1', 'attributeValue1');
  client.setAttribute('attributeName2', 'attributeValue2');

  expect(client.getAttributes()).toEqual({ attributeName1: 'attributeValue1', attributeName2: 'attributeValue2' }); // It should be equal

  client.removeAttribute('attributeName1');
  client.setAttribute('attributeName2', 'newAttributeValue2');

  expect(client.getAttribute('attributeName1')).toEqual(undefined); // It should throw undefined
  expect(client.getAttribute('attributeName2')).toEqual('newAttributeValue2'); // It should be equal

  expect(client.setAttributes({
    'attributeName3': 'attributeValue3',
    'attributeName4': 'attributeValue4'
  })).toEqual(true); // @ts-ignore
  expect(client.setAttributes(undefined)).toEqual(false); // @ts-ignore
  expect(client.setAttributes(null)).toEqual(false);

  expect(client.getAttributes()).toEqual({ attributeName2: 'newAttributeValue2', attributeName3: 'attributeValue3', attributeName4: 'attributeValue4' }); // It should be equal

  expect(client.clearAttributes()).toEqual(true);

  expect(Object.keys(client.getAttributes()).length).toEqual(0); // It should be zero after clearing attributes

});


describe('ATTRIBUTES DECORATION / validation', () => {

  beforeEach(() => {
    loggerMock.mockClear();
  });

  test('Should return true if it is a valid attributes map without logging any errors and warnings', () => {
    const validAttributes = { amIvalid: 'yes', 'are_you_sure': true, howMuch: 10, 'spell': ['1', '0'] };

    expect(client.setAttributes(validAttributes)).toEqual(true); // It should return true if it is valid.
    expect(client.getAttributes()).toEqual(validAttributes); // It should be the same.
    expect(client.setAttribute('attrKey', 'attrValue')).toEqual(true); // It should return true.
    expect(client.getAttribute('attrKey')).toEqual('attrValue'); // It should return true.

    expect(client.removeAttribute('attrKey')).toEqual(true); // It should return true.
    expect(client.getAttributes()).toEqual(validAttributes); // It should be equal to the first set.

    expect(client.clearAttributes()).toEqual(true);

    expect(Object.keys(client.getAttributes()).length).toEqual(0); // It should be zero after clearing attributes

    expect(loggerMock.error).not.toBeCalled(); // no error logs
    expect(loggerMock.warn).not.toBeCalled(); // no warning logs
  });

  test('Should return false if it is an invalid attributes map', () => {
    expect(client.setAttribute('', 'attributeValue')).toEqual(false); // It should be invalid if the attribute key is not a string
    // @ts-expect-error
    expect(client.setAttribute('attributeKey1', new Date())).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
    // @ts-expect-error
    expect(client.setAttribute('attributeKey2', { 'some': 'object' })).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
    expect(client.setAttribute('attributeKey3', Infinity)).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.

    expect(client.clearAttributes()).toEqual(true);

    let values = client.getAttributes();

    expect(Object.keys(values).length).toEqual(0); // It should be zero after clearing attributes

    let attributes = {
      'attributeKey': 'attributeValue',
      '': 'attributeValue'
    };

    expect(client.setAttributes(attributes)).toEqual(false); // @ts-ignore // It should be invalid if the attribute key is not a string
    expect(client.setAttributes(undefined)).toEqual(false); // @ts-ignore // It should be invalid if the attributes param is nullish. Doesn't log an error
    expect(client.setAttributes(null)).toEqual(false); // @ts-ignore // It should be invalid if the attributes param is nullish. Doesn't log an error
    expect(client.setAttributes('invalid')).toEqual(false); // It should be invalid if the attributes param is not an object

    expect(Object.keys(client.getAttributes()).length).toEqual(0); // It should be zero after trying to add an invalid attribute

    expect(client.clearAttributes()).toEqual(true);

    expect(loggerMock.error).toBeCalledTimes(1); // error logs
    expect(loggerMock.warn).toBeCalledTimes(5); // warning logs
  });

  test('Should return true if attributes map is valid', () => {
    const validAttributes = {
      'attributeKey1': 'attributeValue',
      'attributeKey2': ['attribute', 'value'],
      'attributeKey3': 25,
      'attributeKey4': false
    };

    expect(client.setAttribute('attributeKey1', 'attributeValue')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(client.setAttribute('attributeKey2', ['attribute', 'value'])).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(client.setAttribute('attributeKey3', 25)).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(client.setAttribute('attributeKey4', false)).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(client.setAttribute('attributeKey5', Date.now())).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.

    expect(client.removeAttribute('attributeKey5')).toEqual(true); // It should be capable of remove the attribute with that name
    expect(client.getAttributes()).toEqual(validAttributes); // It should had stored every valid attributes.

    expect(client.clearAttributes()).toEqual(true);

    expect(client.setAttributes(validAttributes)).toEqual(true); // It should add them all because they are valid attributes.
    expect(client.getAttributes()).toEqual(validAttributes); // It should had stored every valid attributes.

    expect(client.clearAttributes()).toEqual(true);

    expect(loggerMock.error).toBeCalledTimes(0); // no error logs
    expect(loggerMock.warn).toBeCalledTimes(0); // no warning logs
  });

});

describe('ATTRIBUTES DECORATION / evaluation', () => {

  test('Evaluation attributes logic and precedence / getTreatment', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatment('key', 'split')).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatment('key', 'split', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatment('key', 'split', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatment('key', 'split', null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatment('key', 'split', { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatment('key', 'split', { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatment('key', 'split', null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatment('key', 'split')).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.clearAttributes()).toEqual(true);

  });

  test('Evaluation attributes logic and precedence / getTreatments', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatments('key', ['split'])).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatments('key', ['split'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatments('key', ['split'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatments('key', ['split'], null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatments('key', ['split'], { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatments('key', ['split'], { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatments('key', ['split'], null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatments('key', ['split'])).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.clearAttributes()).toEqual(true);

  });

  test('Evaluation attributes logic and precedence / getTreatmentWithConfig', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentWithConfig('key', 'split')).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentWithConfig('key', 'split', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentWithConfig('key', 'split', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentWithConfig('key', 'split', null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentWithConfig('key', 'split', { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentWithConfig('key', 'split', { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentWithConfig('key', 'split', null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentWithConfig('key', 'split')).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.clearAttributes()).toEqual(true);

  });

  test('Evaluation attributes logic and precedence / getTreatmentsWithConfig', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentsWithConfig('key', ['split'])).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentsWithConfig('key', ['split'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentsWithConfig('key', ['split'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfig('key', ['split'], null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentsWithConfig('key', ['split'], { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentsWithConfig('key', ['split'], { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfig('key', ['split'], null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentsWithConfig('key', ['split'])).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    client.clearAttributes();

  });

  test('Evaluation attributes logic and precedence / getTreatmentsByFlagSets', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentsByFlagSets('key', ['set'])).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentsByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentsByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsByFlagSets('key', ['set'], null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentsByFlagSets('key', ['set'], { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentsByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsByFlagSets('key', ['set'], null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentsByFlagSets('key', ['set'])).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    client.clearAttributes();

  });

  test('Evaluation attributes logic and precedence / getTreatmentsWithConfigByFlagSets', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'])).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'], null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentsWithConfigByFlagSets('key', ['set'])).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    client.clearAttributes();

  });

  test('Evaluation attributes logic and precedence / getTreatmentsByFlagSet', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentsByFlagSet('key', 'set')).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentsByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentsByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsByFlagSet('key', 'set', null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentsByFlagSet('key', 'set', { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentsByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsByFlagSet('key', 'set', null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentsByFlagSet('key', 'set')).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    client.clearAttributes();

  });

  test('Evaluation attributes logic and precedence / getTreatmentsWithConfigByFlagSet', () => {

    // If the same attribute is “cached” and provided on the function, the value received on the function call takes precedence.
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set')).toEqual(undefined); // Nothing changes if no attributes were provided using the new api
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Nothing changes if no attributes were provided using the new api
    expect(client.getAttributes()).toEqual({}); // Attributes in memory storage must be empty
    client.setAttribute('func_attr_bool', false);
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false }); // In memory attribute storage must have the unique stored attribute
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true' })).toEqual({ func_attr_bool: true, func_attr_str: 'true' }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', null)).toEqual({ func_attr_bool: false }); // API attributes should be kept in memory and use for evaluations
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', { func_attr_str: 'true' })).toEqual({ func_attr_bool: false, func_attr_str: 'true' }); // API attributes should be kept in memory and use for evaluations
    client.setAttributes({ func_attr_str: 'false' });
    expect(client.getAttributes()).toEqual({ 'func_attr_bool': false, 'func_attr_str': 'false' }); // In memory attribute storage must have two stored attributes
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', { func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 })).toEqual({ func_attr_bool: true, func_attr_str: 'true', func_attr_number: 1 }); // Function attributes has precedence against api ones
    // @ts-ignore
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set', null)).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    expect(client.getTreatmentsWithConfigByFlagSet('key', 'set')).toEqual({ func_attr_bool: false, func_attr_str: 'false' }); // If the getTreatment function is called without attributes, stored attributes will be used to evaluate.
    client.clearAttributes();

  });

});
