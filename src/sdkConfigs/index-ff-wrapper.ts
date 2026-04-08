import { ISdkFactoryParams } from '../sdkFactory/types';
import { sdkFactory } from '../sdkFactory/index';
import SplitIO from '../../types/splitio';
import { objectAssign } from '../utils/lang/objectAssign';
import { validateTarget } from '../utils/inputValidation/target';
import { GET_CONFIG } from '../utils/constants';
import { ISettings } from '../types';


function parseConfig(treatmentWithConfig: SplitIO.TreatmentWithConfig): SplitIO.Config {
  return {
    variant: treatmentWithConfig.treatment,
    value: treatmentWithConfig.config ? JSON.parse(treatmentWithConfig.config) : {},
  };
}

/**
 * Configs SDK Client factory implemented as a wrapper over the FF SDK.
 * Exposes getConfig and track at the root level instead of requiring a client() call.
 * getConfig delegates to getTreatmentWithConfig and wraps the parsed JSON config in a Config object.
 */
export function configsClientFactory(params: ISdkFactoryParams): SplitIO.ConfigsClient {
  const ffSdk = sdkFactory({ ...params, lazyInit: true }) as (SplitIO.ISDK | SplitIO.IAsyncSDK) & { init(): void };
  const ffClient = ffSdk.client() as SplitIO.IClient & { init(): void; flush(): Promise<void> };
  const ffManager = ffSdk.manager();
  const log = (ffSdk.settings as ISettings).log;

  return objectAssign(
    // Inherit status interface (EventEmitter, Event, getStatus, ready, whenReady, whenReadyFromCache) from ffClient
    Object.create(ffClient) as SplitIO.IStatusInterface,
    {
      settings: ffSdk.settings,
      Logger: ffSdk.Logger,

      init() {
        ffSdk.init();
      },

      flush(): Promise<void> {
        return ffClient.flush();
      },

      destroy(): Promise<void> {
        return ffSdk.destroy();
      },

      getConfig(name: string, target?: SplitIO.Target): SplitIO.Config {
        if (target) {
          // Serve config with target
          if (validateTarget(log, target, GET_CONFIG)) {
            const result = ffClient.getTreatmentWithConfig(target.key, name, target.attributes) as SplitIO.TreatmentWithConfig;
            return parseConfig(result);
          } else {
            log.error('Invalid target for getConfig.');
          }
        }

        // Serve config without target
        const config = ffManager.split(name) as SplitIO.SplitView;
        if (!config) {
          log.error('Provided config name does not exist. Serving empty config object.');
          return parseConfig({ treatment: 'control', config: null });
        }

        log.info('Serving default config variant, ' + config.defaultTreatment + ' for config ' + name);
        return parseConfig({ treatment: config.defaultTreatment, config: config.configs[config.defaultTreatment] });
      },

      track(key: SplitIO.SplitKey, trafficType: string, eventType: string, value?: number, properties?: SplitIO.Properties): boolean {
        return ffClient.track(key, trafficType, eventType, value, properties) as boolean;
      }
    }
  );
}
