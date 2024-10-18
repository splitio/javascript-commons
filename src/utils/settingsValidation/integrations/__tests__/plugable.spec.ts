import { validatePluggableIntegrations } from '../pluggable';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';

describe('integrations validator for pluggable integrations', () => {

  // Check different types, since `integrations` param is defined by the user
  test('Returns an empty array if `integrations` is an invalid object', () => {
    expect(validatePluggableIntegrations({ log })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: undefined })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: true })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: 123 })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: 'string' })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: {} })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: [] })).toEqual([]);
    expect(validatePluggableIntegrations({ log, integrations: [false, 0, Infinity, new Error(), []] })).toEqual([]);
  });

  test('Filters invalid integration factories from `integrations` array', () => {
    const validNoopIntFactory = () => { }; // integration with no queue handler, such as 3rdPartyAnalyticsToSplit
    const validIntFactory = () => { return { queue() { } }; }; //  integration with queue handler, such as SplitTo3rdPartyAnalytics
    const invalid = { queue() { } };

    // Integration factories that are invalid objects are removed
    expect(validatePluggableIntegrations({ log, integrations: [invalid, validNoopIntFactory, false, 0, validIntFactory, Infinity, new Error(), [], invalid] }))
      .toEqual([validNoopIntFactory, validIntFactory]);
  });

});
