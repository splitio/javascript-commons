export function modelMock(fieldsObject: UniversalAnalytics.FieldsObject) {
  return {
    get(fieldName: string) {
      return fieldsObject[fieldName as keyof UniversalAnalytics.FieldsObject];
    },
    set(fieldNameOrObject: string | {}, fieldValue?: any) {
      if (typeof fieldNameOrObject === 'object')
        fieldsObject = { ...fieldsObject, ...fieldNameOrObject };
      else
        fieldsObject[fieldNameOrObject as keyof UniversalAnalytics.FieldsObject] = fieldValue;
    }
  };
}

export function gaMock() {

  const __originalSendHitTask = jest.fn();
  const __tasks: Record<string, any> = {
    sendHitTask: __originalSendHitTask
  };
  const ga = jest.fn(function (command) { // @ts-ignore
    (ga.q = ga.q || []).push(arguments);

    if (command === 'send') {
      const fieldsObject = arguments[1];
      __tasks.sendHitTask(modelMock(fieldsObject));
    }
  });

  const set = jest.fn(function (taskName, taskFunc) {
    __tasks[taskName] = taskFunc;
  });
  const get = jest.fn(function (taskName) {
    return __tasks[taskName];
  });

  // Add ga to window object
  if (typeof window === 'undefined') { // @ts-expect-error
    if (global) global.window = {};
  } // @ts-expect-error
  // eslint-disable-next-line no-undef
  window['GoogleAnalyticsObject'] = 'ga';
  // eslint-disable-next-line no-undef
  window['ga'] = window['ga'] || ga;

  return {
    ga,
    tracker: {
      get,
      set,
      __originalSendHitTask,
    }
  };
}

export function gaRemove() {
  if (typeof window !== 'undefined') // @ts-expect-error
    // eslint-disable-next-line no-undef
    window[window['GoogleAnalyticsObject'] || 'ga'] = undefined;
}
