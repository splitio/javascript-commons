import { ISplitCondition } from '../../../dtos/types';
import { isString } from '../../../utils/lang';

export interface IMockSplitEntry {
  treatment: string
  keys?: string[]
  config?: string
}

export function parseCondition(data: IMockSplitEntry): ISplitCondition {
  const treatment = data.treatment;

  if (data.keys) {
    return {
      conditionType: 'WHITELIST',
      matcherGroup: {
        combiner: 'AND',
        matchers: [
          {
            keySelector: null,
            matcherType: 'WHITELIST',
            negate: false,
            whitelistMatcherData: {
              whitelist: isString(data.keys) ? [data.keys] : data.keys
            }
          }
        ]
      },
      partitions: [
        {
          treatment: treatment,
          size: 100
        }
      ],
      label: `whitelisted ${treatment}`
    };
  } else {
    return {
      conditionType: 'ROLLOUT',
      matcherGroup: {
        combiner: 'AND',
        matchers: [
          {
            keySelector: null,
            matcherType: 'ALL_KEYS',
            negate: false
          }
        ]
      },
      partitions: [
        {
          treatment: treatment,
          size: 100
        }
      ],
      label: 'default rule'
    };
  }
}
