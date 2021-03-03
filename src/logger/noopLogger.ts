import { ILogger } from './types';

export const noopLogger: ILogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};
