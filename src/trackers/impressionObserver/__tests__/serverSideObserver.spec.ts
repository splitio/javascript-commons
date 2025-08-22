import { hashImpression128, impressionObserverSSFactory } from '../impressionObserverSS';
import { generateImpressions } from './testUtils';

test('Hasher 128 / Impression Hasher Works', () => {
  const imp1 = {
    feature: 'someFeature',
    keyName: 'someKey',
    changeNumber: 123,
    label: 'someLabel',
    treatment: 'someTreatment',
    time: 0,
  };

  // Same Impression
  const imp2 = {
    feature: 'someFeature',
    keyName: 'someKey',
    changeNumber: 123,
    label: 'someLabel',
    treatment: 'someTreatment',
    time: 0,
  };
  expect(hashImpression128(imp1)).toBe(hashImpression128(imp2));

  // Different feature
  imp2.feature = 'someOtherFeature';
  expect(hashImpression128(imp1)).not.toBe(hashImpression128(imp2));

  // Different key
  imp2.feature = imp1.feature;
  imp2.keyName = 'someOtherKey';
  expect(hashImpression128(imp1)).not.toBe(hashImpression128(imp2));

  // Different changeNumber
  imp2.keyName = imp1.keyName;
  imp2.changeNumber = 456;
  expect(hashImpression128(imp1)).not.toBe(hashImpression128(imp2));

  // Different label
  imp2.changeNumber = imp1.changeNumber;
  imp2.label = 'someOtherLabel';
  expect(hashImpression128(imp1)).not.toBe(hashImpression128(imp2));

  // Different Treatment
  imp2.label = imp1.label;
  imp2.treatment = 'someOtherTreatment';
  expect(hashImpression128(imp1)).not.toBe(hashImpression128(imp2));
});

test('Hasher 128 / Impression Hasher Does Not Crash', () => {
  const imp1 = {
    feature: 'someFeature',
    keyName: 'someKey',
    changeNumber: 123,
    label: 'someLabel',
    treatment: 'someTreatment',
    time: 0,
  };

  // @ts-ignore
  imp1.keyName = null;
  expect(hashImpression128(imp1)).not.toBe(null);

  // @ts-ignore
  imp1.changeNumber = null;
  expect(hashImpression128(imp1)).not.toBe(null);

  // @ts-ignore
  imp1.label = null;
  expect(hashImpression128(imp1)).not.toBe(null);

  // @ts-ignore
  imp1.treatment = null;
  expect(hashImpression128(imp1)).not.toBe(null);
});

test('Server-side (Node.js) / Impression Observer Basic Functionality', () => {
  const observer = impressionObserverSSFactory();

  const imp = {
    keyName: 'someKey',
    feature: 'someFeature',
    label: 'in segment all',
    changeNumber: 123,
    treatment: 'someTreatment',
    time: Date.now(),
  };

  // Add 5 new impressions so that the old one is evicted and re-try the test.
  generateImpressions(5).forEach(ki => {
    observer.testAndSet(ki);
  });

  expect(observer.testAndSet(imp)).toBe(undefined);
  expect(observer.testAndSet(imp)).toBe(imp.time);
});
