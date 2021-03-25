// @TODO eventually migrate to JS-Node-SDK package.
import { ISignalListener } from './types';
import thenable from '../utils/promise/thenable';
import { MaybeThenable } from '../dtos/types';
import { ISettings } from '../types';
import { CLEANUP_LB, DEBUG_26, DEBUG_27 } from '../logger/constants';

const SIGTERM = 'SIGTERM';
const EVENT_NAME = 'for SIGTERM signal.';

/**
 * We'll listen for SIGTERM since it's the standard signal for server shutdown.
 *
 * If you're stopping the execution yourself via the keyboard, or by calling process.exit,
 * you should call the cleanup logic yourself, since we cannot ensure the data is sent after
 * the process is already exiting.
 */
export default class NodeSignalListener implements ISignalListener {

  constructor(
    private handler: () => MaybeThenable<void>,
    private settings: ISettings
  ) {
    this._sigtermHandler = this._sigtermHandler.bind(this);
  }

  start() {
    this.settings.log.debug(DEBUG_26, [EVENT_NAME]);
    // eslint-disable-next-line no-undef
    process.on(SIGTERM, this._sigtermHandler);
  }

  stop() {
    this.settings.log.debug(DEBUG_27, [EVENT_NAME]);
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

    this.settings.log.debug(CLEANUP_LB + 'Split SDK graceful shutdown after SIGTERM.');

    let handlerResult = null;

    try {
      handlerResult = this.handler();
    } catch (err) {
      this.settings.log.error(CLEANUP_LB + `Error with Split SDK graceful shutdown: ${err}`);
    }

    if (thenable(handlerResult)) {
      // Always exit, even with errors. The promise is returned for UT purposses.
      return handlerResult.then(wrapUp).catch(wrapUp);
    } else {
      wrapUp();
    }
  }
}
