import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';
import { validateConfigurableIntegrations } from '../configurable';


describe('integration validator for the configurable integrations', () => {

  // Check different types, since `integrations` param is defined by the user
  test('Returns an empty array if `integrations` is an invalid object', () => {
    expect(validateConfigurableIntegrations({ log }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: undefined }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: true }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: 123 }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: 'string' }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: {} }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: [] }, ['INT_TYPE'])).toEqual([]);
    expect(validateConfigurableIntegrations({ log, integrations: [false, 0, Infinity, new Error(), () => { }, []] }, ['INT_TYPE'])).toEqual([]);
  });

  test('Filters invalid integrations from `integrations` array', () => {
    const valid = {
      type: 'INT1',
    };
    const validWithOptions = {
      type: 'INT1',
      param1: 'param1',
      param2: 'param2',
    };
    const otherValidWithOptions = {
      type: 'INT2',
      param1: 'param1',
      param2: 'param2',
    };
    const invalid = {
      param3: 'param3',
    };

    // All integrations are removed if no `validIntegrationTypes` array is passed
    expect(validateConfigurableIntegrations({ log, integrations: [valid, validWithOptions, invalid] }))
      .toEqual([]);

    // Integrations that do not have the passed types are removed
    expect(validateConfigurableIntegrations({ log, integrations: [valid, validWithOptions, otherValidWithOptions, invalid] }, ['INT1']))
      .toEqual([valid, validWithOptions]);

    // Integrations that do not have the passed types or are invalid objects are removed
    expect(validateConfigurableIntegrations({ log, integrations: [invalid, valid, false, 0, validWithOptions, Infinity, new Error(), otherValidWithOptions, () => { }, [], invalid] }, ['INT1', 'INT2']))
      .toEqual([valid, validWithOptions, otherValidWithOptions]);
  });
});
