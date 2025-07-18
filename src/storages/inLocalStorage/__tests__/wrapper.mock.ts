import { storageAdapter } from '..';
import SplitIO from '../../../../types/splitio';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

export const PREFIX = 'SPLITIO';

export function createMemoryStorage(): SplitIO.StorageWrapper {
  let cache: Record<string, string> = {};
  return {
    getItem(key: string) {
      return Promise.resolve(cache[key] || null);
    },
    setItem(key: string, value: string) {
      cache[key] = value;
      return Promise.resolve();
    },
    removeItem(key: string) {
      delete cache[key];
      return Promise.resolve();
    }
  };
}

export const storages = [
  localStorage,
  storageAdapter(loggerMock, PREFIX, createMemoryStorage())
];
