export interface ILoggerOptions {
  showLevel?: boolean,
  displayAllErrors?: boolean
}

export interface ILogger {
  debug(msg: string): void

  info(msg: string): void

  warn(msg: string): void

  error(msg: string): void
}
