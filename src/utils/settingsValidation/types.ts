import { ISettings } from '../../types';

/**
 * Parameters used to specialize the settings validation for each API variant
 * (client-side, server-side) and environment (Node.js, Browser, etc)
 */
export interface ISettingsValidationParams {
  /**
   * Object of values to overwrite base settings.
   * Version and startup properties are required, because they are not defined in the base settings.
   */
  defaults: Partial<ISettings> & { version: string } & { startup: ISettings['startup'] },
  /** If true, validates core.key */
  acceptKey?: boolean,
  /** Define runtime values (`settings.runtime`) */
  runtime: (settings: ISettings) => ISettings['runtime'],
  /** Storage validator (`settings.storage`) */
  storage?: (settings: ISettings) => ISettings['storage'],
  /** Integrations validator (`settings.integrations`) */
  integrations?: (settings: ISettings) => ISettings['integrations'],
  /** Logger validator (`settings.debug`) */
  logger: (settings: ISettings) => ISettings['log'],
  /** User consent validator (`settings.userConsent`) */
  consent?: (settings: ISettings) => ISettings['userConsent'],
  /** Flag spec version validation. Configurable by the JS Synchronizer but not by the SDKs */
  flagSpec?: (settings: ISettings) => ISettings['sync']['flagSpecVersion']
}
