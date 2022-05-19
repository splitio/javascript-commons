import { timer } from '../timer';

test('TIMER / should count the time between two tasks', (done) => {
  const timerDuration = Math.floor(Math.random() * 1000); // In millis
  const stopTimer = timer(Date.now);

  setTimeout(() => {
    const elapsedTime = stopTimer();

    expect(elapsedTime >= timerDuration - 20).toBe(true); // Timer should return correct difference (calculations made with +-20ms)
    expect(elapsedTime <= timerDuration + 20).toBe(true); // Timer should return correct difference (calculations made with +-20ms)
    done();
  }, timerDuration);
});
