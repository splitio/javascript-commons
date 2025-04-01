import { findIndex } from '../../utils/lang';
import { ILogger } from '../../logger/types';
import { thenable } from '../../utils/promise/thenable';
import { MaybeThenable } from '../../dtos/types';
import { ISplitEvaluator } from '../types';
import { ENGINE_COMBINER_AND } from '../../logger/constants';
import SplitIO from '../../../types/splitio';

export function andCombinerContext(log: ILogger, matchers: Array<(key: SplitIO.SplitKey, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator) => MaybeThenable<boolean>>) {

  function andResults(results: boolean[]): boolean {
    // Array.prototype.every is supported by target environments
    const hasMatchedAll = results.every(value => value);

    log.debug(ENGINE_COMBINER_AND, [hasMatchedAll]);
    return hasMatchedAll;
  }

  return function andCombiner(key: SplitIO.SplitKey, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator): MaybeThenable<boolean> {
    const matcherResults = matchers.map(matcher => matcher(key, attributes, splitEvaluator));

    // If any matching result is a thenable we should use Promise.all
    if (findIndex(matcherResults, thenable) !== -1) {
      return Promise.all(matcherResults).then(andResults);
    } else {
      return andResults(matcherResults as boolean[]);
    }
  };
}
