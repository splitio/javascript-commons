import SplitIO from '../../types/splitio';

export interface ILoggerOptions {
  prefix?: string;
  logLevel?: SplitIO.LogLevel;
}

export interface ILogger extends SplitIO.ILogger {
  setLogger(logger?: SplitIO.Logger): void;

  debug(msg: any): void;
  debug(msg: string | number, args?: any[]): void;

  info(msg: any): void;
  info(msg: string | number, args?: any[]): void;

  warn(msg: any): void;
  warn(msg: string | number, args?: any[]): void;

  error(msg: any): void;
  error(msg: string | number, args?: any[]): void;
}
