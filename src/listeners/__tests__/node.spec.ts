import NodeSignalListener from '../node';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

const processOnSpy = jest.spyOn(process, 'on');
const processRemoveListenerSpy = jest.spyOn(process, 'removeListener');
const processKillSpy = jest.spyOn(process, 'kill').mockImplementation(() => true);

test('Node JS listener / Signal Listener class methods and start/stop functionality', () => {

  const handlerMock = jest.fn();
  const listener = new NodeSignalListener(handlerMock, fullSettings);

  listener.start();

  // Assigned right function to right signal.
  // @ts-expect-error
  expect(processOnSpy.mock.calls).toEqual([['SIGTERM', listener._sigtermHandler]]);

  // pre-check and call stop
  expect(processRemoveListenerSpy).not.toBeCalled();
  listener.stop();

  // removed correct listener from correct signal on stop.
  // @ts-expect-error
  expect(processRemoveListenerSpy.mock.calls).toEqual([['SIGTERM', listener._sigtermHandler]]);
});

test('Node JS listener / Signal Listener SIGTERM callback with sync handler', () => {

  const handlerMock = jest.fn();
  const listener = new NodeSignalListener(handlerMock, fullSettings);

  listener.start();
  // Stub stop function since we don't want side effects on test.
  jest.spyOn(listener, 'stop');

  // Control asserts.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(0);
  expect(handlerMock.mock.calls.length).toBe(0);
  expect(processKillSpy.mock.calls.length).toBe(0);

  // Call function
  // @ts-expect-error
  listener._sigtermHandler();

  // Handler was properly called.
  expect(handlerMock.mock.calls.length).toBe(1);

  // Clean up is called.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(1);
  // It called for kill again, so the shutdown keeps going.
  expect(processKillSpy.mock.calls).toEqual([[process.pid, 'SIGTERM']]);

  // Reset the kill spy since it's used on other tests.
  processKillSpy.mockClear();
});

test('Node JS listener / Signal Listener SIGTERM callback with sync handler that throws an error', () => {
  const handlerMock = jest.fn(() => { throw 'some error'; });
  const listener = new NodeSignalListener(handlerMock, fullSettings);

  listener.start();
  // Stub stop function since we don't want side effects on test.
  jest.spyOn(listener, 'stop');

  // Control asserts.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(0);
  expect(handlerMock.mock.calls.length).toBe(0);
  expect(processKillSpy.mock.calls.length).toBe(0);

  // Call function.
  // @ts-expect-error
  listener._sigtermHandler();

  // Handler was properly called.
  expect(handlerMock.mock.calls.length).toBe(1);

  // Even if the handler throws, clean up is called.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(1);
  // Even if the handler throws, it should call for kill again, so the shutdown keeps going.
  expect(processKillSpy.mock.calls.length).toBe(1);
  expect(processKillSpy.mock.calls).toEqual([[process.pid, 'SIGTERM']]);

  // Reset the kill spy since it's used on other tests.
  processKillSpy.mockClear();
});

test('Node JS listener / Signal Listener SIGTERM callback with async handler', async (done) => {

  const fakePromise = new Promise<void>(res => {
    setTimeout(() => {
      res();
    }, 0);
  });
  const handlerMock = jest.fn(() => fakePromise);

  const listener = new NodeSignalListener(handlerMock, fullSettings);

  // Stub stop function since we don't want side effects on test.
  jest.spyOn(listener, 'stop');

  // Start the listener
  listener.start();

  // Call function
  // @ts-expect-error
  listener._sigtermHandler();

  // Handler was properly called.
  expect(handlerMock.mock.calls.length).toBe(1);

  // Check that the wrap up is waiting for the promise to be resolved.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(0);
  expect(processKillSpy.mock.calls.length).toBe(0);

  fakePromise.then(() => {
    // Clean up is called even if there is an error.
    expect((listener.stop as jest.Mock).mock.calls.length).toBe(1);
    // It called for kill again, so the shutdown keeps going.
    expect(processKillSpy.mock.calls.length).toBe(1);
    expect(processKillSpy.mock.calls).toEqual([[process.pid, 'SIGTERM']]);

    // Reset the kill spy since it's used on other tests.
    processKillSpy.mockClear();

    done();
  });

  return fakePromise;
});

test('Node JS listener / Signal Listener SIGTERM callback with async handler that throws an error', async (done) => {

  const fakePromise = new Promise<void>((res, rej) => {
    setTimeout(() => {
      rej();
    }, 0);
  });
  const handlerMock = jest.fn(() => fakePromise);

  const listener = new NodeSignalListener(handlerMock, fullSettings);

  // Stub stop function since we don't want side effects on test.
  jest.spyOn(listener, 'stop');

  // Start the listener
  listener.start();

  // Call function
  // @ts-expect-error
  const handlerPromise = listener._sigtermHandler();

  // Handler was properly called.
  expect(handlerMock.mock.calls.length).toBe(1);

  // Check that the wrap up is waiting for the promise to be resolved.
  expect((listener.stop as jest.Mock).mock.calls.length).toBe(0);
  expect(processKillSpy.mock.calls.length).toBe(0);

  // Calling .then since the wrapUp handler does not throw.
  (handlerPromise as Promise<void>).then(() => {
    // Clean up is called.
    expect((listener.stop as jest.Mock).mock.calls.length).toBe(1);
    // It called for kill again, so the shutdown keeps going.
    expect(processKillSpy.mock.calls.length).toBe(1);
    expect(processKillSpy.mock.calls).toEqual([[process.pid, 'SIGTERM']]);

    /* Clean up everything */
    processOnSpy.mockRestore();
    processRemoveListenerSpy.mockRestore();
    processKillSpy.mockRestore();

    done();
  });

  return handlerPromise;
});
