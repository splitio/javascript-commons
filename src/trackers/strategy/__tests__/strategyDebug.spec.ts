import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { strategyDebugFactory } from '../strategyDebug';
import { impression1, impression2 } from './testUtils';

test.each([
  impressionObserverSSFactory(),
  impressionObserverCSFactory()]
)('strategyDebug', (impressionObserver) => {

  const strategyDebug = strategyDebugFactory(impressionObserver);

  const impressions = [{ ...impression1 },  { ...impression2 }, { ...impression1 }];

  expect(strategyDebug.process(impressions[0])).toBe(true);
  expect(impressions[0]).toEqual({ ...impression1, pt: undefined });

  expect(strategyDebug.process(impressions[1])).toBe(true);
  expect(impressions[1]).toEqual({ ...impression2, pt: undefined });

  expect(strategyDebug.process(impressions[2])).toBe(true);
  expect(impressions[2]).toEqual({ ...impression1, pt: impression1.time });
});
