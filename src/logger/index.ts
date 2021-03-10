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

export function isLogLevelString(str: string): str is LogLevel {
  return !!find(LogLevels, (lvl: string) => str === lvl);
}

function sprintf(format: string = '', args: any[] = []): string {
  var i = 0;
  return format.replace(/%s/g, function () {
    return args[i++];
  });
}

const defaultOptions = {
  logLevel: LogLevels.NONE,
  showLevel: true,
};

export class Logger implements ILogger {

  private category: string;
  public options: Required<ILoggerOptions>;
  private codes: IMap<number, string>;

  constructor(category: string, options?: ILoggerOptions, codes?: IMap<number, string>) {
    this.category = category;
    this.options = objectAssign({}, defaultOptions, options);
    this.codes = codes || new _Map();
  }

  setLogLevel(logLevel: LogLevel) {
    this.options.logLevel = logLevel;
  }

  debug(msg: string | number, args?: any[]) {
    this._log(LogLevels.DEBUG, msg, args);
  }

  info(msg: string | number, args?: any[]) {
    this._log(LogLevels.INFO, msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    this._log(LogLevels.WARN, msg, args);
  }

  error(msg: string | number, args?: any[]) {
    this._log(LogLevels.ERROR, msg, args);
  }

  private _log(level: LogLevel, text: string | number, args?: any[]) {
    if (this._shouldLog(level)) {
      if (typeof text === 'number') text = sprintf(this.codes.get(text), args);
      const formattedText = this._generateLogMessage(level, text);

      console.log(formattedText);
    }
  }

  private _generateLogMessage(level: LogLevel, text: string) {
    const textPre = ' => ';
    let result = '';

    if (this.options.showLevel) {
      result += '[' + level + ']' + (level === LogLevels.INFO || level === LogLevels.WARN ? ' ' : '') + ' ';
    }

    if (this.category) {
      result += this.category + textPre;
    }

    return result += text;
  }

  private _shouldLog(level: LogLevel) {
    const logLevel = this.options.logLevel;
    const levels = Object.keys(LogLevels).map((f) => LogLevels[f as keyof typeof LogLevels]);
    const index = levels.indexOf(level); // What's the index of what it's trying to check if it should log
    const levelIdx = levels.indexOf(logLevel); // What's the current log level index.

    return index >= levelIdx;
  }
}
