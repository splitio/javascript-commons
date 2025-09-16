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

export function isValidStorageWrapper(wrapper: any): boolean {
  return wrapper !== null &&
    typeof wrapper === 'object' &&
    typeof wrapper.setItem === 'function' &&
    typeof wrapper.getItem === 'function' &&
    typeof wrapper.removeItem === 'function';
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
