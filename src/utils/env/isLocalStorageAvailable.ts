export function isLocalStorageAvailable(): boolean {
  try {
    // eslint-disable-next-line no-undef
    return isValidStorageWrapper(localStorage);
  } catch (e) {
    return false;
  }
}

export function isValidStorageWrapper(wrapper: any): boolean {
  var mod = '__SPLITSOFTWARE__';
  try {
    wrapper.setItem(mod, mod);
    wrapper.getItem(mod);
    wrapper.removeItem(mod);
    return true;
  } catch (e) {
    return false;
  }
}

export function isWebStorage(wrapper: any): boolean {
  if (typeof wrapper.length === 'number') {
    try {
      wrapper.key(0);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}
