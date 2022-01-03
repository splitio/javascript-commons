import { IUnaryNumericMatcherData } from '../../dtos/types';

/**
 * Extract value from unary matcher data.
 */
export function numericTransform(unaryNumericObject: IUnaryNumericMatcherData) {
  return unaryNumericObject.value;
}
