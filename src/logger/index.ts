import objectAssign from 'object-assign';
import { ILoggerOptions, ILogger } from './types';
import { find } from '../utils/lang';
import { LogLevel } from '../types';
import { IMap, _Map } from '../utils/lang/maps';

export const LogLevels: { [level: string]: LogLevel } = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE'
};

const logLevelRanks = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  NONE: 5
};

export function isLogLevelString(str: string): str is LogLevel {
  return !!find(LogLevels, (lvl: string) => str === lvl);
}

// exported for testing purposes only
export function _sprintf(format: string = '', args: any[] = []): string {
  var i = 0;
  return format.replace(/%s/g, function () {
    return args[i++];
  });
}

const defaultOptions = {
  prefix: 'splitio',
  logLevel: LogLevels.NONE,
  showLevel: true,
};

export class Logger implements ILogger {

  private options: Required<ILoggerOptions>;
  private codes: IMap<number, string>;
  private logLevel: number;

  constructor(options?: ILoggerOptions, codes?: IMap<number, string>) {
    this.options = objectAssign({}, defaultOptions, options);
    this.codes = codes || new _Map();
    this.logLevel = logLevelRanks[this.options.logLevel];
  }

  setLogLevel(logLevel: LogLevel) {
    this.options.logLevel = logLevel;
    this.logLevel = logLevelRanks[logLevel];
  }

  debug(msg: string | number, args?: any[]) {
    if (this._shouldLog(logLevelRanks.DEBUG)) this._log(LogLevels.DEBUG, msg, args);
  }

  info(msg: string | number, args?: any[]) {
    if (this._shouldLog(logLevelRanks.INFO)) this._log(LogLevels.INFO, msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    if (this._shouldLog(logLevelRanks.WARN)) this._log(LogLevels.WARN, msg, args);
  }

  error(msg: string | number, args?: any[]) {
    if (this._shouldLog(logLevelRanks.ERROR)) this._log(LogLevels.ERROR, msg, args);
  }

  _log(level: LogLevel, msg: string | number, args?: any[]) {
    if (typeof msg === 'number') {
      const format = this.codes.get(msg);
      if (format) msg = _sprintf(format, args);
      else msg = `Message code ${msg}${args ? ', with args: ' + args.toString() : ''}`;
    }
    const formattedText = this._generateLogMessage(level, msg);

    console.log(formattedText);
  }

  private _generateLogMessage(level: LogLevel, text: string) {
    const textPre = ' => ';
    let result = '';

    if (this.options.showLevel) {
      result += '[' + level + ']' + (level === LogLevels.INFO || level === LogLevels.WARN ? ' ' : '') + ' ';
    }

    if (this.options.prefix) {
      result += this.options.prefix + textPre;
    }

    return result += text;
  }

  private _shouldLog(level: number) {
    return level >= this.logLevel;
  }
}
