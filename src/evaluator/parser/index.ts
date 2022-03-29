import { matchersTransform } from '../matchersTransform';
import { Treatments } from '../treatments';
import { matcherFactory } from '../matchers';
import { sanitizeValue } from '../value';
import { conditionContext } from '../condition';
import { ifElseIfCombinerContext } from '../combiners/ifelseif';
import { andCombinerContext } from '../combiners/and';
import { thenable } from '../../utils/promise/thenable';
import { IEvaluator, IMatcherDto, ISplitEvaluator } from '../types';
import { ISplitCondition } from '../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';

export function parser(log: ILogger, conditions: ISplitCondition[], storage: IStorageSync | IStorageAsync): IEvaluator {
  let predicates = [];

  for (let i = 0; i < conditions.length; i++) {
    let {
      matcherGroup,
      partitions,
      label,
      conditionType
    } = conditions[i];

    // transform data structure
    const matchers = matchersTransform(matcherGroup.matchers);

    // create a set of pure functions from the matcher's dto
    const expressions = matchers.map((matcherDto: IMatcherDto) => {
      const matcher = matcherFactory(log, matcherDto, storage);

      // Evaluator function.
      return (key: string, attributes: SplitIO.Attributes | undefined, splitEvaluator: ISplitEvaluator) => {
        const value = sanitizeValue(log, key, matcherDto, attributes);
        const result = value !== undefined && matcher ? matcher(value, splitEvaluator) : false;

        if (thenable(result)) {
          // @ts-ignore
          return result.then(res => Boolean(res ^ matcherDto.negate));
        }
        // @ts-ignore
        return Boolean(result ^ matcherDto.negate);
      };
    });

    // if matcher's factory can't instanciate the matchers, the expressions array
    // will be empty
    if (expressions.length === 0) {
      // reset any data collected during parsing
      predicates = [];
      // and break the loop
      break;
    }

    predicates.push(conditionContext(
      log,
      andCombinerContext(log, expressions),
      Treatments.parse(partitions),
      label,
      conditionType
    ));
  }

  // Instanciate evaluator given the set of conditions using if else if logic
  return ifElseIfCombinerContext(log, predicates);
}
