/* eslint-disable no-undef */
export function isLocalStorageAvailable(): boolean {
  var mod = '__SPLITSOFTWARE__';
  try {
    localStorage.setItem(mod, mod);
    localStorage.removeItem(mod);
    return true;
  } catch (e) {
    return false;
  }
}
