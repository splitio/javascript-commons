import { ERROR_NOT_BOOLEAN, USER_CONSENT_UPDATED, USER_CONSENT_NOT_UPDATED, USER_CONSENT_INITIAL } from '../logger/constants';
import { ISyncManager } from '../sync/types';
import { ISettings } from '../types';
import { isConsentGranted } from '../utils/consent';
import { CONSENT_GRANTED, CONSENT_DECLINED } from '../utils/constants';
import { isBoolean } from '../utils/lang';

// Extend client-side factory instances with user consent getter/setter
export function userConsentProps(settings: ISettings, syncManager?: ISyncManager) {

  const log = settings.log;

  if (!isConsentGranted(settings)) log.info(USER_CONSENT_INITIAL, [settings.userConsent]);

  return {
    setUserConsent(consent: unknown) {
      // validate input param
      if (!isBoolean(consent)) {
        log.warn(ERROR_NOT_BOOLEAN, ['setUserConsent']);
        return false;
      }

      const newConsentStatus = consent ? CONSENT_GRANTED : CONSENT_DECLINED;

      if (settings.userConsent !== newConsentStatus) {
        log.info(USER_CONSENT_UPDATED, [settings.userConsent, newConsentStatus]); // @ts-ignore, modify readonly prop
        settings.userConsent = newConsentStatus;

        if (consent) syncManager?.submitter?.start(); // resumes submitters if transitioning to GRANTED
        else syncManager?.submitter?.stop(); // pauses submitters if transitioning to DECLINED
      } else {
        log.info(USER_CONSENT_NOT_UPDATED, [newConsentStatus]);
      }

      return true;
    },

    getUserConsent() {
      return settings.userConsent;
    }
  };
}
