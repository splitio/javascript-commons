import { InMemoryStorageFactory } from '../inMemory/InMemoryStorage';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { IRBSegment, ISplit } from '../../dtos/types';

import * as dataLoader from '../dataLoader';

describe('getRolloutPlan & setRolloutPlan (client-side)', () => {
  jest.spyOn(dataLoader, 'setRolloutPlan');
  const onReadyFromCacheCb = jest.fn();
  const onReadyCb = jest.fn();

  const otherKey = 'otherKey';

  // @ts-expect-error Load server-side storage
  const serverStorage = InMemoryStorageFactory({ settings: fullSettings });
  serverStorage.splits.update([{ name: 'split1' } as ISplit], [], 123);
  serverStorage.rbSegments.update([{ name: 'rbs1' } as IRBSegment], [], 321);
  serverStorage.segments.update('segment1', [fullSettings.core.key as string, otherKey], [], 123);

  const expectedRolloutPlan = {
    splitChanges: {
      ff: { d: [{ name: 'split1' }], t: 123 },
      rbs: { d: [{ name: 'rbs1' }], t: 321 }
    },
    memberships: {
      [fullSettings.core.key as string]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } },
      [otherKey]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } }
    },
    segmentChanges: [{
      name: 'segment1',
      added: [fullSettings.core.key as string, otherKey],
      removed: [],
      till: 123
    }]
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('using preloaded data (no memberships, no segments)', () => {
    const rolloutPlan = dataLoader.getRolloutPlan(loggerMock, serverStorage);

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, initialRolloutPlan: rolloutPlan }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(2);

    expect(clientStorage.segments.getRegisteredSegments()).toEqual([]);
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual([]);

    // Get preloaded data from client-side storage
    expect(dataLoader.getRolloutPlan(loggerMock, clientStorage)).toEqual(rolloutPlan);
    expect(rolloutPlan).toEqual({ ...expectedRolloutPlan, memberships: undefined, segmentChanges: undefined });
  });

  test('using preloaded data with memberships', () => {
    const rolloutPlan = dataLoader.getRolloutPlan(loggerMock, serverStorage, { keys: [fullSettings.core.key as string, otherKey] });

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, initialRolloutPlan: rolloutPlan }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(2);

    expect(clientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);

    // Get preloaded data from client-side storage
    expect(dataLoader.getRolloutPlan(loggerMock, clientStorage, { keys: [fullSettings.core.key as string, otherKey] })).toEqual(rolloutPlan);
    expect(rolloutPlan).toEqual({ ...expectedRolloutPlan, segmentChanges: undefined });
  });

  test('using preloaded data with segments', () => {
    const rolloutPlan = dataLoader.getRolloutPlan(loggerMock, serverStorage, { exposeSegments: true });

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, initialRolloutPlan: rolloutPlan }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(2);

    expect(clientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual(['segment1']);

    expect(rolloutPlan).toEqual({ ...expectedRolloutPlan, memberships: undefined });
  });

  test('using preloaded data with memberships and segments', () => {
    const rolloutPlan = dataLoader.getRolloutPlan(loggerMock, serverStorage, { keys: [fullSettings.core.key as string], exposeSegments: true });

    // Load client-side storage with preloaded data
    const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, initialRolloutPlan: rolloutPlan }, onReadyFromCacheCb, onReadyCb });
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(1);
    expect(onReadyFromCacheCb).toBeCalledTimes(1);

    // Shared client storage
    const sharedClientStorage = clientStorage.shared!(otherKey);
    expect(dataLoader.setRolloutPlan).toBeCalledTimes(2);

    expect(clientStorage.segments.getRegisteredSegments()).toEqual(['segment1']); // main client membership is set via the rollout plan `memberships` field
    expect(sharedClientStorage.segments.getRegisteredSegments()).toEqual(['segment1']); // shared client membership is set via the rollout plan `segmentChanges` field

    expect(rolloutPlan).toEqual({ ...expectedRolloutPlan, memberships: { [fullSettings.core.key as string]: expectedRolloutPlan.memberships![fullSettings.core.key as string] } });
  });
});
