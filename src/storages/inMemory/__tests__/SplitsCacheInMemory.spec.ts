import { SplitsCacheInMemory } from '../SplitsCacheInMemory';
import { ISplit } from '../../../dtos/types';
import { splitWithUserTT, splitWithAccountTT, something, somethingElse } from '../../__tests__/testUtils';

test('SPLITS CACHE / In Memory', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  let values = cache.getAll();

  expect(values.indexOf(something) !== -1).toBe(true);
  expect(values.indexOf(somethingElse) !== -1).toBe(true);

  cache.removeSplit('lol1');

  const splits = cache.getSplits(['lol1', 'lol2']);
  expect(splits['lol1'] === null).toBe(true);
  expect(splits['lol2'] === somethingElse).toBe(true);

  values = cache.getAll();

  expect(values.indexOf(something) === -1).toBe(true);
  expect(values.indexOf(somethingElse) !== -1).toBe(true);

  expect(cache.getSplit('lol1') == null).toBe(true);
  expect(cache.getSplit('lol2') === somethingElse).toBe(true);

  cache.setChangeNumber(123);
  expect(cache.getChangeNumber() === 123).toBe(true);

});

test('SPLITS CACHE / In Memory / Get Keys', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  let keys = cache.getSplitNames();

  expect(keys.indexOf('lol1') !== -1).toBe(true);
  expect(keys.indexOf('lol2') !== -1).toBe(true);
});

test('SPLITS CACHE / In Memory / trafficTypeExists and ttcache tests', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplits([ // loop of addSplit
    ['split1', splitWithUserTT],
    ['split2', splitWithAccountTT],
    ['split3', splitWithUserTT],
  ]);
  cache.addSplit('split4', splitWithUserTT);

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('not_existent_tt')).toBe(false);

  cache.removeSplit('split4');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);

  cache.removeSplits(['split3', 'split2']); // it'll invoke a loop of removeSplit

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.removeSplit('split1');

  expect(cache.trafficTypeExists('user_tt')).toBe(false);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.addSplit('split1', splitWithUserTT);
  expect(cache.trafficTypeExists('user_tt')).toBe(true);

  cache.addSplit('split1', splitWithAccountTT);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('user_tt')).toBe(false);

});

test('SPLITS CACHE / In Memory / killLocally', () => {
  const cache = new SplitsCacheInMemory();
  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);
  const initialChangeNumber = cache.getChangeNumber();

  // kill an non-existent split
  let updated = cache.killLocally('nonexistent_split', 'other_treatment', 101);
  const nonexistentSplit = cache.getSplit('nonexistent_split');

  expect(updated).toBe(false); // killLocally resolves without update if split doesn\'t exist
  expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

  // kill an existent split
  updated = cache.killLocally('lol1', 'some_treatment', 100);
  let lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(true); // killLocally resolves with update if split is changed
  expect(lol1Split.killed).toBe(true); // existing split must be killed
  expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have the given default treatment
  expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
  expect(cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

  // not update if changeNumber is old
  updated = cache.killLocally('lol1', 'some_treatment_2', 90);
  lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
  expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

});
