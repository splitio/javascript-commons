const rpush = jest.fn((data) => {return data;});
const exec = jest.fn(() => {return Promise.resolve({});});
const hincrby = jest.fn((data) => {return data;});

export const redisMock = {
  pipeline: jest.fn(() => { 
    return {
      rpush,
      exec,
      hincrby
    };
  }),
  exec: jest.fn()
};
