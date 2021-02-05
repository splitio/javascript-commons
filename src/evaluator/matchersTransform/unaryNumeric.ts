import { IUnaryNumericMatcherData } from '../../dtos/types';

/**
 * Extract value from unary matcher data.
 */
export default function transform(unaryNumericObject: IUnaryNumericMatcherData) {
  return unaryNumericObject.value;
}
