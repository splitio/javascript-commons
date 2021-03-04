import { LogLevel } from '../types';

export interface ILoggerOptions {
  showLevel?: boolean,
  displayAllErrors?: boolean
}

export interface ILogger {
  debug(msg: string | number, args?: any[]): void

  info(msg: string | number, args?: any[]): void

  warn(msg: string | number, args?: any[]): void

  error(msg: string | number, args?: any[]): void
}

export type ICodes = { [level in LogLevel]: string[] }
