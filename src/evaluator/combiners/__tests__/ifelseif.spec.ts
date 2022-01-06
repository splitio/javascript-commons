// @ts-nocheck
import { ifElseIfCombinerContext } from '../ifelseif';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('IF ELSE IF COMBINER / should correctly propagate context parameters and predicates returns value', async function () {
  let inputKey = 'sample';
  let inputSeed = 1234;
  let inputAttributes = {};
  let evaluationResult = 'treatment';

  function evaluator(key, seed, attributes) {
    expect(key === inputKey).toBe(true); // key should be equals
    expect(seed === inputSeed).toBe(true); // seed should be equals
    expect(attributes === inputAttributes).toBe(true); // attributes should be equals

    return evaluationResult;
  }

  let predicates = [evaluator];
  let ifElseIfEvaluator = ifElseIfCombinerContext(loggerMock, predicates);

  expect(await ifElseIfEvaluator(inputKey, inputSeed, inputAttributes) === evaluationResult).toBe(true);
  console.log(`evaluator should return ${evaluationResult}`);
});

test('IF ELSE IF COMBINER / should stop evaluating when one matcher return a treatment', async function () {
  let predicates = [
    function undef() {
      return undefined;
    },
    function exclude() {
      return 'exclude';
    },
    function alwaysTrue() {
      return 'alwaysTrue';
    }
  ];

  let ifElseIfEvaluator = ifElseIfCombinerContext(loggerMock, predicates);

  expect(await ifElseIfEvaluator()).toBe('exclude'); // exclude treatment found
});

test('IF ELSE IF COMBINER / should return undefined if there is none matching rule', async function () {
  const predicates = [
    function undef() {
      return undefined;
    },
    function undef() {
      return undefined;
    },
    function undef() {
      return undefined;
    }
  ];

  const ifElseIfEvaluator = ifElseIfCombinerContext(loggerMock, predicates);

  expect(await ifElseIfEvaluator() === undefined).toBe(true);
});
