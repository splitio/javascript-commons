//@ts-nocheck
function identityFunction(data: any): any {
  return data;
}

function asyncFunction(data: any): Promise<any> {
  return Promise.resolve(data);
}

const IDENTITY_METHODS: string[] = [];
const ASYNC_METHODS = ['rpush', 'hincrby', 'pipelineExec'];

export class RedisMock {

  constructor() {
    IDENTITY_METHODS.forEach(method => {
      this[method] = jest.fn(identityFunction);
    });
    ASYNC_METHODS.forEach(method => {
      this[method] = jest.fn(asyncFunction);
    });
  }
}
