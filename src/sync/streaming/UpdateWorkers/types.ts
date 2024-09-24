export interface IUpdateWorker<T extends any[]> {
  stop(): void // clear scheduled tasks (backoff)
  put(...args: T): void // handle new update event
}
