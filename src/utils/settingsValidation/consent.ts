import { ERROR_INVALID_CONFIG_PARAM } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { ConsentStatus } from '../../types';
import { CONSENT_DECLINED, CONSENT_GRANTED, CONSENT_UNKNOWN } from '../constants';
import { stringToUpperCase } from '../lang';

const userConsentValues = [CONSENT_DECLINED, CONSENT_GRANTED, CONSENT_UNKNOWN];

export function validateConsent({ userConsent, log }: { userConsent?: any, log: ILogger }): ConsentStatus {
  userConsent = stringToUpperCase(userConsent);

  if (userConsentValues.indexOf(userConsent) > -1) return userConsent;

  log.error(ERROR_INVALID_CONFIG_PARAM, ['userConsent', userConsentValues, CONSENT_GRANTED]);
  return CONSENT_GRANTED;
}
