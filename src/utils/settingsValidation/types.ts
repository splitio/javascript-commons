import { ISettings } from '../../types';

/**
 * Parameters used to specialize the settings validation for each API variant
 * (client-side, server-side) and environment (Node server, Browser, etc)
 */
export interface ISettingsValidationParams {
  /**
   * Object of values to overwrite base settings.
   * Version and startup properties are required, because they are not defined in the base settings.
   */
  defaults: Partial<ISettings> & { version: string } & { startup: ISettings['startup'] },
  /** If true, validates core.key */
  acceptKey?: boolean,
  /** If true, validates core.trafficType */
  acceptTT?: boolean,
  /** Define runtime values (`settings.runtime`) */
  runtime: (settings: ISettings) => ISettings['runtime'],
  /** Storage validator (`settings.storage`) */
  storage?: (settings: ISettings) => ISettings['storage'],
  /** Integrations validator (`settings.integrations`) */
  integrations?: (settings: ISettings) => ISettings['integrations'],
  /** Logger validator (`settings.debug`) */
  logger: (settings: ISettings) => ISettings['log'],
  /** Localhost mode validator (`settings.sync.localhostMode`) */
  localhost?: (settings: ISettings) => ISettings['sync']['localhostMode'],
  /** User consent validator (`settings.userConsent`) */
  consent: (settings: ISettings) => ISettings['userConsent'],
}
