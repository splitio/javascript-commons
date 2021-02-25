import { ILogger } from './types';

export const noopLogger: ILogger = {
  d() {},
  i() {},
  w() {},
  e() {},
};
