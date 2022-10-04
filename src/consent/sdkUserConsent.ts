import { ERROR_NOT_BOOLEAN, USER_CONSENT_UPDATED, USER_CONSENT_NOT_UPDATED, USER_CONSENT_INITIAL } from '../logger/constants';
import { isConsentGranted } from './index';
import { CONSENT_GRANTED, CONSENT_DECLINED, CONSENT_UNKNOWN } from '../utils/constants';
import { isBoolean } from '../utils/lang';
import { ISdkFactoryContext } from '../sdkFactory/types';

// User consent enum
const ConsentStatus = {
  GRANTED: CONSENT_GRANTED,
  DECLINED: CONSENT_DECLINED,
  UNKNOWN: CONSENT_UNKNOWN,
};

/**
 * The public user consent API exposed via SplitFactory, used to control if the SDK tracks and sends impressions and events or not.
 */
export function createUserConsentAPI(params: ISdkFactoryContext) {
  const { settings, settings: { log }, syncManager, storage: { events, impressions, impressionCounts } } = params;

  if (!isConsentGranted(settings)) log.info(USER_CONSENT_INITIAL, [settings.userConsent]);

  return {
    setStatus(consent: unknown) {
      // validate input param
      if (!isBoolean(consent)) {
        log.warn(ERROR_NOT_BOOLEAN, ['UserConsent.setStatus']);
        return false;
      }

      const newConsentStatus = consent ? CONSENT_GRANTED : CONSENT_DECLINED;

      if (settings.userConsent !== newConsentStatus) {
        log.info(USER_CONSENT_UPDATED, [settings.userConsent, newConsentStatus]); // @ts-ignore, modify readonly prop
        settings.userConsent = newConsentStatus;

        if (consent) { // resumes submitters if transitioning to GRANTED
          syncManager?.submitterManager?.start();
        } else { // pauses submitters (except telemetry), and drops tracked data if transitioning to DECLINED
          syncManager?.submitterManager?.stop(true);

          // @ts-ignore, clear method is present in storage for standalone and partial consumer mode
          if (events.clear) events.clear(); // @ts-ignore
          if (impressions.clear) impressions.clear(); // @ts-ignore
          if (impressionCounts && impressionCounts.clear) impressionCounts.clear();
        }
      } else {
        log.info(USER_CONSENT_NOT_UPDATED, [newConsentStatus]);
      }

      return true;
    },

    getStatus() {
      return settings.userConsent;
    },

    Status: ConsentStatus
  };
}
