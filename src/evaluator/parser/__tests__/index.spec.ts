// @ts-nocheck
import { parser } from '..';
import { keyParser } from '../../../utils/key';
import { ISplitCondition } from '../../../dtos/types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('PARSER / if user is in segment all 100%:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31);

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe('in segment all'); // in segment all
});

test('PARSER / if user is in segment all 100%:off', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 0
    }, {
      treatment: 'off',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31);

  expect(evaluation.treatment === 'off').toBe(true); // off
  expect(evaluation.label === 'in segment all').toBe(true); // in segment all
});

test('PARSER / NEGATED if user is in segment all 100%:on, then no match', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31);

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user is in segment ["u1", "u2", "u3", "u4"] then split 100%:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'WHITELIST',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: [
            'u1',
            'u2',
            'u3',
            'u4'
          ]
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'whitelisted'
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation === undefined).toBe(true); // evaluation should throw undefined

  evaluation = await evaluator(keyParser('u1'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // on

  evaluation = await evaluator(keyParser('u3'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // on

  evaluation = await evaluator(keyParser('u3'), 31, 100, 31);
  expect(evaluation.label === 'whitelisted').toBe(true); // whitelisted
});

test('PARSER / NEGATED if user is in segment ["u1", "u2", "u3", "u4"] then split 100%:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'WHITELIST',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: [
            'u1',
            'u2',
            'u3',
            'u4'
          ]
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'whitelisted'
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on

  evaluation = await evaluator(keyParser('u1'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluation should throw undefined

  evaluation = await evaluator(keyParser('u3'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluation should throw undefined

  evaluation = await evaluator(keyParser('u3'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluation should throw undefined
});

test('PARSER / if user.account is in list ["v1", "v2", "v3"] then split 100:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'account'
        },
        matcherType: 'WHITELIST',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: [
            'v1',
            'v2',
            'v3'
          ]
        },
        unaryNumericMatcherData: null,
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'whitelisted'
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    account: 'v1'
  });
  expect(evaluation.treatment === 'on').toBe(true); // v1 is defined in the whitelist
  expect(evaluation.label === 'whitelisted').toBe(true); // label should be "whitelisted"

  evaluation = await evaluator(keyParser('v1'), 31, 100, 31);
  expect(evaluation === undefined).toBe(true); // we are looking for v1 inside the account attribute

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    account: 'v4'
  });
  expect(evaluation === undefined).toBe(true); // v4 is not defined inside the whitelist
});

test('PARSER / NEGATED if user.account is in list ["v1", "v2", "v3"] then split 100:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'account'
        },
        matcherType: 'WHITELIST',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: [
            'v1',
            'v2',
            'v3'
          ]
        },
        unaryNumericMatcherData: null,
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'whitelisted'
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    account: 'v1'
  });
  expect(evaluation === undefined).toBe(true); // v1 is defined in the whitelist

  evaluation = await evaluator(keyParser('v1'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // we are looking for v1 inside the account attribute
  expect(evaluation.label === 'whitelisted').toBe(true); // label should be "whitelisted"

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    account: 'v4'
  });
  expect(evaluation.treatment === 'on').toBe(true); // v4 is not defined in the whitelist
  expect(evaluation.label === 'whitelisted').toBe(true); // label should be "whitelisted"
});

test('PARSER / if user.account is in segment all then split 100:on', async () => {
  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: null,
        betweenMatcherData: null,
        unaryStringMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // ALL_KEYS always matches
});

test('PARSER / if user.attr is between 10 and 20 then split 100:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'BETWEEN',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: null,
        betweenMatcherData: {
          dataType: 'NUMBER',
          start: 10,
          end: 20
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 10
  });
  expect(evaluation.treatment === 'on').toBe(true); // 10 is between 10 and 20

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 9
  });
  expect(evaluation === undefined).toBe(true); // 9 is not between 10 and 20

  expect(await evaluator(keyParser('test@split.io'), 31, 100, 31)).toBe(undefined); // undefined is not between 10 and 20
});

test('PARSER / NEGATED if user.attr is between 10 and 20 then split 100:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'BETWEEN',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: null,
        betweenMatcherData: {
          dataType: 'NUMBER',
          start: 10,
          end: 20
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 10
  });
  expect(evaluation === undefined).toBe(true); // 10 is between 10 and 20

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 9
  });
  expect(evaluation.treatment === 'on').toBe(true); // 9 is not between 10 and 20

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // undefined is not between 10 and 20
});

