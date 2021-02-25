import { findIndex } from '../../utils/lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:combiner');
import { ILogger } from '../../logger/types';
import thenable from '../../utils/promise/thenable';
import { MaybeThenable } from '../../dtos/types';
import { IMatcher } from '../types';

export default function andCombinerContext(matchers: IMatcher[], log: ILogger) {

  function andResults(results: boolean[]): boolean {
    // Array.prototype.every is supported by target environments
    const hasMatchedAll = results.every(value => value);

    log.d(`[andCombiner] evaluates to ${hasMatchedAll}`);
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
