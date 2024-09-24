import { isString } from '../../utils/lang';

export function containsStringMatcherContext(ruleAttr: string[]) {
  return function containsStringMatcher(runtimeAttr: string): boolean {
    const contains = ruleAttr.some(e => isString(runtimeAttr) && runtimeAttr.indexOf(e) > -1);

    return contains;
  };
}
