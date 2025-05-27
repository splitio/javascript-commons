import { validateCache } from '../validateCache';

import { KeyBuilderCS } from '../../KeyBuilderCS';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { SplitsCacheInLocal } from '../SplitsCacheInLocal';
import { nearlyEqual } from '../../../__tests__/testUtils';
import { MySegmentsCacheInLocal } from '../MySegmentsCacheInLocal';
import { RBSegmentsCacheInLocal } from '../RBSegmentsCacheInLocal';

const FULL_SETTINGS_HASH = 'dc1f9817';

describe('validateCache', () => {
  const keys = new KeyBuilderCS('SPLITIO', 'user');
  const logSpy = jest.spyOn(fullSettings.log, 'info');
  const segments = new MySegmentsCacheInLocal(fullSettings.log, keys, localStorage);
  const largeSegments = new MySegmentsCacheInLocal(fullSettings.log, keys, localStorage);
  const splits = new SplitsCacheInLocal(fullSettings, keys, localStorage);
  const rbSegments = new RBSegmentsCacheInLocal(fullSettings, keys, localStorage);

  jest.spyOn(splits, 'getChangeNumber');
  jest.spyOn(splits, 'clear');
  jest.spyOn(rbSegments, 'clear');
  jest.spyOn(segments, 'clear');
  jest.spyOn(largeSegments, 'clear');

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('if there is no cache, it should return false', async () => {
    expect(await validateCache({}, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(false);

    expect(logSpy).not.toHaveBeenCalled();

    expect(splits.clear).not.toHaveBeenCalled();
    expect(rbSegments.clear).not.toHaveBeenCalled();
    expect(segments.clear).not.toHaveBeenCalled();
    expect(largeSegments.clear).not.toHaveBeenCalled();
    expect(splits.getChangeNumber).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem(keys.buildHashKey())).toBe(FULL_SETTINGS_HASH);
    expect(localStorage.getItem(keys.buildLastClear())).toBeNull();
  });

  test('if there is cache and it must not be cleared, it should return true', async () => {
    localStorage.setItem(keys.buildSplitsTillKey(), '1');
    localStorage.setItem(keys.buildHashKey(), FULL_SETTINGS_HASH);

    expect(await validateCache({}, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(true);

    expect(logSpy).not.toHaveBeenCalled();

    expect(splits.clear).not.toHaveBeenCalled();
    expect(rbSegments.clear).not.toHaveBeenCalled();
    expect(segments.clear).not.toHaveBeenCalled();
    expect(largeSegments.clear).not.toHaveBeenCalled();
    expect(splits.getChangeNumber).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem(keys.buildHashKey())).toBe(FULL_SETTINGS_HASH);
    expect(localStorage.getItem(keys.buildLastClear())).toBeNull();
  });

  test('if there is cache and it has expired, it should clear cache and return false', async () => {
    localStorage.setItem(keys.buildSplitsTillKey(), '1');
    localStorage.setItem(keys.buildHashKey(), FULL_SETTINGS_HASH);
    localStorage.setItem(keys.buildLastUpdatedKey(), Date.now() - 1000 * 60 * 60 * 24 * 2 + ''); // 2 days ago

    expect(await validateCache({ expirationDays: 1 }, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(false);

    expect(logSpy).toHaveBeenCalledWith('storage:localstorage: Cache expired more than 1 days ago. Cleaning up cache');

    expect(splits.clear).toHaveBeenCalledTimes(1);
    expect(rbSegments.clear).toHaveBeenCalledTimes(1);
    expect(segments.clear).toHaveBeenCalledTimes(1);
    expect(largeSegments.clear).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem(keys.buildHashKey())).toBe(FULL_SETTINGS_HASH);
    expect(nearlyEqual(parseInt(localStorage.getItem(keys.buildLastClear()) as string), Date.now())).toBe(true);
  });

  test('if there is cache and its hash has changed, it should clear cache and return false', async () => {
    localStorage.setItem(keys.buildSplitsTillKey(), '1');
    localStorage.setItem(keys.buildHashKey(), FULL_SETTINGS_HASH);

    expect(await validateCache({}, localStorage, { ...fullSettings, core: { ...fullSettings.core, authorizationKey: 'another-sdk-key' } }, keys, splits, rbSegments, segments, largeSegments)).toBe(false);

    expect(logSpy).toHaveBeenCalledWith('storage:localstorage: SDK key, flags filter criteria, or flags spec version has changed. Cleaning up cache');

    expect(splits.clear).toHaveBeenCalledTimes(1);
    expect(rbSegments.clear).toHaveBeenCalledTimes(1);
    expect(segments.clear).toHaveBeenCalledTimes(1);
    expect(largeSegments.clear).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem(keys.buildHashKey())).toBe('45c6ba5d');
    expect(nearlyEqual(parseInt(localStorage.getItem(keys.buildLastClear()) as string), Date.now())).toBe(true);
  });

  test('if there is cache and clearOnInit is true, it should clear cache and return false', async () => {
    // Older cache version (without last clear)
    localStorage.setItem(keys.buildSplitsTillKey(), '1');
    localStorage.setItem(keys.buildHashKey(), FULL_SETTINGS_HASH);

    expect(await validateCache({ clearOnInit: true }, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(false);

    expect(logSpy).toHaveBeenCalledWith('storage:localstorage: clearOnInit was set and cache was not cleared in the last 24 hours. Cleaning up cache');

    expect(splits.clear).toHaveBeenCalledTimes(1);
    expect(rbSegments.clear).toHaveBeenCalledTimes(1);
    expect(segments.clear).toHaveBeenCalledTimes(1);
    expect(largeSegments.clear).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem(keys.buildHashKey())).toBe(FULL_SETTINGS_HASH);
    const lastClear = localStorage.getItem(keys.buildLastClear());
    expect(nearlyEqual(parseInt(lastClear as string), Date.now())).toBe(true);

    // If cache is cleared, it should not clear again until a day has passed
    logSpy.mockClear();
    localStorage.setItem(keys.buildSplitsTillKey(), '1');
    expect(await validateCache({ clearOnInit: true }, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(keys.buildLastClear())).toBe(lastClear); // Last clear should not have changed

    // If a day has passed, it should clear again
    localStorage.setItem(keys.buildLastClear(), (Date.now() - 1000 * 60 * 60 * 24 - 1) + '');
    expect(await validateCache({ clearOnInit: true }, localStorage, fullSettings, keys, splits, rbSegments, segments, largeSegments)).toBe(false);
    expect(logSpy).toHaveBeenCalledWith('storage:localstorage: clearOnInit was set and cache was not cleared in the last 24 hours. Cleaning up cache');
    expect(splits.clear).toHaveBeenCalledTimes(2);
    expect(rbSegments.clear).toHaveBeenCalledTimes(2);
    expect(segments.clear).toHaveBeenCalledTimes(2);
    expect(largeSegments.clear).toHaveBeenCalledTimes(2);
    expect(nearlyEqual(parseInt(localStorage.getItem(keys.buildLastClear()) as string), Date.now())).toBe(true);
  });
});
