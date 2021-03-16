import { findIndex } from '../../utils/lang';
import { ILogger } from '../../logger/types';
import thenable from '../../utils/promise/thenable';
import { MaybeThenable } from '../../dtos/types';
import { IMatcher } from '../types';
import { DEBUG_0 } from '../../logger/constants';

export default function andCombinerContext(log: ILogger, matchers: IMatcher[]) {

  function andResults(results: boolean[]): boolean {
    // Array.prototype.every is supported by target environments
    const hasMatchedAll = results.every(value => value);

    log.debug(DEBUG_0, [hasMatchedAll]);
    return hasMatchedAll;
  }

  return function andCombiner(...params: any): MaybeThenable<boolean> {
    const matcherResults = matchers.map(matcher => matcher(...params));

    // If any matching result is a thenable we should use Promise.all
    if (findIndex(matcherResults, thenable) !== -1) {
      return Promise.all(matcherResults).then(andResults);
    } else {
      return andResults(matcherResults as boolean[]);
    }
  };
}
