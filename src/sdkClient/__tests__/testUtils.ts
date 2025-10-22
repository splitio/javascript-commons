const clientApiMethods = ['getTreatment', 'getTreatments', 'getTreatmentWithConfig', 'getTreatmentsWithConfig', 'getTreatmentsByFlagSets', 'getTreatmentsWithConfigByFlagSets', 'getTreatmentsByFlagSet', 'getTreatmentsWithConfigByFlagSet', 'track', 'destroy'];

export function assertClientApi(client: any, sdkStatus?: object) {

  if (sdkStatus) expect(Object.getPrototypeOf(client)).toBe(sdkStatus);

  clientApiMethods.forEach(method => {
    expect(typeof client[method]).toBe('function');
  });
}

export function createClientMock(returnValue: any) {

  return {
    getTreatment: jest.fn(()=> returnValue),
    getTreatmentWithConfig: jest.fn(()=> returnValue),
    getTreatments: jest.fn(()=> returnValue),
    getTreatmentsWithConfig: jest.fn(()=> returnValue),
    getTreatmentsByFlagSets: jest.fn(()=> returnValue),
    getTreatmentsWithConfigByFlagSets: jest.fn(()=> returnValue),
    getTreatmentsByFlagSet: jest.fn(()=> returnValue),
    getTreatmentsWithConfigByFlagSet: jest.fn(()=> returnValue),
    track: jest.fn(()=> returnValue),
  };
}
