import { definitionChangesBuilderFactory } from '../definitionChangesBuilder';
import { IDefinitionPartial } from '../types';

const partial = (treatment: string, configurations: Record<string, string> = {}) => ({ conditions: [{ partitions: [{ treatment, size: 100 }] }], configurations, trafficTypeName: 'localhost' } as unknown as IDefinitionPartial);

test('definitionChangesBuilder', () => {
  const build = definitionChangesBuilderFactory();

  // first call reports the mock, even if empty
  const empty = build({});
  expect(empty).toEqual({ d: { updated: [], removed: [], till: empty.d!.till } });

  // no changes
  expect(build({})).toEqual({});

  // added definitions are completed with default fields and no change number
  const first = build({ a: partial('on'), b: partial('on') });
  const { till } = first.d!;
  expect(till).toBeGreaterThan(empty.d!.till!);
  expect(first.d!.removed).toEqual([]);
  expect(first.d!.updated).toEqual(['a', 'b'].map(name => ({ name, status: 'ACTIVE', killed: false, trafficAllocation: 100, defaultTreatment: 'control', ...partial('on') })));

  // same content
  expect(build({ a: partial('on'), b: partial('on') })).toEqual({});

  // only modified and added definitions are updated, and missing ones are removed
  const second = build({ a: partial('on', { on: 'cfg' }), c: partial('off') });
  expect(second.d!.updated.map(d => d.name)).toEqual(['a', 'c']);
  expect(second.d!.removed).toEqual(['b']);
  expect(second.d!.till).toBeGreaterThan(till!);

  // `till` is strictly incrementing, even within the same millisecond
  const now = jest.spyOn(Date, 'now').mockReturnValue(1);
  const third = build({});
  expect(third.d!.till).toBe(second.d!.till! + 1);
  now.mockRestore();
});
