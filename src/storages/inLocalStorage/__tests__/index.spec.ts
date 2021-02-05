import { InLocalStorage } from '../index';

describe('IN LOCAL STORAGE', () => {

  test('return undefined if LocalStorage API is not available', () => {

    const originalLocalStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {}); // delete global localStorage property

    const storage = InLocalStorage({ prefix: 'prefix' });
    expect(storage).toBe(undefined);

    Object.defineProperty(global, 'localStorage', originalLocalStorage as PropertyDescriptor); // restore original localStorage

  });

  test('return a new storage if LocalStorage API is available', () => {

    const storage = InLocalStorage({ prefix: 'prefix' });
    expect(typeof storage).toBe('function');

  });

});
