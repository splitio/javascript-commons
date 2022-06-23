// @TODO eventually migrate to JS-Node-SDK package.
import { ISignalListener } from './types';
import { thenable } from '../utils/promise/thenable';
import { MaybeThenable } from '../dtos/types';
import { ISettings } from '../types';
import { LOG_PREFIX_CLEANUP, CLEANUP_REGISTERING, CLEANUP_DEREGISTERING } from '../logger/constants';
import { ISyncManager } from '../sync/types';

const SIGTERM = 'SIGTERM';
const EVENT_NAME = 'for SIGTERM signal.';

/**
 * We'll listen for SIGTERM since it's the standard signal for server shutdown.
 *
 * If you're stopping the execution yourself via the keyboard, or by calling process.exit,
 * you should call the cleanup logic yourself, since we cannot ensure the data is sent after
 * the process is already exiting.
 */
export class NodeSignalListener implements ISignalListener {

  private handler: () => MaybeThenable<any>;
  private settings: ISettings;

  constructor(
    syncManager: ISyncManager | undefined, // private handler: () => MaybeThenable<void>,
    settings: ISettings
  ) {
    // @TODO review handler logic when implementing Node SDK
    this.handler = function () {
      if (syncManager) {
        // syncManager.stop();
        return syncManager.flush();
      }
    };
    this.settings = settings;
    this._sigtermHandler = this._sigtermHandler.bind(this);
  }

  start() {
    this.settings.log.debug(CLEANUP_REGISTERING, [EVENT_NAME]);
    // eslint-disable-next-line no-undef
    process.on(SIGTERM, this._sigtermHandler);
  }

  stop() {
    this.settings.log.debug(CLEANUP_DEREGISTERING, [EVENT_NAME]);
    // eslint-disable-next-line no-undef
    process.removeListener(SIGTERM, this._sigtermHandler);
  }

  /**
   * Call the handler, clean up listeners and emit the signal again.
   */
  private _sigtermHandler(): MaybeThenable<void> {
    const wrapUp = () => {
      // Cleaned up, remove handlers.
      this.stop();

      // This handler prevented the default behaviour, start again.
      // eslint-disable-next-line no-undef
      process.kill(process.pid, SIGTERM);
    };

    this.settings.log.debug(`${LOG_PREFIX_CLEANUP}Split SDK graceful shutdown after SIGTERM.`);

    let handlerResult = null;

    try {
      handlerResult = this.handler();
    } catch (err) {
      this.settings.log.error(`${LOG_PREFIX_CLEANUP}Error with Split SDK graceful shutdown: ${err}`);
    }

    if (thenable(handlerResult)) {
      // Always exit, even with errors. The promise is returned for UT purposses.
      return handlerResult.then(wrapUp).catch(wrapUp);
    } else {
      wrapUp();
    }
  }
}
