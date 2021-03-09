import { LogLevel } from '../types';

export interface ILoggerOptions {
  logLevel?: LogLevel,
  showLevel?: boolean,
}

export interface ILogger {
  options: ILoggerOptions

  debug(msg: string | number, args?: any[]): void

  info(msg: string | number, args?: any[]): void

  warn(msg: string | number, args?: any[]): void

  error(msg: string | number, args?: any[]): void
}
