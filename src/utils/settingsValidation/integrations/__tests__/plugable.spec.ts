import { validatePluggableIntegrations } from '../pluggable';


describe('integrations validator for pluggable integrations', () => {

  // Check different types, since `integrations` param is defined by the user
  test('Returns an empty array if `integrations` is an invalid object', () => {
    expect(validatePluggableIntegrations({})).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: undefined })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: true })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: 123 })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: 'string' })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: {} })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: [] })).toEqual([]);
    expect(validatePluggableIntegrations({ integrations: [false, 0, Infinity, new Error(), []] })).toEqual([]);
  });

  test('Filters invalid integration factories from `integrations` array', () => {
    const validNoopIntFactory = () => { }; // no-op integration, such as GoogleAnalyticsToSplit
    const validIntFactory = () => { return { queue() { } }; }; //  integration with queue handler, such as SplitToGoogleAnalytics
    const invalid = { queue() { } };

    // Integration factories that are invalid objects are removed
    expect(validatePluggableIntegrations({ integrations: [invalid, validNoopIntFactory, false, 0, validIntFactory, Infinity, new Error(), [], invalid] }))
      .toEqual([validNoopIntFactory, validIntFactory]);
  });

});
