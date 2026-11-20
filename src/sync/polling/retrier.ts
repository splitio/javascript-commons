import { Backoff } from '../../utils/Backoff';

/**
 * Creates a retrier that executes a task until it succeeds, waiting with exponential backoff between attempts.
 * Used for the initial synchronization when periodic polling is disabled (i.e., `single_sync` mode), since otherwise there is no other attempt.
 *
 * @param task - Task that returns a promise that NEVER REJECTS, and resolves with `false` on failure.
 * @returns An object with a `run` method that returns a promise resolved with `true` when the task succeeds,
 * or `false` if the retrier is cancelled while retrying; and a `cancel` method that stops any pending retry.
 */
export function retrierFactory(task: () => Promise<boolean>) {

  let cancelled = false;
  const backoff = new Backoff(attempt);

  function attempt(): Promise<boolean> {
    return task().then((success) => {
      if (success) {
        backoff.reset();
        return true;
      }
      return cancelled ? false : backoff.scheduleCallAsync<boolean>();
    });
  }

  return {
    run() {
      cancelled = false;
      return attempt();
    },
    cancel() {
      cancelled = true;
      backoff.reset({ value: false });
    }
  };
}
