//@ts-nocheck
function identityFunction(data: any): any {
  return data;
}

function asyncFunction(data: any): Promise<any> {
  return Promise.resolve(data);
}

const IDENTITY_METHODS: string[] = [];
const ASYNC_METHODS = ['rpush', 'hincrby'];
const PIPELINE_METHODS = ['rpush', 'hincrby'];

export class RedisMock {

  private pipelineMethods: any = { exec: jest.fn(asyncFunction) }

  constructor() {
    IDENTITY_METHODS.forEach(method => {
      this[method] = jest.fn(identityFunction);
    });
    ASYNC_METHODS.forEach(method => {
      this[method] = jest.fn(asyncFunction);
    });
    PIPELINE_METHODS.forEach(method => {
      this.pipelineMethods[method] = this[method];
    });

    this.pipeline = jest.fn(() => {return this.pipelineMethods;});
  }


}
