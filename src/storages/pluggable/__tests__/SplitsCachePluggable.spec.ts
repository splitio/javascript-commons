import { SplitsCachePluggable } from '../SplitsCachePluggable';
import { KeyBuilder } from '../../KeyBuilder';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMockFactory } from './wrapper.mock';
import { splitWithUserTT, splitWithAccountTT } from '../../__tests__/testUtils';

const keysBuilder = new KeyBuilder();

describe('SPLITS CACHE PLUGGABLE', () => {

  test('add/remove/get splits', async () => {
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());

    // Assert addSplit and addSplits
    await cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', splitWithAccountTT]
    ]);
    await cache.addSplit('lol3', splitWithAccountTT);

    // adding malformed or existing splits with the same definitions will not have effects
    await expect(cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', '{ /']
    ])).rejects.toBeTruthy();
    await expect(cache.addSplit('lol3', '{ /')).rejects.toBeTruthy();

    // Assert getAll
    let values = await cache.getAll();

    expect(values.length).toBe(3);
    expect(values.indexOf(splitWithUserTT) !== -1).toBe(true);
    expect(values.indexOf(splitWithAccountTT) !== -1).toBe(true);

    // Assert getSplits
    let valuesObj = await cache.getSplits(['lol2', 'lol3']);

    expect(Object.keys(valuesObj).length).toBe(2);
    expect(valuesObj.lol2).toBe(splitWithAccountTT);
    expect(valuesObj.lol3).toBe(splitWithAccountTT);

    // Assert getSplitNames
    let splitNames = await cache.getSplitNames();

    expect(splitNames.length).toBe(3);
    expect(splitNames.indexOf('lol1') !== -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);
    expect(splitNames.indexOf('lol3') !== -1).toBe(true);

    // Assert removeSplit
    await cache.removeSplit('lol1');

    values = await cache.getAll();
    expect(values.length).toBe(2);
    expect(await cache.getSplit('lol1')).toBe(null);
    expect(await cache.getSplit('lol2')).toBe(splitWithAccountTT);

    // Assert removeSplits
    await cache.addSplit('lol1', splitWithUserTT);
    await cache.removeSplits(['lol1', 'lol3']);

    values = await cache.getAll();
    expect(values.length).toBe(1);
    splitNames = await cache.getSplitNames();
    expect(splitNames.length).toBe(1);
    expect(await cache.getSplit('lol1')).toBe(null);
    expect(await cache.getSplit('lol2')).toBe(splitWithAccountTT);

  });

  test('set/get change number', async () => {
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());

    expect(await cache.getChangeNumber()).toBe(-1); // if not set yet, changeNumber is -1
    await cache.setChangeNumber(123);
    expect(await cache.getChangeNumber()).toBe(123);

  });

  test('trafficTypeExists', async () => {
    const wrapper = wrapperMockFactory();
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper);

    await cache.addSplits([
      ['split1', splitWithUserTT],
      ['split2', splitWithAccountTT],
      ['split3', splitWithUserTT],
      ['malformed', '{}']
    ]);
    await cache.addSplit('split4', splitWithUserTT);
    await cache.addSplit('split4', splitWithUserTT); // trying to add the same definition for an already added split will not have effect

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('not_existent_tt')).toBe(false);

    await cache.removeSplit('split4');

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe('1');

    await cache.removeSplits(['split3', 'split2']); // it'll invoke a loop of removeSplit

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe(null); // TT entry should be removed in the wrapper

    await cache.removeSplit('split1');

    expect(await cache.trafficTypeExists('user_tt')).toBe(false);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    await cache.addSplit('split1', splitWithUserTT);
    expect(await cache.trafficTypeExists('user_tt')).toBe(true);

    await cache.addSplit('split1', splitWithAccountTT);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('user_tt')).toBe(false);

  });

  test('killLocally', async () => {
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());

    await cache.addSplit('lol1', splitWithUserTT);
    await cache.addSplit('lol2', splitWithAccountTT);
    const initialChangeNumber = await cache.getChangeNumber();

    // kill an non-existent split
    let updated = await cache.killLocally('nonexistent_split', 'other_treatment', 101);
    const nonexistentSplit = await cache.getSplit('nonexistent_split');

    expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
    expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

    // kill an existent split
    updated = await cache.killLocally('lol1', 'some_treatment', 100);
    let lol1Split = JSON.parse(await cache.getSplit('lol1') as string);

    expect(updated).toBe(true); // killLocally resolves with update if split is changed
    expect(lol1Split.killed).toBe(true); // existing split must be killed
    expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
    expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
    expect(await cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

    // not update if changeNumber is old
    updated = await cache.killLocally('lol1', 'some_treatment_2', 90);
    lol1Split = JSON.parse(await cache.getSplit('lol1') as string);

    expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
    expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

  });

});

