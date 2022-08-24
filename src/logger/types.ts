import { LogLevel } from '../types';

export interface ILoggerOptions {
  prefix?: string,
  logLevel?: LogLevel,
  showLevel?: boolean, // @TODO remove this param eventually since it is not being set `false` anymore
}
