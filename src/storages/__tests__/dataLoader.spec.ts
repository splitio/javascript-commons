import { InMemoryStorageFactory } from '../inMemory/InMemoryStorage';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { IRBSegment, ISplit } from '../../dtos/types';

import * as dataLoader from '../dataLoader';

describe('setCache & getCache', () => {
  jest.spyOn(dataLoader, 'setCache');
  const onReadyFromCacheCb = jest.fn();
  const onReadyCb = jest.fn();

  const otherKey = 'otherKey';

  // @ts-expect-error Load server-side storage
  const serverStorage = InMemoryStorageFactory({ settings: fullSettings });
  serverStorage.splits.update([{ name: 'split1' } as ISplit], [], 123);
  serverStorage.rbSegments.update([{ name: 'rbs1' } as IRBSegment], [], 321);
  serverStorage.segments.update('segment1', [fullSettings.core.key as string, otherKey], [], 123);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('using preloaded data with memberships', () => {
    const preloadedData = dataLoader.getCache(loggerMock, serverStorage, [fullSettings.core.key as string, otherKey]);

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, preloadedData }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setCache).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setCache).toBeCalledTimes(2);

    expect(clientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);

    // Get preloaded data from client-side storage
    expect(dataLoader.getCache(loggerMock, clientStorage, [fullSettings.core.key as string, otherKey])).toEqual(preloadedData);
    expect(preloadedData).toEqual({
      since: 123,
      flags: [{ name: 'split1' }],
      rbSince: 321,
      rbSegments: [{ name: 'rbs1' }],
      memberships: {
        [fullSettings.core.key as string]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } },
        [otherKey]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } }
      },
      segments: undefined
    });
  });

  test('using preloaded data with segments', () => {
    const preloadedData = dataLoader.getCache(loggerMock, serverStorage);

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, preloadedData }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setCache).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setCache).toBeCalledTimes(2);
    expect(clientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);

    expect(preloadedData).toEqual({
      since: 123,
      flags: [{ name: 'split1' }],
      rbSince: 321,
      rbSegments: [{ name: 'rbs1' }],
      memberships: undefined,
      segments: {
        segment1: [fullSettings.core.key as string, otherKey]
      }
    });
  });
});
