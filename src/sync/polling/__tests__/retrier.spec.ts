import { retrierFactory } from '../retrier';
import { Backoff } from '../../../utils/Backoff';

describe('retrier', () => {

  beforeAll(() => { Backoff.__TEST__BASE_MILLIS = 10; });
  afterAll(() => { Backoff.__TEST__BASE_MILLIS = undefined; });

  test('retries until the task succeeds', async () => {
    const task = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    expect(await retrierFactory(task).run()).toBe(true);
    expect(task).toBeCalledTimes(3);
  });

  test('does not retry if the task succeeds', async () => {
    const task = jest.fn().mockResolvedValue(true);

    expect(await retrierFactory(task).run()).toBe(true);
    expect(task).toBeCalledTimes(1);
  });

  test('cancel stops pending retries', async () => {
    const task = jest.fn().mockResolvedValue(false);
    const retrier = retrierFactory(task);

    const promise = retrier.run();
    await new Promise(res => setTimeout(res, 0)); // first attempt fails and a retry is scheduled
    retrier.cancel();

    expect(await promise).toBe(false);
    expect(task).toBeCalledTimes(1);

    await new Promise(res => setTimeout(res, 50));
    expect(task).toBeCalledTimes(1);
  });

});