test('PARSER / if user.attr <= datetime 1458240947021 then split 100:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'LESS_THAN_OR_EQUAL_TO',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T18:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947021 is equal

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T17:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947020 is less than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T19:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947022 is not less than 1458240947021

  expect(await evaluator(keyParser('test@split.io'), 31, 100, 31)).toBe(undefined); // missing attributes in the parameters list
});

test('PARSER / NEGATED if user.attr <= datetime 1458240947021 then split 100:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'LESS_THAN_OR_EQUAL_TO',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T18:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947021 is equal

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T17:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947020 is less than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T19:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947022 is not less than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // missing attributes in the parameters list
});

test('PARSER / if user.attr >= datetime 1458240947021 then split 100:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'GREATER_THAN_OR_EQUAL_TO',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T18:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947021 is equal

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T17:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947020 is less than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T19:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947000 is greater than 1458240947021

  expect(await evaluator(keyParser('test@split.io'), 31, 100, 31)).toBe(undefined); // missing attributes in the parameters list
});

test('PARSER / NEGATED if user.attr >= datetime 1458240947021 then split 100:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'GREATER_THAN_OR_EQUAL_TO',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T18:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947021 is equal

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T17:55:47.021Z').getTime()
  });
  expect(evaluation.treatment === 'on').toBe(true); // 1458240947020 is less than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: new Date('2016-03-17T19:55:47.021Z').getTime()
  });
  expect(evaluation === undefined).toBe(true); // 1458240947000 is greater than 1458240947021

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31);
  expect(evaluation.treatment === 'on').toBe(true); // missing attributes in the parameters list
});

test('PARSER / if user.attr = datetime 1458240947021 then split 100:on', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'EQUAL_TO',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947021
  });
  expect(evaluation.treatment).toBe('on'); // 2016-03-17T18:55:47.021Z is equal to 2016-03-17T18:55:47.021Z

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947020
  });
  expect(evaluation.treatment).toBe('on'); // 2016-03-17T18:55:47.020Z is considered equal to 2016-03-17T18:55:47.021Z

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947020
  });
  expect(evaluation.treatment).toBe('on'); // 2016-03-17T00:00:00Z is considered equal to 2016-03-17T18:55:47.021Z

  expect(await evaluator(keyParser('test@split.io'), 31, 100, 31)).toBe(undefined); // missing attributes should be evaluated to false
});

test('PARSER / NEGATED if user.attr = datetime 1458240947021 then split 100:on, negated results', async () => {

  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'attr'
        },
        matcherType: 'EQUAL_TO',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null,
        unaryNumericMatcherData: {
          dataType: 'DATETIME',
          value: 1458240947021
        },
        betweenMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947021
  });
  expect(evaluation).toBe(undefined); // 2016-03-17T18:55:47.021Z is equal to 2016-03-17T18:55:47.021Z

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947020
  });
  expect(evaluation).toBe(undefined); // 2016-03-17T18:55:47.020Z is considered equal to 2016-03-17T18:55:47.021Z

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31, {
    attr: 1458240947020
  });
  expect(evaluation).toBe(undefined); // 2016-03-17T00:00:00Z is considered equal to 2016-03-17T18:55:47.021Z

  evaluation = await evaluator(keyParser('test@split.io'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // missing attributes should be evaluated to false
});

test('PARSER / if user is in segment all then split 20%:A,20%:B,60%:A', async () => {
  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'A',
      size: 20
    }, {
      treatment: 'B',
      size: 20
    }, {
      treatment: 'A',
      size: 60
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('aa'), 31, 100, 31);
  expect(evaluation.treatment).toBe('A'); // 20%:A // bucket 6 with murmur3

  evaluation = await evaluator(keyParser('b297'), 31, 100, 31);
  expect(evaluation.treatment).toBe('B'); // 20%:B // bucket 34 with murmur3

  evaluation = await evaluator(keyParser('c157'), 31, 100, 31);
  expect(evaluation.treatment).toBe('A'); // 60%:A // bucket 100 with murmur3
});
