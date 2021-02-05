const clientApiMethods = ['getTreatment', 'getTreatments', 'getTreatmentWithConfig', 'getTreatmentsWithConfig', 'track', 'destroy'];

export function assertClientApi(client: any, sdkStatus?: object) {

  if (sdkStatus) expect(Object.getPrototypeOf(client)).toBe(sdkStatus);

  clientApiMethods.forEach(method => {
    expect(typeof client[method]).toBe('function');
  });
}
