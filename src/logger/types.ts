export interface ILoggerOptions {
  showLevel?: boolean,
  displayAllErrors?: boolean
}

export interface ILogger {
  d(msg: string): void

  i(msg: string): void

  w(msg: string): void

  e(msg: string): void
}
