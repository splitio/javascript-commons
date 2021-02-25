// @ts-nocheck
import parser from '..';
import { keyParser } from '../../../utils/key';
import { ISplitCondition } from '../../../dtos/types';
import { noopLogger } from '../../../logger/noopLogger';

//
// EQUAL_TO_SET
//
test('PARSER / if user.permissions ["read", "write"] equal to set ["read", "write"] then split 100:on', async function () {
  const label = 'permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read', 'write']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["write", "read"] equal to set ["read", "write"] then split 100:on', async function () {
  const label = 'permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['write', 'read']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["1", 2] equal to set ["1", "2"] then split 100:on', async function () {
  const label = 'permissions = ["1", "2"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['1', '2']
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
    permissions: ['1', 2]
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // evaluator should return undefined
  expect(evaluation.label).toBe(label); // label should be correct
});

test('PARSER / if user.permissions ["read", "write", "delete"] equal to set ["read", "write"] then not match', async function () {
  const label = 'permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read', 'write', 'delete']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.permissions ["read"] equal to set ["read", "write"] then not match', async function () {
  const label = 'permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.permissions ["read", "delete"] equal to set ["read", "write"] then not match', async function () {
  const label = 'permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read', 'delete']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if user.countries ["argentina", "usa"] equal to set ["usa","argentina"] then split 100:on', async function () {
  const label = 'countries = ["usa","argentina"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'countries'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['usa', 'argentina']
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
    countries: ['argentina', 'usa']
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // label should match
});

test('PARSER / if attribute is not an array we should not match equal to set', async function () {
  const label = 'countries = ["usa","argentina"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'countries'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['usa', 'argentina']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluator should not match

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    countries: 'argentina'
  });
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if attribute is an EMPTY array we should not match equal to set', async function () {
  const label = 'countries = ["usa","argentina"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'countries'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['usa', 'argentina']
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
    countries: []
  });

  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / NEGATED if user.permissions ["read", "write"] equal to set ["read", "write"] then split 100:on should not match', async function () {
  const label = 'not permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read', 'write']
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.permissions ["read"] equal to set ["read", "write"] false, then match', async function () {
  const label = 'not permissions = ["read", "write"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'write']
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
    permissions: ['read']
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is not an array we should not match equal to set, so match', async function () {
  const label = 'countries = ["usa","argentina"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'countries'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['usa', 'argentina']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    countries: 4
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is an EMPTY array we should not match equal to set, so match', async function () {
  const label = 'countries = ["usa","argentina"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'countries'
        },
        matcherType: 'EQUAL_TO_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['usa', 'argentina']
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
    countries: []
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

