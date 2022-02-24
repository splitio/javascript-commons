import { ERROR_NOT_BOOLEAN, USER_CONSENT_UPDATED } from '../logger/constants';
import { ISyncManager } from '../sync/types';
import { ISettings } from '../types';
import { CONSENT_GRANTED, CONSENT_DECLINED } from '../utils/constants';

// Extend client-side factory instances with user consent getter/setter
export function userConsentProps(settings: ISettings, syncManager?: ISyncManager) {

  const log = settings.log;

  return {
    setUserConsent(consent: unknown) {
      // validate input param
      if (typeof consent !== 'boolean') {
        log.error(ERROR_NOT_BOOLEAN, ['setUserConsent']);
        return false;
      }

      const newConsentStatus = consent ? CONSENT_GRANTED : CONSENT_DECLINED;

      if (settings.userConsent !== newConsentStatus) {
        // resume/pause submitters
        if (consent) syncManager?.submitter?.start();
        else syncManager?.submitter?.stop();

        log.info(USER_CONSENT_UPDATED, [settings.userConsent, newConsentStatus]); // @ts-ignore, modify readonly prop
        settings.userConsent = newConsentStatus;
      }

      return true;
    },

    getUserConsent() {
      return settings.userConsent;
    }
  };
}
