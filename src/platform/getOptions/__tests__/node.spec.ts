import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { getOptions } from '../node';

describe('getOptions', () => {

  test('returns an object with a custom agent if all urls are https', () => {
    expect(typeof (getOptions(fullSettings) as any).agent).toBe('object');
  });

  test('returns undefined if some url is not https', () => {
    const settings = { ...fullSettings, urls: { ...fullSettings.urls, sdk: 'http://sdk.split.io' } };
    expect(getOptions(settings)).toBeUndefined();
  });

  test('returns the provided options from settings', () => {
    const customRequestOptions = { agent: false };
    const settings = { ...fullSettings, sync: { ...fullSettings.sync, requestOptions: customRequestOptions } };
    expect(getOptions(settings)).toBe(customRequestOptions);
  });

});
