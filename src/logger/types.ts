import { LogLevel } from '../types';

export interface ILoggerOptions {
  prefix?: string,
  logLevel?: LogLevel,
  showLevel?: boolean, // @TODO remove this param eventually since it is not being set `false` anymore
}

export interface ILogger {
  setLogLevel(logLevel: LogLevel): void

  debug(msg: any): void
  debug(msg: string | number, args?: any[]): void

  info(msg: any): void
  info(msg: string | number, args?: any[]): void

  warn(msg: any): void
  warn(msg: string | number, args?: any[]): void

  error(msg: any): void
  error(msg: string | number, args?: any[]): void
}
