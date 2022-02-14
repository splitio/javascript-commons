import { LogLevel } from '../types';

export interface ILoggerOptions {
  prefix?: string,
  logLevel?: LogLevel,
  showLevel?: boolean, // @TODO remove this param eventually since it is not being set `false` anymore
}

export interface ILogger {
  setLogLevel(logLevel: LogLevel): void

  debug(msg: unknown): void
  debug(msg: string | number, args?: any[]): void

  info(msg: unknown): void
  info(msg: string | number, args?: any[]): void

  warn(msg: unknown): void
  warn(msg: string | number, args?: any[]): void

  error(msg: unknown): void
  error(msg: string | number, args?: any[]): void
}
