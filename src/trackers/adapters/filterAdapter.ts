import { IFilter, IFilterAdapter } from '../types';

export function filterAdapterFactory(
  filter: IFilter
): IFilterAdapter {
  
  return {
    add(featureName: string, key: string) {
      return filter.add(featureName+key);
    },
    contains(featureName: string, key: string) {
      return filter.contains(featureName+key);
    },
    clear() {
      filter.clear();
    }
  };
  
}
