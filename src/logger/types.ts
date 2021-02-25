import { LogLevel } from '../types';

export interface ILoggerOptions {
  showLevel?: boolean,
  displayAllErrors?: boolean
}

export interface ILogger {
  d(msg: string | number, args?: any[]): void

  i(msg: string | number, args?: any[]): void

  w(msg: string | number, args?: any[]): void

  e(msg: string | number, args?: any[]): void
}

export type ICodes = { [level in LogLevel]: string[] }
