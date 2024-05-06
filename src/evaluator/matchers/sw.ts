import { startsWith } from '../../utils/lang';

export function startsWithMatcherContext(ruleAttr: string[]) {
  return function startsWithMatcher(runtimeAttr: string): boolean {
    const matches = ruleAttr.some(e => startsWith(runtimeAttr, e));

    return matches;
  };
}
