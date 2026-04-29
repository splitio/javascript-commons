import { DefinitionsCacheInMemory } from '../DefinitionsCacheInMemory';
import { IDefinition } from '../../../dtos/types';
import { splitWithUserTT, splitWithAccountTT, something, somethingElse, featureFlagWithEmptyFS, featureFlagWithoutFS, featureFlagOne, featureFlagTwo, featureFlagThree } from '../../__tests__/testUtils';

test('DEFINITIONS CACHE / In Memory', () => {
  const cache = new DefinitionsCacheInMemory();

  cache.update([something, somethingElse], [], -1);

  let values = cache.getAll();

  expect(values).toEqual([something, somethingElse]);

  cache.remove(something.name);

  const definitions = cache.getMany([something.name, somethingElse.name]);
  expect(definitions[something.name]).toEqual(null);
  expect(definitions[somethingElse.name]).toEqual(somethingElse);

  values = cache.getAll();

  expect(values).toEqual([somethingElse]);

  expect(cache.get(something.name)).toEqual(null);
  expect(cache.get(somethingElse.name)).toEqual(somethingElse);

  expect(cache.getChangeNumber()).toBe(-1);
  cache.setChangeNumber(123);
  expect(cache.getChangeNumber()).toBe(123);

});

test('DEFINITIONS CACHE / In Memory / Get Keys', () => {
  const cache = new DefinitionsCacheInMemory();

  cache.update([something, somethingElse], [], 1);

  const keys = cache.getNames();

  expect(keys.indexOf(something.name) !== -1).toBe(true);
  expect(keys.indexOf(somethingElse.name) !== -1).toBe(true);
});

test('DEFINITIONS CACHE / In Memory / Update', () => {
  const cache = new DefinitionsCacheInMemory();

  cache.update([something, somethingElse], [], 1);

  cache.update([], [something.name, somethingElse.name], 1);

  expect(cache.get(something.name)).toBe(null);
  expect(cache.get(somethingElse.name)).toBe(null);
});

test('DEFINITIONS CACHE / In Memory / trafficTypeExists and ttcache tests', () => {
  const cache = new DefinitionsCacheInMemory();

  cache.update([
    { ...splitWithUserTT, name: 'split1' },
    { ...splitWithAccountTT, name: 'split2' },
    { ...splitWithUserTT, name: 'split3' },
  ], [], 1);
  cache.add({ ...splitWithUserTT, name: 'split4' });

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('not_existent_tt')).toBe(false);

  cache.remove('split4');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);

  cache.remove('split3');
  cache.remove('split2');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.remove('split1');

  expect(cache.trafficTypeExists('user_tt')).toBe(false);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.add({ ...splitWithUserTT, name: 'split1' });
  expect(cache.trafficTypeExists('user_tt')).toBe(true);

  cache.add({ ...splitWithAccountTT, name: 'split1' });
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('user_tt')).toBe(false);

});

test('DEFINITIONS CACHE / In Memory / killLocally', () => {
  const cache = new DefinitionsCacheInMemory();
  cache.add(something);
  cache.add(somethingElse);
  const initialChangeNumber = cache.getChangeNumber();

  // kill an non-existent split
  let updated = cache.killLocally('nonexistent_split', 'other_treatment', 101);
  const nonexistentSplit = cache.get('nonexistent_split');

  expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
  expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

  // kill an existent split
  updated = cache.killLocally(something.name, 'some_treatment', 100);
  let lol1Split = cache.get(something.name) as IDefinition;

  expect(updated).toBe(true); // killLocally resolves with update if split is changed
  expect(lol1Split.killed).toBe(true); // existing split must be killed
  expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
  expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
  expect(cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

  // not update if changeNumber is old
  updated = cache.killLocally(something.name, 'some_treatment_2', 90);
  lol1Split = cache.get(something.name) as IDefinition;

  expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
  expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

});

test('DEFINITIONS CACHE / In Memory / sets cache tests', () => {
  // @ts-ignore
  const cache = new DefinitionsCacheInMemory({ groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });
  const emptySet = new Set([]);

  cache.update([
    featureFlagOne,
    featureFlagTwo,
    featureFlagThree,
  ], [], -1);
  cache.add(featureFlagWithEmptyFS);

  // Adding an existing FF should not affect the cache
  cache.update([featureFlagTwo], [], -1);

  expect(cache.getNamesBySets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cache.getNamesBySets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesBySets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cache.getNamesBySets(['t'])).toEqual([emptySet]); // 't' not in filter
  expect(cache.getNamesBySets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

  cache.add({ ...featureFlagOne, sets: ['1'] });

  expect(cache.getNamesBySets(['1'])).toEqual([emptySet]); // '1' not in filter
  expect(cache.getNamesBySets(['o'])).toEqual([new Set(['ff_two'])]);
  expect(cache.getNamesBySets(['n'])).toEqual([emptySet]);

  cache.add({ ...featureFlagOne, sets: ['x'] });
  expect(cache.getNamesBySets(['x'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesBySets(['o', 'e', 'x'])).toEqual([new Set(['ff_two']), new Set(['ff_three']), new Set(['ff_one'])]);


  cache.remove(featureFlagOne.name);
  expect(cache.getNamesBySets(['x'])).toEqual([emptySet]);

  cache.remove(featureFlagOne.name);
  expect(cache.getNamesBySets(['y'])).toEqual([emptySet]); // 'y' not in filter
  expect(cache.getNamesBySets([])).toEqual([]);

  cache.add(featureFlagWithoutFS);
  expect(cache.getNamesBySets([])).toEqual([]);

  cache.clear();
  expect(cache.getNamesBySets(['o', 'e', 'x'])).toEqual([emptySet, emptySet, emptySet]);
});

// if sets are not defined, it should store all sets in memory.
test('DEFINITIONS CACHE / In Memory / sets cache tests without filters', () => {
  const cacheWithoutFilters = new DefinitionsCacheInMemory();
  const emptySet = new Set([]);

  cacheWithoutFilters.update([
    featureFlagOne,
    featureFlagTwo,
    featureFlagThree,
  ], [], -1);
  cacheWithoutFilters.add(featureFlagWithEmptyFS);

  expect(cacheWithoutFilters.getNamesBySets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cacheWithoutFilters.getNamesBySets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cacheWithoutFilters.getNamesBySets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesBySets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesBySets(['y'])).toEqual([emptySet]);
  expect(cacheWithoutFilters.getNamesBySets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);
});
