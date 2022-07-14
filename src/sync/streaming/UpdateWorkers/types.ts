export interface IUpdateWorker {
  stop(): void // clear scheduled tasks (backoff)
  put(...args: any[]): void // handle new update event
}
