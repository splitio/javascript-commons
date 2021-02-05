import { logFactory, API } from '../sdkLogger';
import { Logger } from '../index';
import { LOG_LEVELS } from './index.spec';

test('SPLIT SDK LOGGER FACTORY / methods and props', () => {

  expect(typeof logFactory).toBe('function'); // Importing the module should return a function.

  expect(typeof API).toBe('object'); // Our logger should expose an API object.
  expect(typeof API.enable).toBe('function'); // API object should have enable method.
  expect(typeof API.disable).toBe('function'); // API object should have disable method.
  expect(typeof API.setLogLevel).toBe('function'); // API object should have setLogLevel method.
  expect(API.LogLevel).toEqual(LOG_LEVELS); // API object should have LogLevel prop including all available levels.

});

test('SPLIT SDK LOGGER FACTORY / create factory returned instance', () => {
  const logger = logFactory('category', {});

  expect(logger instanceof Logger).toBe(true); // Our logger should expose an API object.

});
