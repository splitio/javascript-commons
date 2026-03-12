import SplitIO from '../../types/splitio';
import { isString } from '../utils/lang';

function createConfigObject(value: any): SplitIO.Config {
  return {
    value,
    getString(propertyName: string, propertyDefaultValue?: string): string {
      const val = value != null ? value[propertyName] : undefined;
      if (typeof val === 'string') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : '';
    },
    getNumber(propertyName: string, propertyDefaultValue?: number): number {
      const val = value != null ? value[propertyName] : undefined;
      if (typeof val === 'number') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : 0;
    },
    getBoolean(propertyName: string, propertyDefaultValue?: boolean): boolean {
      const val = value != null ? value[propertyName] : undefined;
      if (typeof val === 'boolean') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : false;
    },
    getArray(propertyName: string): SplitIO.ConfigArray {
      const val = value != null ? value[propertyName] : undefined;
      return createConfigArrayObject(Array.isArray(val) ? val : []);
    },
    getObject(propertyName: string): SplitIO.Config {
      const val = value != null ? value[propertyName] : undefined;
      return createConfigObject(val != null && typeof val === 'object' && !Array.isArray(val) ? val : null);
    }
  };
}

function createConfigArrayObject(arr: any[]): SplitIO.ConfigArray {
  return {
    value: arr,
    getString(index: number, propertyDefaultValue?: string): string {
      const val = arr[index];
      if (typeof val === 'string') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : '';
    },
    getNumber(index: number, propertyDefaultValue?: number): number {
      const val = arr[index];
      if (typeof val === 'number') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : 0;
    },
    getBoolean(index: number, propertyDefaultValue?: boolean): boolean {
      const val = arr[index];
      if (typeof val === 'boolean') return val;
      return propertyDefaultValue !== undefined ? propertyDefaultValue : false;
    },
    getArray(index: number): SplitIO.ConfigArray {
      const val = arr[index];
      return createConfigArrayObject(Array.isArray(val) ? val : []);
    },
    getObject(index: number): SplitIO.Config {
      const val = arr[index];
      return createConfigObject(val != null && typeof val === 'object' && !Array.isArray(val) ? val : null);
    }
  };
}

export function parseConfig(config: string | object | null): SplitIO.Config {
  try {
    // @ts-ignore
    return createConfigObject(isString(config) ? JSON.parse(config) : config);
  } catch {
    return createConfigObject(null);
  }
}