//
// CONTAINS_ALL_OF_SET
//
test('PARSER / if user.permissions ["read", "edit", "delete"] contains all of set ["read", "edit"] then split 100:on', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['read', 'edit', 'delete']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["edit", "read", "delete"] contains all of set ["read", "edit"] then split 100:on', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['edit', 'read', 'delete']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions [1, "edit", "delete"] contains all of set ["1", "edit"] then split 100:on', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['1', 'edit']
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
    permissions: [1, 'edit', 'delete']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["read"] contains all of set ["read", "edit"] then not match', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['read']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if user.permissions ["read", "delete", "manage"] contains all of set ["read", "edit"] then not match', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['read', 'delete', 'manage']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if attribute is not an array we should not match contains all', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluator should not match

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    permissions: {}
  });
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if attribute is an EMPTY array we should not match contains all', async function () {
  const label = 'permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / NEGATED if user.permissions ["read", "edit", "delete"] contains all of set ["read", "edit"] then split 100:on should not match', async function () {
  const label = 'not permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['read', 'edit', 'delete']
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.permissions ["read"] contains all of set ["read", "edit"] false, so match', async function () {
  const label = 'not permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['read']
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is not an array we should not match contains all, so match', async function () {
  const label = 'not permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    countries: /asd/
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is an EMPTY array we should not match contains all, so match', async function () {
  const label = 'not permissions contains ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ALL_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

//
// PART_OF_SET
//
test('PARSER / if user.permissions ["read", "edit"] is part of set ["read", "edit", "delete"] then split 100:on', async function () {
  const label = 'permissions part of ["read", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit', 'delete']
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
    permissions: ['read', 'edit']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["edit", "read"] is part of set ["read", "edit", "delete"] then split 100:on', async function () {
  const label = 'permissions part of ["read", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit', 'delete']
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
    permissions: ['edit', 'read']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions [1, "edit"] is part of set ["1", "edit", "delete"] then split 100:on', async function () {
  const label = 'permissions part of ["1", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['1', 'edit', 'delete']
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
    permissions: [1, 'edit']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["admin", "magic"] is part of set ["read", "edit"] then not match', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['admin', 'magic']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if attribute is not an array we should not match part of', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluator should not match

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    permissions: NaN
  });
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if attribute is an EMPTY array we should not match part of', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.permissions ["read", "edit"] is part of set ["read", "edit", "delete"] then split 100:on should not match', async function () {
  const label = 'not permissions part of ["read", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit', 'delete']
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
    permissions: ['read', 'edit']
  });

  expect(evaluation).toBe(undefined); // evaluation should return treatment undefined
});

test('PARSER / NEGATED if user.permissions ["admin", "magic"] is part of set ["read", "edit"] false, then match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['admin', 'magic']
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is not an array we should not match part of, so match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    countries: () => { }
  });
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is an EMPTY array we should not match part of, so match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'PART_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

//
// CONTAINS_ANY_OF_SET
//
test('PARSER / if user.permissions ["admin", "edit"] contains any of set ["read", "edit", "delete"] then split 100:on', async function () {
  const label = 'permissions part of ["read", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit', 'delete']
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
    permissions: ['admin', 'edit']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["admin", 1] contains any of set ["read", "1", "delete"] then split 100:on', async function () {
  const label = 'permissions part of ["read", "1", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', '1', 'delete']
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
    permissions: ['admin', 1]
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / if user.permissions ["admin", "magic"] contains any of set ["read", "edit"] then not match', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['admin', 'magic']
  });

  expect(typeof evaluator).toBe('function'); // evaluator should be callable
  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / if attribute is not an array we should not match contains any', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('a key'), 31, 100, 31);
  expect(evaluation).toBe(undefined); // evaluator should not match

  evaluation = await evaluator(keyParser('a key'), 31, 100, 31, {
    permissions: null
  });
  expect(evaluation).toBe(undefined); // evaluator should not match
});

test('PARSER / if attribute is an EMPTY array we should not match contains any', async function () {
  const label = 'permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: false,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.permissions ["admin", "edit"] contains any of set ["read", "edit", "delete"] then split 100:on should not match', async function () {
  const label = 'not permissions part of ["read", "edit", "delete"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit', 'delete']
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
    permissions: ['admin', 'edit']
  });

  expect(evaluation).toBe(undefined); // evaluator should return undefined
});

test('PARSER / NEGATED if user.permissions ["admin", "magic"] contains any of set ["read", "edit"] false, then should match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: ['admin', 'magic']
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is not an array we should not match contains any, then should match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: label
  }] as ISplitCondition[]);

  const evaluation = await evaluator(keyParser('a key'), 31, 100, 31);

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});

test('PARSER / NEGATED if attribute is an EMPTY array we should not match contains any, then should match', async function () {
  const label = 'not permissions part of ["read", "edit"]';
  const evaluator = parser(noopLogger, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'permissions'
        },
        matcherType: 'CONTAINS_ANY_OF_SET',
        negate: true,
        userDefinedSegmentMatcherData: null,
        unaryStringMatcherData: null,
        whitelistMatcherData: {
          whitelist: ['read', 'edit']
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
    permissions: []
  });

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe(label); // evaluator should return correct label
});
