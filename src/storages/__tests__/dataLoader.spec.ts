import { InMemoryStorageFactory } from '../inMemory/InMemoryStorage';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

import * as dataLoader from '../dataLoader';

test('loadData & getSnapshot', () => {
  jest.spyOn(dataLoader, 'loadData');
  const onReadyFromCacheCb = jest.fn();
  // @ts-expect-error
  const serverStorage = InMemoryStorageFactory({ settings: fullSettings }); // @ts-expect-error
  serverStorage.splits.update([{ name: 'split1' }], [], 123);
  serverStorage.segments.update('segment1', [fullSettings.core.key as string], [], 123);

  const preloadedData = dataLoader.getSnapshot(serverStorage, [fullSettings.core.key as string]);

  // @ts-expect-error
  const clientStorage = InMemoryStorageCSFactory({ settings: { ...fullSettings, preloadedData }, onReadyFromCacheCb });

  // Assert
  expect(dataLoader.loadData).toBeCalledTimes(1);
  expect(onReadyFromCacheCb).toBeCalledTimes(1);
  expect(dataLoader.getSnapshot(clientStorage, [fullSettings.core.key as string])).toEqual(preloadedData);
  expect(preloadedData).toEqual({
    since: 123,
    flags: [{ name: 'split1' }],
    memberships: { [fullSettings.core.key as string]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } } },
    segments: undefined
  });
});
