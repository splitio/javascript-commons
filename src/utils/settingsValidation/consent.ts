import { ERROR_INVALID_CONFIG_PARAM } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { CONSENT_DECLINED, CONSENT_GRANTED, CONSENT_UNKNOWN } from '../constants';

const userConsentValues = [CONSENT_DECLINED, CONSENT_GRANTED, CONSENT_UNKNOWN];

export function validateConsent({ userConsent, log }: { userConsent: any, log: ILogger }) {
  if (typeof userConsent === 'string') userConsent = userConsent.toUpperCase();

  if (userConsentValues.indexOf(userConsent) > -1) return userConsent;

  log.error(ERROR_INVALID_CONFIG_PARAM, ['userConsent', userConsentValues, CONSENT_GRANTED]);
  return CONSENT_GRANTED;
}
