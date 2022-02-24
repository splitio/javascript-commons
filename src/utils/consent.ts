import { ISettings } from '../types';
import { CONSENT_GRANTED } from './constants';

export function isConsentGranted(settings: ISettings) {
  const userConsent = settings.userConsent;
  // undefined userConsent is handled as granted (default)
  return !userConsent || userConsent === CONSENT_GRANTED;
}
