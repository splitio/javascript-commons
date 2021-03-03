import { validatePluggableIntegrations } from '../pluggable';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

describe('integrations validator for pluggable integrations', () => {

  // Check different types, since `integrations` param is defined by the user
  test('Returns an empty array if `integrations` is an invalid object', () => {
    expect(validatePluggableIntegrations(loggerMock, {})).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: undefined })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: true })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: 123 })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: 'string' })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: {} })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: [] })).toEqual([]);
    expect(validatePluggableIntegrations(loggerMock, { integrations: [false, 0, Infinity, new Error(), []] })).toEqual([]);
  });

  test('Filters invalid integration factories from `integrations` array', () => {
    const validNoopIntFactory = () => { }; // no-op integration, such as GoogleAnalyticsToSplit
    const validIntFactory = () => { return { queue() { } }; }; //  integration with queue handler, such as SplitToGoogleAnalytics
    const invalid = { queue() { } };

    // Integration factories that are invalid objects are removed
    expect(validatePluggableIntegrations(loggerMock, { integrations: [invalid, validNoopIntFactory, false, 0, validIntFactory, Infinity, new Error(), [], invalid] }))
      .toEqual([validNoopIntFactory, validIntFactory]);
  });

});
