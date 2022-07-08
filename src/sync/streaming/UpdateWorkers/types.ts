export interface IUpdateWorker {
  reset(): void // clear scheduled tasks (backoff)
  put(...args: any[]): void // handle new update event
}
