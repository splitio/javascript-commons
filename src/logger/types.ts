import { LogLevel } from '../types';

export interface ILoggerOptions {
  logLevel?: LogLevel,
  showLevel?: boolean,
}

export interface ILogger {
  setLogLevel(logLevel: LogLevel): void

  debug(msg: string, args?: any[]): void

  info(msg: string, args?: any[]): void

  warn(msg: string, args?: any[]): void

  error(msg: string, args?: any[]): void
}
