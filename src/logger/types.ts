import { LogLevel } from '../types';

export interface ILoggerOptions {
  logLevel?: LogLevel,
  showLevel?: boolean,
}

export interface ILogger {
  options: ILoggerOptions

  debug(msg: string): void

  info(msg: string): void

  warn(msg: string): void

  error(msg: string): void
}
