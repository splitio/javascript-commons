import { InMemoryStorageFactory } from '../inMemory/InMemoryStorage';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

import * as dataLoader from '../dataLoader';

test('loadData & getSnapshot', () => {
  jest.spyOn(dataLoader, 'loadData');
  const onReadyFromCacheCb = jest.fn();
  // @ts-expect-error
  const serverStorage = InMemoryStorageFactory({ settings: fullSettings });
  serverStorage.splits.setChangeNumber(123); // @ts-expect-error
  serverStorage.splits.addSplits([['split1', { name: 'split1' }]]);
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
    splitsData: [{ name: 'split1' }],
    membershipsData: { [fullSettings.core.key as string]: { ms: { k: [{ n: 'segment1' }] }, ls: { k: [] } } },
    segmentsData: undefined
  });
});