import { objectAssign } from '../utils/lang/objectAssign';
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

const LogLevelIndexes = {
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
  let i = 0;
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
    this.logLevel = LogLevelIndexes[this.options.logLevel];
  }

  setLogLevel(logLevel: LogLevel) {
    this.options.logLevel = logLevel;
    this.logLevel = LogLevelIndexes[logLevel];
  }

  debug(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.DEBUG)) this._log(LogLevels.DEBUG, msg, args);
  }

  info(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.INFO)) this._log(LogLevels.INFO, msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.WARN)) this._log(LogLevels.WARN, msg, args);
  }

  error(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.ERROR)) this._log(LogLevels.ERROR, msg, args);
  }

  private _log(level: LogLevel, msg: string | number, args?: any[]) {
    if (typeof msg === 'number') {
      const format = this.codes.get(msg);
      msg = format ? _sprintf(format, args) : `Message code ${msg}${args ? ', with args: ' + args.toString() : ''}`;
    } else {
      if (args) msg = _sprintf(msg, args);
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
