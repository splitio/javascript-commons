import { LogLevel } from '../types';

export interface ILoggerOptions {
  prefix?: string,
  logLevel?: LogLevel,
  showLevel?: boolean,
}

export interface ILogger {
  setLogLevel(logLevel: LogLevel): void

  debug(msg: string | number, args?: any[]): void

  info(msg: string | number, args?: any[]): void

  warn(msg: string | number, args?: any[]): void

  error(msg: string | number, args?: any[]): void
}
