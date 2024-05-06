import { endsWith } from '../../utils/lang';

export function endsWithMatcherContext(ruleAttr: string[]) {
  return function endsWithMatcher(runtimeAttr: string): boolean {
    const strEndsWith = ruleAttr.some(e => endsWith(runtimeAttr, e));

    return strEndsWith;
  };
}
