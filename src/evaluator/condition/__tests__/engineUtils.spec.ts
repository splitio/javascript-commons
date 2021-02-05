import * as engineUtils from '../engineUtils';
import Treatments from '../../treatments';

const treatmentsMock = Treatments.parse([{
  treatment: 'on',
  size: 5
}, {
  treatment: 'off',
  size: 95
}]);

test('ENGINE / should always evaluate to "off"', () => {
  let seed = 467569525;
  let bucketingKey = 'aUfEsdPN1twuEjff9Sl';

  let startTime = Date.now();

  expect(engineUtils.getTreatment(bucketingKey, seed, treatmentsMock) === 'off').toBe(true); // treatment should be 'off'


  let endTime = Date.now();

  console.log(`Evaluation takes ${(endTime - startTime) / 1000} seconds`);
});

test('ENGINE / should always evaluate to "on"', () => {
  let seed = 467569525;
  let bucketingKey = 'fXvNwWFb7SXp15';

  let startTime = Date.now();

  expect(engineUtils.getTreatment(bucketingKey, seed, treatmentsMock) === 'on').toBe(true); // treatment should be 'on'

  let endTime = Date.now();

  console.log(`Evaluation takes ${(endTime - startTime) / 1000} seconds`);
});

test('ENGINE / shouldApplyRollout - trafficAllocation 100', () => {

  const shouldApplyRollout = engineUtils.shouldApplyRollout(100, 'asd', 14);

  expect(shouldApplyRollout).toBe(true); // Should return true as traffic allocation is 100.
});

test('ENGINE / shouldApplyRollout - algo murmur | trafficAllocation 53 | bucket 51', () => {

  const shouldApplyRollout = engineUtils.shouldApplyRollout(53, 'a', 29);

  expect(shouldApplyRollout).toBe(true); // Should return true as traffic allocation is 100.
});

test('ENGINE / shouldApplyRollout - algo murmur | trafficAllocation 53 | bucket 56', () => {

  const shouldApplyRollout = engineUtils.shouldApplyRollout(53, 'a', 31);

  expect(shouldApplyRollout).toBe(false); // Should return false as bucket is higher than trafficAllocation.
});

test('ENGINE / shouldApplyRollout - algo murmur | trafficAllocation 1 | bucket 1', () => {

  const shouldApplyRollout = engineUtils.shouldApplyRollout(1, 'aaaaaaklmnbv', -1667452163);

  expect(shouldApplyRollout).toBe(true); // Should return true as bucket is higher or equal than trafficAllocation.
});
