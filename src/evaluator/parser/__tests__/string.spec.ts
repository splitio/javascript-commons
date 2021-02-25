// @ts-nocheck
import parser from '..';
import { ISplitCondition } from '../../../dtos/types';
import { keyParser } from '../../../utils/key';
import { noopLogger } from '../../../logger/noopLogger';

//
// STARTS WITH
//
test('PARSER / if user.email starts with ["nico"] then split 100:on', async function () {
  const label = 'email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email = 123, starts with ["1"] then split 100:on should match', async function () {
  const label = 'email starts with ["1"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['1']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 123
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email starts with ["nico", "marcio", "facu"] then split 100:on', async function () {
  const label = 'email starts with ["nico", "marcio", "facu"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico', 'marcio', 'facu']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email starts with ["nico", "marcio", "facu"] then split 100:on', async function () {
  const label = 'email starts with ["nico", "marcio", "facu"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico', 'marcio', 'facu']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'marciomisi@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email does not start with ["nico"] then not match', async function () {
  // const label = 'email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is an EMPTY string, start with ["nico"] should not match', async function () {
  // const label = 'email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is not a string, start with ["nico"] should not match', async function () {
  // const label = 'email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: {}
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email starts with ["nico"] then split 100:on, so not match', async function () {
  const label = 'not email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email does not start with ["nico"] should not match, then match', async function () {
  const label = 'not email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if user.email is an EMPTY string, start with ["nico"] should not match, so negation should', async function () {
  const label = 'not email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if user.email is not a string, start with ["nico"] should not match, so negation should', async function () {
  const label = 'not email starts with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'STARTS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: /asd4?/
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

//
// ENDS WITH
//
test('PARSER / if user.email ends with ["split.io"] then split 100:on', async function () {
  const label = 'email ends with ["split.io"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['split.io']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email = 123, ends with ["3"] then split 100:on should match', async function () {
  const label = 'email starts with ["3"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['3']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 123
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email ends with ["gmail.com", "split.io", "hotmail.com"] then split 100:on', async function () {
  const label = 'email ends with ["gmail.com", "split.io", "hotmail.com"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['gmail.com', 'split.io', 'hotmail.com']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email ends with ["gmail.com", "split.io", "hotmail.com"] then split 100:on', async function () {
  const label = 'email ends with ["gmail.com", "split.io", "hotmail.com"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['gmail.com', 'split.io', 'hotmail.com']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@hotmail.com'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email ends with ["gmail.com", "split.io", "hotmail.com"] but attribute is "" then split 100:on', async function () {
  const label = 'email ends with ["gmail.com", "split.io", "hotmail.com"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['gmail.com', 'split.io', 'hotmail.com']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email does not end with ["split.io"] then not match', async function () {
  const label = 'email ends with ["split.io"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['split.io']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@gmail.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is an EMPTY string, end with ["nico"] should not match', async function () {
  // const label = 'email ends with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is not a string, end with ["nico"] should not match', async function () {
  // const label = 'email ends with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: []
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicole'
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email ends with ["split.io"] then split 100:on, so not match', async function () {
  const label = 'not email ends with ["split.io"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['split.io']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email does not end with ["split.io"] then no match, so match', async function () {
  const label = 'not email ends with ["split.io"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['split.io']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@gmail.io'
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if user.email is an EMPTY string, end with ["nico"] should not match, so negation should', async function () {
  const label = 'not email ends with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if user.email is not a string, end with ["nico"] should not match, so negation should', async function () {
  const label = 'not email ends with ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'ENDS_WITH',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: NaN
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

//
// CONTAINS STRING
//
test('PARSER / if user.email contains ["@split"] then split 100:on', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email = 123, contains ["2"] then split 100:on should match', async function () {
  const label = 'email contains ["2"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['2']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 123
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.email contains ["@split"] (beginning) then split 100:on', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: '@split.io.com.ar'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email contains ["@split"] (end) then split 100:on', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email contains ["@split"] (whole string matches) then split 100:on', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: '@split'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email contains ["@split", "@gmail", "@hotmail"] then split 100:on', async function () {
  const label = 'email contains ["@split", "@gmail", "@hotmail"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split', '@gmail', '@hotmail']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nico@hotmail.com'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email contains ["@split", "@gmail", "@hotmail"] then split 100:on', async function () {
  const label = 'email contains ["@split", "@gmail", "@hotmail"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split', '@gmail', '@hotmail']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nico@gmail.com'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / if user.email does not contain ["@split"] then not match', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@gmail.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is an EMPTY string, contains ["nico"] should not match', async function () {
  // const label = 'email contains ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.email is not a string, contains ["nico"] should not match', async function () {
  // const label = 'email contains ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: null
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: new Set()
  });
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email contains ["@split"] then split 100:on, then no match', async function () {
  const label = 'not email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'nicolas.zelaya@split.io'
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.email does not contain ["@split"] then not match, so match', async function () {
  const label = 'email contains ["@split"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['@split']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: 'facundo@gmail.io'
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); //
});

test('PARSER / NEGATED if user.email is an EMPTY string, contains ["nico"] should not match, so negation should', async function () {
  const label = 'not email contains ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: ''
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if user.email is not a string, contains ["nico"] should not match, so negation should', async function () {
  const label = 'not email contains ["nico"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'email'
        },
        matcherType: 'CONTAINS_STRING',
        negate: true,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['nico']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    email: () => { }
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});
