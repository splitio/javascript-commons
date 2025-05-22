export function isLocalStorageAvailable(): boolean {
  try {
    // eslint-disable-next-line no-undef
    return isStorageValid(localStorage);
  } catch (e) {
    return false;
  }
}

export function isStorageValid(storage: any): boolean {
  var mod = '__SPLITSOFTWARE__';
  try {
    storage.setItem(mod, mod);
    storage.getItem(mod);
    storage.removeItem(mod);
    return true;
  } catch (e) {
    return false;
  }
}
