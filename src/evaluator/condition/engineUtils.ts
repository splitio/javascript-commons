import { bucket } from '../../utils/murmur3/murmur3';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine');

/**
 * Get the treatment name given a key, a seed, and the percentage of each treatment.
 */
export function getTreatment(key: string, seed: number, treatments: { getTreatmentFor: (x: number) => string }) {
  const _bucket = bucket(key, seed);

  const treatment = treatments.getTreatmentFor(_bucket);

  // log.debug(`[engine] using algo 'murmur' bucket ${_bucket} for key ${key} using seed ${seed} - treatment ${treatment}`);

  return treatment;
}

/**
 * Evaluates the traffic allocation to see if we should apply rollout conditions or not.
 */
export function shouldApplyRollout(trafficAllocation: number, key: string, trafficAllocationSeed: number) {
  // For rollout, if traffic allocation for splits is 100%, we don't need to filter it because everything should evaluate the rollout.
  if (trafficAllocation < 100) {
    const _bucket = bucket(key, trafficAllocationSeed);

    if (_bucket > trafficAllocation) {
      return false;
    }
  }
  return true;
}
