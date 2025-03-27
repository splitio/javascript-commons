// @ts-nocheck
import { promiseWrapper } from '../wrapper';

test('Promise utils / promise wrapper', function (done) {
  expect.assertions(58); // number of passHandler, passHandlerFinally, passHandlerWithThrow and `hasOnFulfilled` asserts

  const value = 'value';
  const failHandler = (val) => { done.fail(val); };
  const passHandler = (val) => { expect(val).toBe(value); return val; };
  const passHandlerFinally = (val) => { expect(val).toBeUndefined(); };
  const passHandlerWithThrow = (val) => { expect(val).toBe(value); throw val; };
  const createResolvedPromise = () => new Promise((res) => { setTimeout(() => { res(value); }, 100); });
  const createRejectedPromise = () => new Promise((_, rej) => { setTimeout(() => { rej(value); }, 100); });

  // resolved promises
  let wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(false);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.finally(passHandlerFinally);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler, failHandler).finally(passHandlerFinally);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler).catch(failHandler).finally(passHandlerFinally);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler).catch(failHandler).then(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler).then(passHandler).catch(failHandler).finally(passHandlerFinally).then(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise.then(passHandler).then(passHandlerWithThrow).catch(passHandler).then(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  const wrappedPromise2 = promiseWrapper(createResolvedPromise(), failHandler);
  wrappedPromise2.then(() => {
    wrappedPromise2.then(passHandler);
  });
  expect(wrappedPromise2.hasOnFulfilled()).toBe(true);

  Promise.all([
    promiseWrapper(createResolvedPromise(), failHandler),
    promiseWrapper(createResolvedPromise(), failHandler)]
  ).then((val) => { expect(val).toEqual([value, value]); });

  // rejected promises
  wrappedPromise = promiseWrapper(createRejectedPromise(), passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(false);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.catch(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(false);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.catch(passHandler).then(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(false);

  // caveat: setting an `onFinally` handler as the first handler, requires an `onRejected` handler if promise is rejected
  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.finally(passHandlerFinally).catch(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), passHandler);
  wrappedPromise.then(undefined, passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(false);

  wrappedPromise = promiseWrapper(createRejectedPromise(), passHandler);
  wrappedPromise.then(failHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.then(failHandler).then(failHandler).catch(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), passHandler);
  wrappedPromise.then(failHandler).then(failHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.then(failHandler, passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.then(failHandler).catch(passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.then(failHandler).then(failHandler, passHandler);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  wrappedPromise = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise.then(failHandler).catch(passHandler).then(passHandler).finally(passHandlerFinally);
  expect(wrappedPromise.hasOnFulfilled()).toBe(true);

  const wrappedPromise3 = promiseWrapper(createRejectedPromise(), failHandler);
  wrappedPromise3.catch(() => {
    wrappedPromise3.catch(passHandler);
  });
  expect(wrappedPromise3.hasOnFulfilled()).toBe(false);

  Promise.all([
    promiseWrapper(createResolvedPromise(), failHandler),
    promiseWrapper(createRejectedPromise(), failHandler)]).catch(passHandler);

  setTimeout(() => {
    done();
  }, 1000);

});

test('Promise utils / promise wrapper: async/await', async () => {

  expect.assertions(8); // number of passHandler, passHandlerWithThrow and passHandlerFinally

  const value = 'value';
  const failHandler = (val) => { throw val; };
  const passHandler = (val) => { expect(val).toBe(value); return val; };
  const passHandlerFinally = (val) => { expect(val).toBeUndefined(); };
  const passHandlerWithThrow = (val) => { expect(val).toBe(value); throw val; };
  const createResolvedPromise = () => new Promise((res) => { res(value); });
  const createRejectedPromise = () => new Promise((res, rej) => { rej(value); });

  try {
    const result = await promiseWrapper(createResolvedPromise(), failHandler);
    passHandler(result);
  } catch (result) {
    failHandler(result);
  } finally {
    passHandlerFinally();
  }

  try {
    const result = await promiseWrapper(createRejectedPromise(), failHandler);
    failHandler(result);
  } catch (result) {
    passHandler(result);
  }

  let result;
  try {
    result = await promiseWrapper(createResolvedPromise(), failHandler);
    passHandler(result);
    passHandlerWithThrow(result);
  } catch (error) {
    result = passHandler(error);
  } finally {
    passHandlerFinally();
  }
  passHandler(result);
});
