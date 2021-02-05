import { SplitIO } from '../../../types';
import { keyParser, getMatching, getBucketing } from '../index';

test('keyParser / if a string is passed as param, it should return a object', () => {

  const key = 'some key';
  const keyParsed = keyParser(key);

  expect(typeof keyParsed).toBe('object'); // key parsed should be a object
  expect(keyParsed.matchingKey && keyParsed.bucketingKey && true).toBe(true); // key parsed should has two properties
  expect(keyParsed.matchingKey).toBe(key); // matching key should be equal to key
  expect(keyParsed.bucketingKey).toBe(key); // bucketing key should be equal to key
});

test('keyParser / should return the keys configurations', () => {

  const matchingKey = 'some key';
  const bucketingKey = '100%:on';
  const keyParsed = keyParser({ matchingKey, bucketingKey });

  expect(typeof keyParsed).toBe('object'); // key parsed should be a object
  expect(keyParsed.matchingKey && keyParsed.bucketingKey && true).toBe(true); // key parsed should has two properties
  expect(keyParsed.matchingKey).toBe(matchingKey); // matching key should be equal to matchingKey
  expect(keyParsed.bucketingKey).toBe(bucketingKey); // matching key should be equal to bucketingKey
});

test('getMatching / if a string is passed as a param it should return a string', () => {

  const key = 'some key';
  const keyParsed = getMatching(key);

  expect(typeof keyParsed).toBe('string'); // key parsed should be a string
  expect(keyParsed).toBe(key); // key parsed should be equal to key
});

test('getMatching / if a object is passed as a param it should return a string', () => {

  const key = {
    matchingKey: 'some key',
    bucketingKey: 'another key'
  };

  const keyParsed = getMatching(key);

  expect(typeof keyParsed).toBe('string'); // key parsed should be a string
  expect(keyParsed).toBe(key.matchingKey); // key parsed should be equal to key
});

test('getBucketing / should return undefined if a string is passed as a param and return undefined is set', () => {

  const key = 'simple key';

  const keyParsed = getBucketing(key);

  expect(keyParsed).toBe(undefined); // key parsed should return undefined
});

test('getBucketing / should return undefined if a string is passed as a param and return undefined is set', () => {

  const key = { bucketingKey: 'test_buck_key' };

  const keyParsed = getBucketing(key as SplitIO.SplitKeyObject);

  expect(keyParsed).toBe('test_buck_key'); // key parsed should return undefined
});
