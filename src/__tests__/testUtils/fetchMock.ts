// http://www.wheresrhys.co.uk/fetch-mock/#usageinstallation
import fetchMockLib from 'fetch-mock';

const fetchMock = fetchMockLib.sandbox();

// config the fetch mock to chain routes (appends the new route to the list of routes)
fetchMock.config.overwriteRoutes = false;

export default fetchMock;
